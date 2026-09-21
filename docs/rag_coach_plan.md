# RunIQ — AI Running Coach (RAG Chatbot) Plan

**Status: proposed, not yet implemented.** This doc is the deliverable for
"plan the RAG chatbot" — no application code changes yet. Implementation
starts only after this is reviewed and explicitly approved.

## Context

This is blueprint Module 6 (§29–33) — the flagship LLM feature: not a
generic chatbot, but one that combines personal data (SQL), analytics,
and a curated knowledge base (RAG) to answer questions about *your*
running with cited evidence, never fabricated claims.

The scaffolding already exists from Phase 0 (all currently
`NotImplementedError` stubs): `app/services/coach/{router,sql_tool,
rag_tool,llm_client}.py` and `app/api/routes/chat.py`. This plan is
about filling those in, plus two requirements added after the first
draft: **persistent per-user conversation history**, and an **explicit,
architecturally-enforced guarantee that the coach can only ever query
the logged-in user's own data.**

**LLM host: Ollama, not a cloud API** — confirmed via your local setup:
Ollama v0.33.1 already running natively (not Dockerized), RTX 4060 Ti
with 16GB VRAM, four models already pulled. Default chat model:
**`qwen3:14b`** (9.3GB, comfortable VRAM headroom, supports tool-calling —
per your choice over `gpt-oss:20b`/`deepseek-r1:14b`/`qwen3-claude`).

**Dependency check — good news:** `httpx` and `pgvector` are already in
`backend/requirements.txt`, and `docker-compose.yml`'s Postgres image is
already `pgvector/pgvector:pg16`. No new Python dependencies needed for
any of this.

**Known caveat:** `activities` currently has 0 rows — your raw→processed
pipeline isn't finished yet. The SQL/analytics tool built here will query
`activities` correctly, but returns "no data" until that pipeline exists.
Not a blocker to building this now, just means full end-to-end usefulness
arrives once that pipeline lands (your own work, per your existing
ownership of that transformation).

**Scope boundary, explicit:** per your call, **you write the knowledge-base
content** (the markdown docs about running science that get embedded).
I build the ingestion pipeline (chunking, embedding, pgvector storage)
and leave the content folder empty for you. Everything else in this plan
— Ollama integration, conversation storage, the SQL/analytics query
functions, RAG retrieval, tool-calling orchestration, the chat endpoint,
the frontend UI — is infrastructure I'd build directly, same as the
Garmin sync / login / profile features, not pipeline logic you've
reserved for yourself. Flag it now if any of that should also be yours
to write.

## Architecture

```
User (logged in, session -> user_id)
        │
        ▼
POST /api/chat/conversations/{id}/messages   {content: "..."}
        │
        ▼
router.answer(user_id, conversation_id, content, db)
        │  (user_id comes ONLY from the authenticated session --
        │   never from the request body, never from the LLM)
        ▼
Load recent messages in this conversation (multi-turn context)
        │
        ▼
Ollama /api/chat  ──tools schema──▶  [sql_tool functions, rag_tool.retrieve]
        │                                        │
        │  (model decides which tool(s) to call, │  every sql_tool function
        │   if any -- this IS the "intent         │  is pre-bound to THIS
        │   detection" from blueprint §30/32,     │  request's user_id before
        │   done natively via tool-calling         │  the LLM ever sees a
        │   instead of a hand-rolled classifier)   │  tool schema -- user_id
        │◀───────────────────────────────────────┘  is not a tool parameter
        ▼
Final Ollama call with tool results as evidence
        │
        ▼
Evidence-based answer
        │
        ▼
Both messages (user + assistant) saved to `conversation_messages`
        │
        ▼
Returned to frontend
```

This directly matches blueprint §30's diagram (User Question → Intent
Detection → SQL/Analytics + RAG → LLM → Evidence-based Answer) and §32's
principle ("not every question should hit vector search") — Ollama's
tool-calling naturally skips tools the model doesn't need, rather than a
separate rule-based router deciding upfront.

## 1. Conversation storage & per-user data isolation

These two requirements are handled together because the same design
decision underpins both: **`user_id` is resolved exactly once, from the
authenticated session, at the top of the request — and nothing
downstream (the LLM included) can override it.**

**New tables** (replacing the earlier plan's flat `insights` table,
which only logged isolated Q&A pairs with no conversation structure —
`app/models/insight.py` is unused today, safe to retire):

