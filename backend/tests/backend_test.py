"""Backend tests for Multi-Agent Text-to-SQL system."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://sql-agent-ai.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 120  # LLM pipeline can take time


# ===== Databases =====
def test_list_databases():
    r = requests.get(f"{API}/databases", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "databases" in data
    ids = [d["id"] for d in data["databases"]]
    assert "chinook" in ids
    assert "hr" in ids


# ===== Schema =====
def test_schema_chinook():
    r = requests.get(f"{API}/schema/chinook", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert data["db_id"] == "chinook"
    table_names = [t["name"] for t in data["tables"]]
    for expected in ["artists", "albums", "tracks", "invoices", "invoice_items", "customers"]:
        assert expected in table_names
    # row counts present
    artists = next(t for t in data["tables"] if t["name"] == "artists")
    assert artists["row_count"] == 8
    # FKs present
    albums = next(t for t in data["tables"] if t["name"] == "albums")
    assert any(fk["to_table"] == "artists" for fk in albums["foreign_keys"])


def test_schema_hr():
    r = requests.get(f"{API}/schema/hr", timeout=30)
    assert r.status_code == 200
    data = r.json()
    table_names = [t["name"] for t in data["tables"]]
    for expected in ["departments", "employees", "projects", "project_assignments"]:
        assert expected in table_names


def test_schema_invalid_db():
    r = requests.get(f"{API}/schema/nonexistent", timeout=30)
    assert r.status_code == 404


# ===== Connect DB (bad URL) =====
def test_connect_bad_url():
    r = requests.post(f"{API}/databases/connect", json={
        "name": "bad", "url": "postgresql://invalid:invalid@127.0.0.1:1/none", "type": "postgres"
    }, timeout=30)
    assert r.status_code == 400


# ===== Query pipeline =====
@pytest.fixture(scope="module")
def chinook_query():
    r = requests.post(f"{API}/query", json={
        "question": "Top 5 artists by total invoice revenue",
        "db_id": "chinook"
    }, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    return r.json()


def test_query_chinook_returns_sql_and_result(chinook_query):
    assert chinook_query.get("sql"), "Missing SQL"
    assert "select" in chinook_query["sql"].lower()
    result = chinook_query.get("result")
    assert result is not None
    assert "columns" in result and "rows" in result
    assert result["row_count"] > 0


def test_query_chinook_trace_has_all_agents(chinook_query):
    trace = chinook_query.get("trace", [])
    agents = {e["agent"] for e in trace}
    for required in ["schema_inspector", "sql_writer", "validator", "executor", "reflector"]:
        assert required in agents, f"Missing agent {required}; got {agents}"


def test_query_chinook_session_id(chinook_query):
    assert chinook_query.get("session_id")


def test_query_hr_groupby():
    r = requests.post(f"{API}/query", json={
        "question": "Average salary by department",
        "db_id": "hr"
    }, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    sql = (data.get("sql") or "").lower()
    assert "group by" in sql
    assert "avg(" in sql
    assert data["result"]["row_count"] >= 1


# ===== Sessions =====
def test_sessions_list_no_id_leak(chinook_query):
    r = requests.get(f"{API}/sessions", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "sessions" in data
    assert len(data["sessions"]) >= 1
    for s in data["sessions"]:
        assert "_id" not in s
        assert "id" in s


def test_sessions_get_single(chinook_query):
    sid = chinook_query["session_id"]
    r = requests.get(f"{API}/sessions/{sid}", timeout=30)
    assert r.status_code == 200
    data = r.json()
    assert "_id" not in data
    assert data["id"] == sid
    assert "trace" in data
    assert len(data["trace"]) > 0


def test_sessions_get_404():
    r = requests.get(f"{API}/sessions/does-not-exist", timeout=30)
    assert r.status_code == 404
