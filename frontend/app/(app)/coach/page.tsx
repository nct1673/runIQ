"use client";

import { useEffect, useRef, useState } from "react";

import { AssistantMessage, type Evidence } from "@/components/coach/CoachMessage";
import { PlusIcon, SearchIcon, SendIcon, TrashIcon } from "@/components/icons";

/** Blueprint §29-33: AI Running Coach chat interface.
 * Layout follows runIQ_draft/coach_design.html. */

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

const SUGGESTIONS = [
  "How many km did I run this week?",
  "How should I taper for my upcoming race?",
  "How long was my last run?",
];

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Today / This week (last 7 days) / Earlier, newest first within a group. */
function groupConversations(list: Conversation[]): { label: string; items: Conversation[] }[] {
  const today = startOfDay(new Date());
  const buckets: Record<string, Conversation[]> = { Today: [], "This week": [], Earlier: [] };
  for (const c of list) {
    const day = startOfDay(new Date(c.updated_at));
    if (day >= today) buckets.Today.push(c);
    else if (day >= today - 6 * DAY_MS) buckets["This week"].push(c);
    else buckets.Earlier.push(c);
  }
  return Object.entries(buckets)
    .filter(([, items]) => items.length > 0)
    .map(([label, items]) => ({ label, items }));
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (startOfDay(d) >= startOfDay(new Date())) {
    return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  evidence: Evidence[] | null;
  created_at: string;
}

export default function CoachPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Conversations state is built from a mix of optimistic inserts (below)
  // and full-list refetches (loadConversations) so the sidebar updates
  // instantly on send/create rather than waiting on the slow LLM call.
  // De-duping by id here is the defensive fix for that mix, regardless
  // of the exact timing that produces a duplicate: React needs every
  // list item's key to be unique no matter how the array was built.
  function dedupeById(list: Conversation[]): Conversation[] {
    const seen = new Set<string>();
    return list.filter((c) => (seen.has(c.id) ? false : (seen.add(c.id), true)));
  }

  function addConversationOptimistically(convo: Conversation) {
    setConversations((prev) => dedupeById([convo, ...prev]));
  }

  function loadConversations() {
    fetch("/api/chat/conversations")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Conversation[]) => setConversations(dedupeById(data)))
      .catch(() => setConversations([]));
  }

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Explicit, not effect-driven: an effect keyed on activeId would also
  // fire (and fetch an empty message list) the moment handleSend calls
  // setActiveId for a freshly-created conversation, racing with -- and
  // clobbering -- the optimistic user-message bubble below while the
  // slow LLM call is still in flight.
  function selectConversation(id: string) {
    setActiveId(id);
    fetch(`/api/chat/conversations/${id}/messages`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Message[]) => setMessages(data))
      .catch(() => setMessages([]));
  }

  async function handleDeleteConversation(id: string, e: React.MouseEvent) {
    e.stopPropagation(); // don't also trigger selectConversation on the row
    try {
      const res = await fetch(`/api/chat/conversations/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    } catch (err) {
      setError(`Failed to delete conversation: ${(err as Error).message}`);
    }
  }

  async function handleNewConversation() {
    const res = await fetch("/api/chat/conversations", { method: "POST" });
    const convo: Conversation = await res.json();
    addConversationOptimistically(convo);
    setActiveId(convo.id);
    setMessages([]);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || sending) return;

    setSending(true);
    setError(null);

    let conversationId = activeId;
    if (!conversationId) {
      const res = await fetch("/api/chat/conversations", { method: "POST" });
      const convo: Conversation = await res.json();
      addConversationOptimistically(convo);
      conversationId = convo.id;
      setActiveId(conversationId);
    }

    const userMessage: Message = {
      id: `pending-${Date.now()}`,
      role: "user",
      content,
      evidence: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(await res.text());
      const assistantMessage: Message = await res.json();
      setMessages((prev) => [...prev, assistantMessage]);
      loadConversations(); // refresh title/updated_at ordering
    } catch (err) {
      setError(`Failed to get a response: ${(err as Error).message}`);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      e.currentTarget.form?.requestSubmit();
    }
  }

  const activeConvo = conversations.find((c) => c.id === activeId);
  const q = search.trim().toLowerCase();
  const groups = groupConversations(
    q ? conversations.filter((c) => (c.title || "New conversation").toLowerCase().includes(q)) : conversations,
  );

  return (
    // Full-bleed: cancel the shell's <main> padding so the history column
    // and chat run edge to edge, as in the design.
    <div className="-m-6 grid h-screen grid-cols-[264px_1fr] lg:-m-8">
      <aside className="flex min-h-0 flex-col gap-3.5 overflow-y-auto border-r border-border bg-surface/35 px-4 py-6">
        <button
          type="button"
          onClick={handleNewConversation}
          className="flex h-10 items-center justify-center gap-2 rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-[13.5px] font-semibold text-white"
        >
          <PlusIcon className="h-4 w-4" />
          New chat
        </button>

        <label className="flex h-9 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[12.5px] text-text-muted focus-within:border-border-strong">
          <SearchIcon className="h-3.5 w-3.5 shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
          />
        </label>

        {groups.map((g) => (
          <div key={g.label} className="flex flex-col gap-0.5">
            <div className="mx-1 mb-0.5 mt-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
              {g.label}
            </div>
            {g.items.map((c) => {
              const on = c.id === activeId;
              return (
                <div
                  key={c.id}
                  className={
                    "group flex items-center rounded-[10px] " +
                    (on
                      ? "bg-surface-hover shadow-[inset_0_0_0_1px_rgba(162,123,255,0.45)]"
                      : "hover:bg-surface-hover/60")
                  }
                >
                  <button
                    type="button"
                    onClick={() => selectConversation(c.id)}
                    className="flex min-w-0 flex-1 flex-col gap-[3px] px-2.5 py-[9px] text-left"
                  >
                    <span className={"truncate text-[13px] " + (on ? "font-semibold text-text" : "text-text-soft")}>
                      {c.title || "New conversation"}
                    </span>
                    <span className="truncate text-[11.5px] text-text-muted">{formatWhen(c.updated_at)}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleDeleteConversation(c.id, e)}
                    aria-label="Delete conversation"
                    title="Delete conversation"
                    className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-text-muted opacity-0 hover:bg-surface hover:text-negative group-hover:opacity-100"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
        {conversations.length === 0 && <p className="px-1 text-[13px] text-text-muted">No conversations yet.</p>}
        {conversations.length > 0 && groups.length === 0 && (
          <p className="px-1 text-[13px] text-text-muted">No chats match your search.</p>
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-col overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg px-10 py-5">
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-text">{activeConvo?.title || "AI Coach"}</h1>
            <div className="mt-[3px] flex items-center gap-2 text-[12.5px] text-text-muted">
              <i className="h-1.5 w-1.5 rounded-full bg-positive" />
              Answers use your runs, races and coaching guides, with evidence
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div className="mx-auto flex w-full max-w-[880px] flex-col gap-[26px] px-10 pb-2.5 pt-7">
            {messages.length === 0 && !sending && (
              <div className="flex flex-col gap-4 pt-6">
                <p className="text-sm text-text-muted">Ask about your training, a run, or your race. Try:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setInput(s)}
                      className="rounded-full border border-border-strong bg-violet/5 px-3 py-[7px] text-[12.5px] text-text-soft hover:bg-violet/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="max-w-[70%] self-end whitespace-pre-wrap rounded-2xl rounded-br-sm bg-[linear-gradient(135deg,#7a5cff,#a27bff)] px-[15px] py-[11px] text-sm leading-[1.5] text-white"
                >
                  {m.content}
                </div>
              ) : (
                <AssistantMessage key={m.id} content={m.content} evidence={m.evidence} />
              ),
            )}

            {sending && (
              <div className="grid grid-cols-[34px_1fr] gap-3.5">
                <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-[15px]">
                  ✦
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-text-muted" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <form onSubmit={handleSend} className="sticky bottom-0 z-10 w-full bg-bg pb-[26px] pt-3">
          <div className="mx-auto w-full max-w-[880px] px-10">
            {error && <p className="mb-2 text-sm text-negative">{error}</p>}
            <div className="rounded-2xl border border-border-strong bg-surface py-3 pl-4 pr-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)]">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask your coach about your training, a run, or your race…"
                rows={2}
                disabled={sending}
                className="block w-full resize-none bg-transparent pb-3.5 pt-1 text-sm text-text outline-none placeholder:text-text-muted"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-text-muted">Enter to send · Shift + Enter for a new line</span>
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send"
                  className="ml-auto grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-white disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <SendIcon className="h-[17px] w-[17px]" />
                </button>
              </div>
            </div>
            <div className="mt-2.5 text-center text-[11.5px] text-text-muted">
              Coach suggestions are guidance, not medical advice. Check sources in Evidence.
            </div>
          </div>
        </form>
      </section>
    </div>
  );
}
