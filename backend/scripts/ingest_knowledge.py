#!/usr/bin/env python
"""Chunk + embed every markdown file in backend/knowledge/ into
`knowledge_chunks` (pgvector). Run on demand from `backend/` whenever
knowledge content changes -- not an API endpoint, since this is a
content-maintenance action, not something a user triggers at runtime.

Usage (from backend/, with the `runiq` conda env active):
    python scripts/ingest_knowledge.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.db import SessionLocal  # noqa: E402
from app.models.knowledge_chunk import KnowledgeChunk  # noqa: E402
from app.services.coach import llm_client  # noqa: E402

KNOWLEDGE_DIR = Path(__file__).resolve().parent.parent / "knowledge"
MAX_CHUNK_CHARS = 1800  # ~300-500 tokens, per the plan


def split_into_chunks(markdown_text: str) -> list[str]:
    """Split on heading boundaries first (natural topic breaks), then
    further split any section still too long by paragraph, grouping
    consecutive paragraphs up to MAX_CHUNK_CHARS.
    """
    sections = re.split(r"\n(?=#{1,6}\s)", markdown_text.strip())

    chunks: list[str] = []
    for section in sections:
        section = section.strip()
        if not section:
            continue
        if len(section) <= MAX_CHUNK_CHARS:
            chunks.append(section)
            continue

        paragraphs = [p.strip() for p in section.split("\n\n") if p.strip()]
        current = ""
        for para in paragraphs:
            if current and len(current) + len(para) + 2 > MAX_CHUNK_CHARS:
                chunks.append(current)
                current = para
            else:
                current = f"{current}\n\n{para}" if current else para
        if current:
            chunks.append(current)

    return chunks


def main() -> None:
    if not KNOWLEDGE_DIR.exists():
        print(f"No knowledge directory at {KNOWLEDGE_DIR}", file=sys.stderr)
        sys.exit(1)

    md_files = sorted(KNOWLEDGE_DIR.glob("*.md"))
    md_files = [f for f in md_files if f.name.lower() != "readme.md"]
    if not md_files:
        print("No knowledge/*.md files found (besides README.md) -- nothing to ingest.")
        return

    db = SessionLocal()
    total_chunks = 0
    try:
        for path in md_files:
            source_file = path.name
            text = path.read_text(encoding="utf-8")
            chunks = split_into_chunks(text)

            # Re-running is idempotent: drop this file's existing chunks first.
            db.query(KnowledgeChunk).filter(KnowledgeChunk.source_file == source_file).delete()

            for chunk_text in chunks:
                embedding = llm_client.embed(chunk_text)
                db.add(
                    KnowledgeChunk(
                        source_file=source_file, chunk_text=chunk_text, embedding=embedding
                    )
                )

            db.commit()
            total_chunks += len(chunks)
            print(f"{source_file}: {len(chunks)} chunk(s)")

        print(f"Done. {total_chunks} chunk(s) across {len(md_files)} file(s).")
    finally:
        db.close()


if __name__ == "__main__":
    main()