```
conversations
  id            UUID PK
  user_id       FK -> users.id
  title         String, nullable  (derived from the first message)
  created_at
  updated_at

conversation_messages
  id               UUID PK
  conversation_id  FK -> conversations.id
  role             "user" | "assistant"
  content          Text
  evidence         Text, nullable  (JSON; assistant messages only)
  created_at
```

Every query against either table is scoped by `user_id`
(`conversations.user_id`, or a join through `conversation_id` for
messages) — the same pattern every other table in this project already
uses (`activities.user_id`, `activities_raw.user_id`, etc.).

**The actual isolation guarantee, concretely:**

- `router.answer()` takes `user_id` as a plain Python argument, resolved
  by the endpoint from `get_current_user` (the existing session
  dependency) — never read from the request body, a header, or anything
  else a client could set.
- Every `sql_tool` function is written to *require* `user_id` and filter
  every query by it (`WHERE activities.user_id = :user_id`, etc.) —
  the same requirement the plan already had, now stated as a hard rule
  rather than an implicit consequence of being single-user today.
- Critically: **`user_id` is never exposed to Ollama as a tool-call
  parameter.** The tool schema shown to the model only ever includes
  parameters like `days` or `activity_id` — the functions themselves are
  bound to the current request's `user_id` via `functools.partial` (or
  an equivalent closure) *before* being handed to the router's
  tool-calling loop. The model physically cannot ask for another user's
  data because it never has a `user_id` value to put in a tool call in
  the first place — this holds regardless of prompt content, so it's
  not relying on the model "behaving," which matters if this ever
  becomes multi-user later.
- `rag_tool.retrieve()` is unaffected by this (the knowledge base isn't
  per-user data), but conversation history retrieval for multi-turn
  context is scoped by `conversation_id`, which itself is only ever
  looked up scoped by `user_id` first.

## 2. Ollama client (`app/services/coach/llm_client.py`)

- `complete(messages, tools=None)` — POSTs to `{OLLAMA_BASE_URL}/api/chat`
  via `httpx`, non-streaming for MVP (streaming is a clean fast-follow
  once the non-streaming path works — same endpoint, `stream: true`).
- `embed(text) -> list[float]` — POSTs to `{OLLAMA_BASE_URL}/api/embeddings`
  using `OLLAMA_EMBED_MODEL`.
- New config (`app/core/config.py` + `.env`): `ollama_base_url` (default
  `http://localhost:11434` — matches your native install; would become
  `http://host.docker.internal:11434` only if the backend itself later
  moves into Docker Compose), `ollama_chat_model` (default `qwen3:14b`),
  `ollama_embed_model` (default `nomic-embed-text`).
- **Setup step (not code):** `nomic-embed-text` isn't pulled yet —
  needs `ollama pull nomic-embed-text` (~274MB) before RAG retrieval
  works. I'd run this myself during implementation (just a local model
  download) unless you'd rather run it.

## 3. RAG: knowledge storage + retrieval

**New table `knowledge_chunks`** (pgvector-backed):
`id`, `source_file` (which knowledge doc it came from), `chunk_text`,
`embedding` (`Vector(768)` — `nomic-embed-text`'s dimension, via
`pgvector.sqlalchemy.Vector`), `created_at`. Migration also runs
`CREATE EXTENSION IF NOT EXISTS vector` (the image supports it; the
extension itself isn't enabled yet). Not user-scoped — it's shared
reference knowledge, not personal data.

**New `backend/knowledge/` directory** — empty except a short README
describing the expected format (one topic per markdown file). Yours to
fill in.

**New `backend/scripts/ingest_knowledge.py`** — a CLI script (not an API
endpoint; content changes are a maintenance action, not a runtime user
action), run on demand: reads every `.md` in `backend/knowledge/`,
chunks by heading/paragraph (~300–500 tokens, slight overlap), embeds
each chunk via `llm_client.embed`, upserts into `knowledge_chunks`.

**`rag_tool.retrieve(question, k=5)`** — embeds the question, pgvector
cosine-similarity search (`Vector.cosine_distance`) against
`knowledge_chunks`, returns top-k `{source_file, chunk_text, score}` as
citable evidence.

## 4. SQL/analytics tool (`app/services/coach/sql_tool.py`)

Per the blueprint's explicit safety rule (already in the file's
docstring): **no freeform LLM-generated SQL, ever.** Instead, a small
fixed set of named, parameterized functions exposed to Ollama as
tool-call targets — the model picks from these, never writes SQL itself.
Every function below is `user_id`-scoped per §1's isolation design:

