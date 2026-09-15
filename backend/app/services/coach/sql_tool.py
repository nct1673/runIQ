"""Structured-question tool: turns a coach question into a safe, scoped
SQL query (or a call into an existing service) and returns a result the
LLM can cite as evidence. Never lets the LLM write arbitrary SQL directly
against the database.
"""


def query(question: str, user_id) -> dict:
    raise NotImplementedError("Phase 6")
