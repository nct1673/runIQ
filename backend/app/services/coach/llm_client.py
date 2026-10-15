"""LLM client for the AI Coach. Chat goes to Ollama (local/GPU-hosted) or
Google Gemini (via LangChain), chosen by LLM_PROVIDER. Kept as a thin
abstraction (complete/embed) so the rest of app.services.coach isn't
coupled to either provider's request shape: `complete` always takes and
returns Ollama-style dicts, and the Gemini branch translates.

Embeddings always use Ollama (nomic-embed-text, 768 dims, matches
knowledge_chunks.embedding) regardless of provider.
"""
from __future__ import annotations

import uuid
from typing import Any

import httpx

from app.core.config import get_settings


def complete(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """One non-streaming chat turn. Returns a `message` dict with `content`,
    and `tool_calls` (Ollama shape: [{"function": {"name", "arguments"}}])
    when the model decides to call one.
    """
    if get_settings().llm_provider == "gemini":
        return _complete_gemini(messages, tools)
    return _complete_ollama(messages, tools)


def _complete_ollama(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
) -> dict[str, Any]:
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


def _complete_gemini(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None,
) -> dict[str, Any]:
    # Imported lazily so Ollama-only setups don't need LangChain installed.
    from langchain_google_genai import ChatGoogleGenerativeAI

    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("LLM_PROVIDER=gemini but GEMINI_API_KEY is not set")

    model = ChatGoogleGenerativeAI(
        model=settings.gemini_chat_model,
        api_key=settings.gemini_api_key,
        timeout=120,
    )
    if tools:
        model = model.bind_tools(tools)  # accepts the OpenAI-style tool dicts as-is

    reply = model.invoke(_to_langchain_messages(messages))

    result: dict[str, Any] = {"role": "assistant", "content": _message_text(reply)}
    if reply.tool_calls:
        result["tool_calls"] = [
            {"function": {"name": tc["name"], "arguments": tc["args"]}}
            for tc in reply.tool_calls
        ]
    return result


def _to_langchain_messages(messages: list[dict[str, Any]]) -> list:
    """Ollama-style dicts -> LangChain messages. Ollama tool results carry
    no call id, but Gemini (via LangChain) pairs a result with its call by
    id, so ids are minted here: each assistant message's tool calls get
    fresh ids, and the tool messages that follow consume them in order.
    """
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

    out: list = []
    pending: list[tuple[str, str]] = []  # (call id, tool name) awaiting a result
    for m in messages:
        role, content = m["role"], m.get("content") or ""
        if role == "system":
            out.append(SystemMessage(content=content))
        elif role == "user":
            out.append(HumanMessage(content=content))
        elif role == "assistant":
            calls = []
            for tc in m.get("tool_calls") or []:
                call_id = uuid.uuid4().hex
                name = tc["function"]["name"]
                calls.append(
                    {"name": name, "args": tc["function"].get("arguments") or {}, "id": call_id}
                )
                pending.append((call_id, name))
            out.append(AIMessage(content=content, tool_calls=calls))
        elif role == "tool":
            call_id, name = pending.pop(0)
            out.append(ToolMessage(content=content, tool_call_id=call_id, name=name))
    return out


def _message_text(reply: Any) -> str:
    """Plain text of an AIMessage, whether `content` is a str or a list of
    content blocks."""
    content = reply.content
    if isinstance(content, str):
        return content
    return "".join(
        block if isinstance(block, str) else block.get("text", "")
        for block in content
        if isinstance(block, str) or block.get("type") == "text"
    )


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