- `get_recent_summary(days: int)` — totals/averages over a window
- `get_baseline()` — the user's personal baseline (blueprint §12)
- `compare_periods(period_a_days, period_b_days)` — e.g. "faster than 6mo ago?"
- `get_similar_runs(activity_id)` — wraps the similar-run concept (§13)

Each wraps a plain, safe, parameterized SQLAlchemy query against
`activities` (empty today, per the caveat above — these are still worth
building now since they're correct against the schema regardless).

## 5. Router (`app/services/coach/router.py`)

`answer(user_id, conversation_id, content, db)`:
1. Load recent messages for `conversation_id` (scoped by `user_id`) for
   multi-turn context.
2. Bind `user_id` into each `sql_tool` function via `functools.partial`;
   build the tool schema from those bound functions + `rag_tool.retrieve`
   (no `user_id` parameter reaches the model — see §1).
3. Call `llm_client.complete()` with a system prompt (evidence-only,
   never fabricate, cite what each tool returned) + conversation history
   + the new message + tools.
4. If Ollama requests tool call(s), execute them, feed results back as
   tool-role messages, call again for the final answer (standard 1–2
   round tool-calling loop).
5. Save both the user's message and the assistant's reply (with
   `evidence` JSON) to `conversation_messages`.
6. Return `{answer, evidence}`.

## 6. API endpoints (`app/api/routes/chat.py`)

Replaces the single stateless stub with conversation-aware endpoints,
all behind the existing router-level `get_current_user` dependency:

- `GET /api/chat/conversations` — list the current user's conversations
  (id, title, updated_at), most recent first.
- `POST /api/chat/conversations` — start a new conversation, returns it.
- `GET /api/chat/conversations/{id}/messages` — full message history
  for one conversation (404 if it doesn't belong to the current user).
- `POST /api/chat/conversations/{id}/messages` — send a message, get the
  assistant's reply back (runs the full router flow from §5).

New `app/schemas/chat.py`: `ConversationOut`, `MessageOut`,
`SendMessageRequest {content: str}`.

## 7. Frontend (`frontend/app/(app)/coach/page.tsx`)

Currently an `EmptyPlaceholder` stub. Build a real chat UI: a
conversation list (sidebar or dropdown) + the active conversation's
scrollable message list + input box, calling the §6 endpoints. Render
each assistant message's evidence citations (source + snippet).
Matches the existing `Card`/`Header` dark-theme components.

## Build order

1. `llm_client.py` + config — prove Ollama connectivity with a trivial
   non-tool-calling round trip first.
2. `conversations`/`conversation_messages` tables + migration (retiring
   `insights`) — the storage layer everything else writes into.
3. `knowledge_chunks` table + migration + `ingest_knowledge.py` +
   `rag_tool.retrieve` — testable once you've written at least one
   knowledge doc.
4. `sql_tool.py` functions (user_id-bound per §1) — testable against the
   (currently empty) `activities` table structurally, even before it
   has data.
5. `router.py` tool-calling orchestration tying 1–4 together, including
   the `functools.partial` user_id-binding step.
6. `chat.py` endpoints.
7. Frontend chat UI.

## Verification

- Step 1: curl `POST` with a question needing no tools ("hello") —
  confirms Ollama round-trip works before adding complexity.
- Step 2: create a conversation, send a message, confirm both the user
  and assistant messages land in `conversation_messages`.
- Step 3: after you add one knowledge doc + run `ingest_knowledge.py`,
  confirm `knowledge_chunks` has rows and a direct `rag_tool.retrieve()`
  call returns it for a relevant question.
- Step 4: unit-check each `sql_tool` function returns a well-formed
  (empty but not erroring) result against the current empty `activities`.
- Step 4b (isolation check): create a second user directly in the DB
  with their own `activities` row, confirm `get_recent_summary` bound to
  user A's id never returns user B's row — a concrete test, not just a
  read of the code.
- Step 5–6: full question → tool-call → evidence-based answer → check
  `conversation_messages` was written, via curl first, matching how
  every prior feature in this project was verified (real HTTP calls,
  not just reading code).
- Step 7: Playwright click-through of the actual chat UI, same pattern
  as the login/profile verification.
