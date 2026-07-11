"""LLM client: calls Claude (Anthropic) as primary, OpenAI as fallback.

Replaces Emergent's proxy (emergentintegrations + EMERGENT_LLM_KEY) with direct,
official provider SDKs so calls go straight to Anthropic/OpenAI with your own keys.
"""
import os
from typing import Optional
from anthropic import AsyncAnthropic
from openai import AsyncOpenAI

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
ANTHROPIC_MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-5-20250929")
OPENAI_MODEL = os.environ.get("OPENAI_MODEL", "gpt-4o")
PRIMARY_PROVIDER = os.environ.get("LLM_PROVIDER", "anthropic").lower()
MAX_TOKENS = int(os.environ.get("LLM_MAX_TOKENS", "2048"))

_anthropic_client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
_openai_client = AsyncOpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None


async def _call_anthropic(system_msg: str, user_msg: str) -> str:
    if not _anthropic_client:
        raise RuntimeError("ANTHROPIC_API_KEY not configured")
    resp = await _anthropic_client.messages.create(
        model=ANTHROPIC_MODEL,
        max_tokens=MAX_TOKENS,
        system=system_msg,
        messages=[{"role": "user", "content": user_msg}],
    )
    return resp.content[0].text


async def _call_openai(system_msg: str, user_msg: str) -> str:
    if not _openai_client:
        raise RuntimeError("OPENAI_API_KEY not configured")
    resp = await _openai_client.chat.completions.create(
        model=OPENAI_MODEL,
        max_tokens=MAX_TOKENS,
        messages=[
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_msg},
        ],
    )
    return resp.choices[0].message.content


_PROVIDERS = {"anthropic": _call_anthropic, "openai": _call_openai}


async def llm_call(system_msg: str, user_msg: str, session_id: str = "") -> str:
    """Call the primary provider, falling back to the other configured provider on failure."""
    order = [PRIMARY_PROVIDER] + [p for p in _PROVIDERS if p != PRIMARY_PROVIDER]
    last_err: Optional[Exception] = None
    for provider in order:
        try:
            return await _PROVIDERS[provider](system_msg, user_msg)
        except Exception as e:
            last_err = e
            continue
    raise RuntimeError(f"All LLM providers failed. Last error: {last_err}")
