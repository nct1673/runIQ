"""Ollama LLM client -- local/GPU-hosted, per project decision, not a
cloud API. Kept as a thin abstraction (complete/embed) so the rest of
app.services.coach isn't coupled to Ollama's specific request shape.
"""
from __future__ import annotations

from typing import Any

import httpx

from app.core.config import get_settings


def complete(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """One non-streaming turn against Ollama's /api/chat. Returns the
    raw `message` dict (has `content`, and `tool_calls` when the model
    decides to call one).
    """
    settings = get_settings()
    payload: dict[str, Any] = {
        "model": settings.ollama_chat_model,
        "messages": messages,
        "stream": False,
    }
    if tools:
        payload["tools"] = tools

    resp = httpx.post(f"{settings.ollama_base_url}/api/chat", json=payload, timeout=120.0)
    resp.raise_for_status()
    return resp.json()["message"]


def embed(text: str) -> list[float]:
    """Embed `text` via Ollama's /api/embeddings using OLLAMA_EMBED_MODEL
    (nomic-embed-text -> 768 dims, matches knowledge_chunks.embedding)."""
    settings = get_settings()
    resp = httpx.post(
        f"{settings.ollama_base_url}/api/embeddings",
        json={"model": settings.ollama_embed_model, "prompt": text},
        timeout=60.0,
    )
    resp.raise_for_status()
    return resp.json()["embedding"]
