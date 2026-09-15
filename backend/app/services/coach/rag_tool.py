"""Knowledge-question tool: retrieves relevant passages from a small
curated knowledge base (e.g. "how heat affects running performance") via
pgvector similarity search, for the LLM to ground its answer in.
"""


def retrieve(question: str, k: int = 5) -> list[dict]:
    raise NotImplementedError("Phase 6: embed `question`, pgvector similarity search")
