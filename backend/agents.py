"""Multi-agent LangGraph-style orchestrator for Text-to-SQL.

Pipeline: SchemaInspector -> SQLWriter -> Validator -> Executor -> Reflector
Reflector can route back to SQLWriter (max 2 retries) for self-reflection.
"""
import re
import json
import sqlparse
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Callable

from db_manager import get_schema, schema_to_prompt, execute_sql
from llm_client import llm_call as _llm_call


def _extract_sql(text: str) -> str:
    """Extract SQL from a markdown code fence or raw text."""
    m = re.search(r"```(?:sql)?\s*(.+?)```", text, re.DOTALL | re.IGNORECASE)
    if m:
        return m.group(1).strip().rstrip(";")
    # otherwise return as-is, stripping common prefixes
    return text.strip().rstrip(";")


def _extract_json(text: str) -> Optional[dict]:
    m = re.search(r"```(?:json)?\s*(\{.+?\})\s*```", text, re.DOTALL)
    if m:
        try:
            return json.loads(m.group(1))
        except Exception:
            pass
    m2 = re.search(r"\{[^{}]*\}", text, re.DOTALL)
    if m2:
        try:
            return json.loads(m2.group(0))
        except Exception:
            return None
    return None


class TraceCollector:
    def __init__(self):
        self.events: List[Dict[str, Any]] = []

    def add(self, agent: str, status: str, message: str, data: Optional[dict] = None):
        self.events.append({
            "id": str(uuid.uuid4()),
            "agent": agent,
            "status": status,  # running | success | error | warning
            "message": message,
            "data": data or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        })


# ============= AGENTS =============

async def schema_inspector(state: Dict[str, Any], trace: TraceCollector) -> Dict[str, Any]:
    """Identify relevant tables/columns for the user question."""
    trace.add("schema_inspector", "running", "Analyzing schema and identifying relevant tables...")
    schema_text = schema_to_prompt(state["schema"])
    system = (
        "You are a Schema Inspector agent in a multi-agent Text-to-SQL system. "
        "Given a database schema and a user question, identify which tables and columns are most relevant. "
        "Reason step-by-step (ReAct style). Respond with a JSON object: "
        '{"relevant_tables": [..], "reasoning": "...", "join_hints": "..."}'
    )
    user = f"SCHEMA:\n{schema_text}\n\nUSER QUESTION: {state['question']}\n\nIdentify relevant tables and explain joins needed."
    try:
        resp = await _llm_call(system, user, state["session_id"] + "-inspector")
        parsed = _extract_json(resp) or {"relevant_tables": [], "reasoning": resp, "join_hints": ""}
        state["inspection"] = parsed
        trace.add("schema_inspector", "success",
                  f"Identified {len(parsed.get('relevant_tables', []))} relevant tables",
                  {"tables": parsed.get("relevant_tables", []), "reasoning": parsed.get("reasoning", "")[:500]})
    except Exception as e:
        state["inspection"] = {"relevant_tables": [], "reasoning": f"error: {e}"}
        trace.add("schema_inspector", "warning", f"Inspection failed, proceeding with full schema: {e}")
    return state


async def sql_writer(state: Dict[str, Any], trace: TraceCollector) -> Dict[str, Any]:
    """Generate SQL using LLM."""
    iteration = state.get("iteration", 0)
    msg = "Generating SQL..." if iteration == 0 else f"Re-generating SQL (attempt {iteration+1}) based on reflection..."
    trace.add("sql_writer", "running", msg)
    schema_text = schema_to_prompt(state["schema"])
    inspection = state.get("inspection", {})
    reflection = state.get("reflection", {})
    dialect = state["schema"]["type"]
    system = (
        f"You are an expert SQL Writer agent. Generate a single {dialect.upper()} SELECT query that answers the user's question. "
        "Rules: (1) Only output a SQL code block, nothing else. (2) Use proper JOINs based on FKs. "
        "(3) Use LIMIT 100 unless aggregating. (4) Never write INSERT/UPDATE/DELETE/DROP. "
        f"(5) Use {dialect}-compatible syntax."
    )
    user_parts = [f"SCHEMA:\n{schema_text}", f"QUESTION: {state['question']}"]
    if inspection.get("relevant_tables"):
        user_parts.append(f"RELEVANT TABLES: {inspection['relevant_tables']}")
    if inspection.get("join_hints"):
        user_parts.append(f"JOIN HINTS: {inspection['join_hints']}")
    if reflection.get("issue"):
        user_parts.append(f"PREVIOUS ATTEMPT FAILED: {reflection['issue']}\nPREVIOUS SQL: {state.get('sql','')}\nFIX the issue.")
    user = "\n\n".join(user_parts)
    try:
        resp = await _llm_call(system, user, state["session_id"] + f"-writer-{iteration}")
        sql = _extract_sql(resp)
        state["sql"] = sql
        trace.add("sql_writer", "success", "SQL generated", {"sql": sql})
    except Exception as e:
        state["error"] = f"SQL Writer failed: {e}"
        trace.add("sql_writer", "error", str(e))
    return state


