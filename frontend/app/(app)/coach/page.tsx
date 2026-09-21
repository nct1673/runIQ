"use client";

import { useEffect, useRef, useState } from "react";

import Header from "@/components/Header";
import { PlusIcon, SendIcon } from "@/components/icons";

/** Blueprint §29-33: AI Running Coach chat interface. */

interface Conversation {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

interface Evidence {
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
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

  return (
    <div>
      <Header title="AI Coach" subtitle="Ask a question about your training -- answers come with evidence." />

      <div className="flex h-[calc(100vh-9rem)] gap-4">
        <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3">
          <button
            type="button"
            onClick={handleNewConversation}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover"
          >
            <PlusIcon className="h-4 w-4" />
            New chat
          </button>
          <div className="flex flex-col gap-1">
            {conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => selectConversation(c.id)}
                className={
                  "truncate rounded-xl px-3 py-2 text-left text-sm " +
                  (c.id === activeId
                    ? "bg-brand text-white"
                    : "text-text-muted hover:bg-surface-hover hover:text-text")
                }
              >
                {c.title || "New conversation"}
              </button>
            ))}
            {conversations.length === 0 && (
              <p className="px-3 py-2 text-sm text-text-muted">No conversations yet.</p>
            )}
          </div>
        </aside>

        <div className="flex flex-1 flex-col rounded-2xl border border-border bg-surface">
          <div className="flex-1 overflow-y-auto p-5">
            {messages.length === 0 && (
              <p className="text-sm text-text-muted">
                Ask about your training -- e.g. &quot;How many km did I run this week?&quot;
              </p>
            )}
            <div className="flex flex-col gap-4">
              {messages.map((m) => (
                <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[75%] rounded-2xl px-4 py-2.5 text-sm " +
                      (m.role === "user" ? "bg-brand text-white" : "bg-bg text-text")
                    }
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.evidence && m.evidence.length > 0 && (
                      <details className="mt-2 text-xs text-text-muted">
                        <summary className="cursor-pointer">Evidence</summary>
                        <ul className="mt-1 flex flex-col gap-1">
                          {m.evidence.map((ev, i) => (
                            <li key={i}>
                              <span className="font-medium">{ev.tool}</span>
                              {Object.keys(ev.arguments).length > 0 &&
                                ` (${JSON.stringify(ev.arguments)})`}
                              : {JSON.stringify(ev.result)}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {sending && <p className="text-sm text-text-muted">Thinking...</p>}
            </div>
            <div ref={bottomRef} />
          </div>

          {error && <p className="px-5 pb-2 text-sm text-negative">{error}</p>}

          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your coach..."
              disabled={sending}
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SendIcon className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
