# PRD — Multi-Agent Text-to-SQL Intelligence System

## Problem Statement
Multi-Agent Text-to-SQL Intelligence System | Python, LangGraph, LangChain, Mistral-7B, LoRA, HuggingFace, Amazon RDS, Streamlit.
- LangGraph multi-agent workflows with ReAct reasoning, hierarchical delegation, self-reflection, persistent state for autonomous multi-step query resolution.
- Fine-tuned Mistral-7B via LoRA on Spider and SynSQL for schema-aware Text-to-SQL across complex legacy schemas.
- Granular conversation-level tracing across agent decision nodes (+35% accuracy on tool-selection failures).

## Architecture
- **Backend** (FastAPI, Python): Multi-agent orchestrator simulating LangGraph state graph
  - `SchemaInspectorAgent` → identifies relevant tables/columns (ReAct reasoning)
  - `SQLWriterAgent` → generates dialect-aware SQL via Claude Sonnet 4.5
  - `ValidatorAgent` → safety + syntactic validation (sqlparse, forbidden-stmt block)
  - `ExecutorAgent` → runs SQL on target DB via SQLAlchemy
  - `ReflectorAgent` → quality check + self-reflection retry loop (max 2 retries)
  - Full per-session trace persisted in MongoDB
- **LLM**: Claude Sonnet 4.5 via Emergent Universal LLM Key (anthropic/claude-sonnet-4-5-20250929)
- **Databases**: Demo SQLite (Chinook music store + HR/Projects) seeded at startup; custom Postgres/MySQL/SQLite connections supported
- **Frontend** (React): 3-pane Swiss high-contrast IDE layout — Schema sidebar / Chat+Trace center / Tabs (SQL/Table/Chart) right; IBM Plex Sans/Mono; Recharts visualizations

## User Personas
- Data analysts querying production DBs in natural language
- Engineers debugging complex legacy schemas
- ML/agent developers studying multi-agent orchestration

## Implemented (Feb 2026)
- Backend (`/app/backend`):
  - `db_manager.py` — demo DB seeding, schema introspection, connection registry
  - `agents.py` — 5-agent pipeline with reflection loop
  - `server.py` — REST API: /api/databases, /api/schema/{id}, /api/query, /api/sessions, /api/databases/connect
- Frontend (`/app/frontend/src`):
  - `pages/Workbench.jsx` — main 3-pane workbench
  - `components/SchemaSidebar.jsx`, `AgentTrace.jsx`, `ResultPanel.jsx`, `ConnectDBDialog.jsx`
  - SQL syntax highlighter, chart panel (bar/line/pie), CSV export
- 18/18 backend tests pass

## Backlog (P1/P2)
- P1: WebSocket streaming of trace events live (currently bundled in response)
- P1: Save query as named view, share session via URL
- P2: LoRA-style few-shot example library editable per database
- P2: Multi-tenancy + auth + per-user LLM quota
- P2: Query EXPLAIN plan visualization
- P2: Schema diff detection when DB changes

## Key Files
- /app/backend/server.py, agents.py, db_manager.py
- /app/frontend/src/pages/Workbench.jsx
- /app/frontend/src/components/{SchemaSidebar,AgentTrace,ResultPanel,ConnectDBDialog}.jsx
- /app/frontend/src/lib/{api,agents,sqlHighlight}.js