async def validator(state: Dict[str, Any], trace: TraceCollector) -> Dict[str, Any]:
    """Validate SQL syntax and safety."""
    trace.add("validator", "running", "Validating SQL syntax and safety...")
    sql = state.get("sql", "")
    issues = []
    if not sql:
        issues.append("No SQL generated")
    # Safety check
    lowered = sql.lower()
    forbidden = ["insert ", "update ", "delete ", "drop ", "alter ", "truncate ", "create "]
    for f in forbidden:
        if f in lowered:
            issues.append(f"Forbidden statement detected: {f.strip()}")
    # Parse check
    try:
        parsed = sqlparse.parse(sql)
        if not parsed or not parsed[0].tokens:
            issues.append("SQL could not be parsed")
    except Exception as e:
        issues.append(f"Parse error: {e}")
    if issues:
        state["validation"] = {"ok": False, "issues": issues}
        trace.add("validator", "error", "Validation failed", {"issues": issues})
    else:
        state["validation"] = {"ok": True, "issues": []}
        trace.add("validator", "success", "SQL passed validation", {"checks": ["syntax", "safety", "structure"]})
    return state


async def executor(state: Dict[str, Any], trace: TraceCollector) -> Dict[str, Any]:
    """Execute SQL against the database."""
    trace.add("executor", "running", "Executing SQL against database...")
    sql = state["sql"]
    try:
        result = execute_sql(state["db_id"], sql)
        state["result"] = result
        trace.add("executor", "success", f"Returned {result['row_count']} rows",
                  {"columns": result["columns"], "row_count": result["row_count"]})
    except Exception as e:
        state["exec_error"] = str(e)
        trace.add("executor", "error", f"Execution failed: {e}")
    return state


async def reflector(state: Dict[str, Any], trace: TraceCollector) -> Dict[str, Any]:
    """Reflect on the result. If errored or empty, decide to retry."""
    trace.add("reflector", "running", "Reflecting on result quality...")
    iteration = state.get("iteration", 0)
    max_retries = 2
    exec_error = state.get("exec_error")
    validation = state.get("validation", {})
    result = state.get("result")

    issue = None
    if not validation.get("ok"):
        issue = "Validation failed: " + "; ".join(validation.get("issues", []))
    elif exec_error:
        issue = f"Execution error: {exec_error}"
    elif result and result.get("row_count") == 0:
        # Use LLM to decide if empty result is expected
        issue = None  # accept empty - could be valid

    if issue and iteration < max_retries:
        state["reflection"] = {"issue": issue, "retry": True}
        state["iteration"] = iteration + 1
        # Clear stale state
        state.pop("exec_error", None)
        state.pop("result", None)
        trace.add("reflector", "warning", f"Issue detected: {issue}. Retrying (attempt {iteration+2}/{max_retries+1})",
                  {"issue": issue})
        return state
    if issue:
        state["reflection"] = {"issue": issue, "retry": False}
        trace.add("reflector", "error", f"Max retries reached. Final issue: {issue}")
    else:
        state["reflection"] = {"issue": None, "retry": False}
        trace.add("reflector", "success", "Result quality acceptable. Pipeline complete.",
                  {"iterations": iteration})
    return state


# ============= ORCHESTRATOR =============

async def run_pipeline(question: str, db_id: str, session_id: str) -> Dict[str, Any]:
    """Run the multi-agent pipeline with self-reflection loop."""
    trace = TraceCollector()
    trace.add("orchestrator", "success", f"Starting multi-agent pipeline for query", {"question": question, "db_id": db_id})

    schema = get_schema(db_id)
    state: Dict[str, Any] = {
        "question": question,
        "db_id": db_id,
        "session_id": session_id,
        "schema": schema,
        "iteration": 0,
    }

    # Schema inspection (once)
    state = await schema_inspector(state, trace)

    # Self-reflection loop
    while True:
        state = await sql_writer(state, trace)
        if state.get("error"):
            break
        state = await validator(state, trace)
        if state["validation"]["ok"]:
            state = await executor(state, trace)
        state = await reflector(state, trace)
        if not state["reflection"].get("retry"):
            break

    return {
        "session_id": session_id,
        "question": question,
        "db_id": db_id,
        "sql": state.get("sql"),
        "result": state.get("result"),
        "error": state.get("error") or state.get("exec_error") or (state.get("reflection") or {}).get("issue"),
        "trace": trace.events,
        "iterations": state.get("iteration", 0) + 1,
    }
