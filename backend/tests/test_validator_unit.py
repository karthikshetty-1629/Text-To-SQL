"""Unit tests for validator agent safety logic (no LLM calls)."""
import asyncio
import sys
sys.path.insert(0, "/app/backend")
from agents import validator, TraceCollector


def _run(state):
    trace = TraceCollector()
    asyncio.run(validator(state, trace))
    return state, trace


def test_validator_blocks_insert():
    state = {"sql": "INSERT INTO artists VALUES (99, 'X')"}
    state, _ = _run(state)
    assert state["validation"]["ok"] is False
    assert any("insert" in i.lower() for i in state["validation"]["issues"])


def test_validator_blocks_update():
    state = {"sql": "UPDATE artists SET name='Y' WHERE artist_id=1"}
    state, _ = _run(state)
    assert state["validation"]["ok"] is False


def test_validator_blocks_delete():
    state = {"sql": "DELETE FROM artists WHERE artist_id=1"}
    state, _ = _run(state)
    assert state["validation"]["ok"] is False


def test_validator_blocks_drop():
    state = {"sql": "DROP TABLE artists"}
    state, _ = _run(state)
    assert state["validation"]["ok"] is False


def test_validator_allows_select():
    state = {"sql": "SELECT name FROM artists LIMIT 5"}
    state, _ = _run(state)
    assert state["validation"]["ok"] is True


def test_validator_empty_sql():
    state = {"sql": ""}
    state, _ = _run(state)
    assert state["validation"]["ok"] is False
