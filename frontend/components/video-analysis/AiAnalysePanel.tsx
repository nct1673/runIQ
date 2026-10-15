"use client";

import { useState } from "react";

import { CloseIcon, SendIcon, SparklesIcon } from "@/components/icons";

const SUGGESTIONS = [
  "Am I overstriding?",
  "What does my trunk lean tell me?",
  "Which metric should I work on first?",
  "Is my arm swing efficient?",
];

/**
 * Dock for the running-form chatbot ("AI Analyse") about the selected video.
 * It's a sibling of the data area with its own scroll, so it never moves or
 * resizes the charts -- only the available width changes. UI shell only:
 * sending is not connected yet (see `ask`).
 */
export default function AiAnalysePanel({
  videoId,
  filename,
  onClose,
}: {
  videoId: string;
  filename: string;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");

  // TODO: wire to the RAG chatbot. Send { videoId, question } so the backend
  // can ground the answer in this video's stored `result` + the knowledge base.
  function ask(question: string) {
    void videoId;
    void question;
  }

  return (
    <aside
      className={
        "z-40 flex flex-col border-border bg-surface " +
        // small screens: overlay drawer; large: docked column beside the data
        "fixed inset-y-0 right-0 w-full max-w-sm border-l shadow-2xl " +
        "lg:static lg:z-auto lg:w-80 lg:max-w-none lg:shrink-0 lg:shadow-none"
      }
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-text">
          <SparklesIcon className="h-4 w-4 text-brand" />
          AI Analyse
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close AI Analyse"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-text-muted hover:bg-surface-hover hover:text-text"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-3 rounded-xl border border-border bg-bg px-3 py-2 text-xs text-text-muted">
          Asking about <span className="text-text">{filename}</span>
        </div>
        <p className="text-sm text-text-muted">
          Ask about your form -- answers will use this video&apos;s measurements and running-form guidance.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-xl border border-border px-3 py-2 text-left text-xs text-text-muted hover:bg-surface-hover hover:text-text"
            >
              {q}
            </button>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-text-muted">The chatbot isn&apos;t connected yet.</p>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const q = input.trim();
          if (!q) return;
          ask(q);
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about this video..."
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-white disabled:opacity-50"
        >
          <SendIcon className="h-4 w-4" />
        </button>
      </form>
    </aside>
  );
}
