"use client";

import { useState } from "react";

import { PlusIcon, SendIcon } from "@/components/icons";

const SUGGESTIONS = [
  "Am I overstriding?",
  "What does my trunk lean tell me?",
  "Which metric should I work on first?",
  "Is my arm swing efficient?",
];

/**
 * "AI coach" chat card beside the player. UI shell only: sending is not
 * connected yet (see `ask`). Fills the height of its grid cell and scrolls
 * its own thread, so it never changes the player's size.
 */
export default function AiAnalysePanel({ videoId, filename }: { videoId: string; filename: string }) {
  const [input, setInput] = useState("");

  // TODO: wire to the RAG chatbot. Send { videoId, question } so the backend
  // can ground the answer in this video's stored `result` + the knowledge base.
  function ask(question: string) {
    void videoId;
    void question;
  }

  return (
    <div className="flex h-[520px] min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_8px_24px_rgba(0,0,0,0.2)] lg:relative lg:h-auto">
      <div className="flex h-full min-h-0 flex-col lg:absolute lg:inset-0">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3.5">
          <div className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[10px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-[15px] text-white">✦</div>
          <div className="min-w-0">
            <b className="block text-sm font-semibold">AI coach</b>
            <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-text-muted">
              <i className="h-1.5 w-1.5 shrink-0 rounded-full bg-positive" />
              Reads {filename}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setInput("")}
            aria-label="New chat"
            title="New chat"
            className="ml-auto grid h-[30px] w-[30px] place-items-center rounded-lg border border-border text-text-muted hover:text-text"
          >
            <PlusIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-4 py-3.5">
          <div className="rounded-[4px_14px_14px_14px] border border-border bg-surface-hover p-3 text-[12.5px] leading-[1.55] text-text-soft">
            Ask about your form. Answers will use this video&apos;s measurements and running-form guidance.
          </div>
          <div className="rounded-lg border border-blue/20 bg-blue/5 px-2.5 py-2 text-[11.5px] text-blue">
            ⓘ The chatbot isn&apos;t connected yet.
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 px-4 pb-2.5">
          {SUGGESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setInput(q)}
              className="rounded-full border border-border-strong bg-violet/5 px-2.5 py-1.5 text-left text-[11.5px] text-text-soft hover:text-text"
            >
              {q}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = input.trim();
            if (q) ask(q);
          }}
          className="mx-4 mb-4 flex items-center gap-2 rounded-xl border border-border-strong bg-bg py-1.5 pl-3.5 pr-1.5"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your form…"
            className="min-w-0 flex-1 bg-transparent text-[13px] text-text outline-none placeholder:text-text-muted"
          />
          <button
            type="submit"
            disabled
            aria-label="Send"
            className="grid h-[34px] w-[34px] shrink-0 place-items-center rounded-[9px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-white disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
