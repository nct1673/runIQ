# Knowledge base

Source content for the AI Coach's RAG retrieval (`app/services/coach/rag_tool.py`).
This is general running-science/training knowledge (e.g. "how does heat
affect running performance?") — **not** personal data. Personal data
(your own runs, baseline, training load) comes from `sql_tool.py`
instead; the two are routed separately by `router.py`.

## Format

One topic per `.md` file, plain markdown. Headings are used as natural
chunk boundaries by `backend/scripts/ingest_knowledge.py` — write each
file as a few self-contained sections (a heading + a few paragraphs)
rather than one giant wall of text, so each retrieved chunk is coherent
on its own.

## Adding content

1. Add/edit `.md` files in this folder.
2. Run `python scripts/ingest_knowledge.py` from `backend/` (with the
   `runiq` conda env active) to (re-)embed everything here into
   `knowledge_chunks`. Safe to re-run — it replaces a file's existing
   chunks before re-inserting, so editing a file and re-running doesn't
   leave stale chunks behind.

This folder is intentionally empty otherwise — content is yours to write.
