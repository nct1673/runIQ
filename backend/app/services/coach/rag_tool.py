"""Knowledge-question tool: retrieves relevant passages from the curated
knowledge base (backend/knowledge/, embedded via
scripts/ingest_knowledge.py) via pgvector similarity search, for the LLM
to ground its answer in. Not user-scoped -- this is shared reference
knowledge, not personal data (see app/models/knowledge_chunk.py).
"""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.models.knowledge_chunk import KnowledgeChunk
from app.services.coach import llm_client


def retrieve(db: Session, question: str, k: int = 5) -> list[dict]:
    """Embed `question` and return the top-k most similar knowledge
    chunks as citable evidence: [{source_file, chunk_text, score}, ...].
    `score` is cosine distance -- lower is more similar.
    """
    query_embedding = llm_client.embed(question)

    distance = KnowledgeChunk.embedding.cosine_distance(query_embedding)
    rows = (
        db.query(KnowledgeChunk, distance.label("distance"))
        .order_by(distance)
        .limit(k)
        .all()
    )

    return [
        {"source_file": chunk.source_file, "chunk_text": chunk.chunk_text, "score": float(dist)}
        for chunk, dist in rows
    ]
