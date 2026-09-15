"""Routes a user question to the right tool(s) before calling the LLM
(blueprint SS30, SS32):

- Structured question ("how many km last month?")       -> sql_tool
- Analytical question ("am I faster than 6mo ago?")      -> analytics services
- Knowledge question ("why does heat affect pace?")       -> rag_tool
- Mixed ("why was today's run slower?")                   -> sql + analytics + rag

This is the key architectural principle from blueprint SS32: not every
question should hit vector search.
"""
from app.services.coach import llm_client, rag_tool, sql_tool  # noqa: F401


def answer(question: str, user_id) -> dict:
    raise NotImplementedError(
        "Phase 6: intent-detect `question`, gather evidence via sql_tool/"
        "rag_tool, call llm_client, return {answer, evidence}"
    )
