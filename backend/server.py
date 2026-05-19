from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from db_manager import init_demo_dbs, register_demo_dbs, list_databases, get_schema, add_connection
from agents import run_pipeline

# Mongo
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Init demo DBs at import time
init_demo_dbs()
register_demo_dbs()

app = FastAPI(title="Multi-Agent Text-to-SQL")
api_router = APIRouter(prefix="/api")


# ========= MODELS =========

class ConnectDBRequest(BaseModel):
    name: str
    url: str
    type: str  # "postgres" | "mysql" | "sqlite"


class QueryRequest(BaseModel):
    question: str
    db_id: str
    session_id: Optional[str] = None


class SessionSummary(BaseModel):
    id: str
    question: str
    db_id: str
    sql: Optional[str] = None
    success: bool
    iterations: int
    created_at: str


# ========= ROUTES =========

@api_router.get("/")
async def root():
    return {"status": "ok", "service": "multi-agent-text-to-sql"}


@api_router.get("/databases")
async def databases():
    return {"databases": list_databases()}


@api_router.post("/databases/connect")
async def connect_database(req: ConnectDBRequest):
    try:
        info = add_connection(req.name, req.url, req.type)
        return info
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@api_router.get("/schema/{db_id}")
async def schema(db_id: str):
    try:
        return get_schema(db_id)
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@api_router.post("/query")
async def query(req: QueryRequest):
    session_id = req.session_id or str(uuid.uuid4())
    try:
        result = await run_pipeline(req.question, req.db_id, session_id)
    except Exception as e:
        logging.exception("Pipeline failed")
        raise HTTPException(status_code=500, detail=str(e))

    doc = {
        "id": session_id,
        "question": req.question,
        "db_id": req.db_id,
        "sql": result.get("sql"),
        "result": result.get("result"),
        "error": result.get("error"),
        "trace": result.get("trace"),
        "iterations": result.get("iterations", 1),
        "success": not bool(result.get("error")),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.sessions.update_one({"id": session_id}, {"$set": doc}, upsert=True)
    return result


@api_router.get("/sessions")
async def list_sessions(limit: int = 50):
    cursor = db.sessions.find({}, {"_id": 0, "trace": 0, "result": 0}).sort("created_at", -1).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"sessions": items}


@api_router.get("/sessions/{session_id}")
async def get_session(session_id: str):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="session not found")
    return doc


@api_router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    await db.sessions.delete_one({"id": session_id})
    return {"deleted": True}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
