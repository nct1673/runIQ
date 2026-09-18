"""RAG knowledge base -- chunks of curated running-science markdown docs
(backend/knowledge/), embedded via Ollama (nomic-embed-text, 768 dims)
and retrieved by pgvector cosine similarity. Not user-scoped: this is
shared reference knowledge, not personal data (contrast with
activities/conversations, which are per-user).
"""
import uuid
from datetime import datetime

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import Base

EMBEDDING_DIM = 768  # nomic-embed-text


class KnowledgeChunk(Base):
    __tablename__ = "knowledge_chunks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)

    source_file: Mapped[str] = mapped_column(String)
    chunk_text: Mapped[str] = mapped_column(Text)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIM))

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
