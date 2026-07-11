"""Session history storage. Bundled SQLite file — no external DB service required."""
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

import aiosqlite

SESSIONS_DB_PATH = Path(__file__).parent / "demo_dbs" / "sessions.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    question TEXT,
    db_id TEXT,
    sql TEXT,
    result TEXT,
    error TEXT,
    trace TEXT,
    iterations INTEGER,
    success INTEGER,
    created_at TEXT
)
"""


async def init_sessions_db() -> None:
    async with aiosqlite.connect(SESSIONS_DB_PATH) as db:
        await db.execute(_SCHEMA)
        await db.commit()


async def upsert_session(doc: Dict[str, Any]) -> None:
    async with aiosqlite.connect(SESSIONS_DB_PATH) as db:
        await db.execute(
            """INSERT INTO sessions (id, question, db_id, sql, result, error, trace, iterations, success, created_at)
               VALUES (?,?,?,?,?,?,?,?,?,?)
               ON CONFLICT(id) DO UPDATE SET
                 question=excluded.question, db_id=excluded.db_id, sql=excluded.sql,
                 result=excluded.result, error=excluded.error, trace=excluded.trace,
                 iterations=excluded.iterations, success=excluded.success, created_at=excluded.created_at""",
            (
                doc["id"], doc["question"], doc["db_id"], doc.get("sql"),
                json.dumps(doc.get("result")), doc.get("error"), json.dumps(doc.get("trace")),
                doc.get("iterations", 1), int(bool(doc.get("success"))), doc["created_at"],
            ),
        )
        await db.commit()


async def list_sessions(limit: int = 50) -> List[Dict[str, Any]]:
    async with aiosqlite.connect(SESSIONS_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT id, question, db_id, sql, iterations, success, created_at "
            "FROM sessions ORDER BY created_at DESC LIMIT ?",
            (limit,),
        )
        rows = await cursor.fetchall()
        return [{**dict(r), "success": bool(r["success"])} for r in rows]


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    async with aiosqlite.connect(SESSIONS_DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = await cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["result"] = json.loads(d["result"]) if d["result"] else None
        d["trace"] = json.loads(d["trace"]) if d["trace"] else []
        d["success"] = bool(d["success"])
        return d


async def delete_session(session_id: str) -> None:
    async with aiosqlite.connect(SESSIONS_DB_PATH) as db:
        await db.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        await db.commit()
