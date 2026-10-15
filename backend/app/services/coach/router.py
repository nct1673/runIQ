"""Routes a user's message to the right tool(s), then asks the LLM to
produce an evidence-based answer (blueprint SS30, SS33).

Ollama's own tool-calling IS the "intent detection" from blueprint SS30/32
-- the model decides which tool(s) (if any) it needs, rather than a
separate hand-rolled classifier deciding upfront. Not every question
hits a tool at all (e.g. "hello").

Per docs/rag_coach_plan.md SS1: `user_id` is resolved once by the caller
(from the authenticated session) and bound into every SQL tool function
via functools.partial *before* the tool schema is built -- it is never a
parameter the model can see or set.
"""
from __future__ import annotations

import functools
import json
import uuid

from sqlalchemy.orm import Session

from app.models.conversation_message import ConversationMessage
from app.services.coach import llm_client, query_tool, rag_tool, sql_tool

SYSTEM_PROMPT = """You are RunIQ's AI running coach. You help the user understand their \
own training by comparing it to their own historical baseline -- never population \
averages or professional athletes ("You vs. Yourself").

Rules:
- Only state things you can support with a tool result. If a tool returns no data \
or you don't have enough information, say so plainly rather than guessing.
- When you use a tool result, refer to the specific numbers it returned.
- For "how should I...", "why does...", "what is..." or any training-advice question, \
FIRST call retrieve_knowledge, and base general advice only on what it returns. Cite the \
source file in parentheses, e.g. (tapering_and_racing.md). If nothing relevant comes back, \
say you have no source for that rather than answering from memory.
- For anything about the user's races, personal records, weather, form analysis or profile, \
call run_readonly_query (coach.races, coach.personal_records, ...) rather than assuming. \
Questions like "my upcoming race" or "my taper" need the race date and distance from there.
- Combine them when useful: personal numbers from the data tools, general guidance from the \
knowledge base, and make clear which is which.
- Never do arithmetic or percentage comparisons in your head. Only state a difference or \
percentage if a tool returned it, or compute it in SQL; otherwise quote the raw numbers. \
Check direction: a higher pace in s/km is SLOWER, a lower one is faster.
- Weather/training-load relationships are estimates, not medical or \
causal claims -- describe them as "associated with" or "the model estimates", \
never "caused by".
- Never ask permission to use a tool you have -- just use it.
- Keep answers concise and directly useful to a runner, not a data dump."""

TOOL_SCHEMAS = [
    {
        "type": "function",
        "function": {
            "name": "get_recent_summary",
            "description": "Get the user's own activity totals/averages over a recent window "
            "(e.g. 'my last 7 days').",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "How many days back to look."}
                },
                "required": ["days"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_baseline",
            "description": "Get the user's personal baseline (typical pace, HR, cadence) based "
            "on all their historical runs.",
            "parameters": {"type": "object", "properties": {}},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compare_periods",
            "description": "Compare the user's recent training to an earlier period "
            "(e.g. 'am I faster than 6 months ago?').",
            "parameters": {
                "type": "object",
                "properties": {
                    "period_a_days": {
                        "type": "integer",
                        "description": "Length of the recent period, in days.",
                    },
                    "period_b_days": {
                        "type": "integer",
                        "description": "Length of the earlier comparison period immediately "
                        "before it, in days.",
                    },
                },
                "required": ["period_a_days", "period_b_days"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_similar_runs",
            "description": "Find the user's other historical runs similar in distance/type to "
            "one specific activity, if you already know its activity_id.",
            "parameters": {
                "type": "object",
                "properties": {
                    "activity_id": {"type": "string", "description": "UUID of the reference activity."}
                },
                "required": ["activity_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "retrieve_knowledge",
            "description": "Search the running-science knowledge base. Call this FIRST for any "
            "general or advice question (tapering, pacing, heat, recovery, injuries, form "
            "metrics, training plans, fuelling), alongside the user's own data tools. "
            "Returns cited passages (source_file, chunk_text).",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "A focused search query for the knowledge base."}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "run_readonly_query",
            "description": "Run a read-only SQL query on the user's own data when the other "
            "tools can't answer (e.g. a specific race, personal records, a custom filter). "
            "Prefer the other tools when they fit. " + query_tool.SCHEMA_HELP,
            "parameters": {
                "type": "object",
                "properties": {"sql": {"type": "string", "description": "One SELECT statement."}},
                "required": ["sql"],
            },
        },
    },
]

MAX_TOOL_ROUNDS = 2


def _build_tool_dispatch(db: Session, user_id: uuid.UUID) -> dict:
    """Bind db/user_id into each tool function before it's ever callable
    by the LLM -- see module docstring."""
    return {
        "get_recent_summary": functools.partial(sql_tool.get_recent_summary, db, user_id),
        "get_baseline": functools.partial(sql_tool.get_baseline, db, user_id),
        "compare_periods": functools.partial(sql_tool.compare_periods, db, user_id),
        "get_similar_runs": functools.partial(sql_tool.get_similar_runs, db, user_id),
        "retrieve_knowledge": lambda query, k=5: rag_tool.retrieve(db, query, k),
        "run_readonly_query": functools.partial(query_tool.run_readonly_query, user_id),
    }


def _load_history(db: Session, conversation_id: uuid.UUID, limit: int = 20) -> list[dict]:
    messages = (
        db.query(ConversationMessage)
        .filter(ConversationMessage.conversation_id == conversation_id)
        .order_by(ConversationMessage.created_at.asc())
        .limit(limit)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in messages]


def answer(db: Session, user_id: uuid.UUID, conversation_id: uuid.UUID, content: str) -> dict:
    """Answer one user message within `conversation_id` (the caller must
    have already verified it belongs to `user_id`). Persists both the
    user's message and the assistant's reply; returns {answer, evidence}.
    """
    history = _load_history(db, conversation_id)
    dispatch = _build_tool_dispatch(db, user_id)

    messages: list[dict] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *history,
        {"role": "user", "content": content},
    ]

    evidence: list[dict] = []
    reply = llm_client.complete(messages, tools=TOOL_SCHEMAS)

    for _ in range(MAX_TOOL_ROUNDS):
        tool_calls = reply.get("tool_calls") or []
        if not tool_calls:
            break

        messages.append(
            {"role": "assistant", "content": reply.get("content", ""), "tool_calls": tool_calls}
        )
        for call in tool_calls:
            name = call["function"]["name"]
            args = call["function"].get("arguments") or {}
            fn = dispatch.get(name)
            if fn is None:
                result = {"error": f"unknown tool '{name}'"}
            else:
                try:
                    result = fn(**args)
                except TypeError:  # model passed missing/unexpected arguments
                    result = {"error": f"invalid arguments for tool '{name}'"}
            evidence.append({"tool": name, "arguments": args, "result": result})
            messages.append({"role": "tool", "content": json.dumps(result)})

        reply = llm_client.complete(messages, tools=TOOL_SCHEMAS)

    final_text = (reply.get("content") or "").strip() or "I wasn't able to generate an answer."

    db.add(ConversationMessage(conversation_id=conversation_id, role="user", content=content))
    db.add(
        ConversationMessage(
            conversation_id=conversation_id,
            role="assistant",
            content=final_text,
            evidence=json.dumps(evidence) if evidence else None,
        )
    )
    db.commit()

    return {"answer": final_text, "evidence": evidence}
