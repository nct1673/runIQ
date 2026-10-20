"use client";

import { Fragment, useState, type ReactNode } from "react";

import { ChevronDownIcon } from "@/components/icons";

/** Assistant message body + evidence card for the /coach page
 * (design: runIQ_draft/coach_design.html). Renders the small markdown
 * subset the coach emits (headings, bold, lists, tables, [n] cites) as
 * React nodes -- no HTML injection. */

export interface Evidence {
  tool: string;
  arguments: Record<string, unknown>;
  result: unknown;
}

// ---------------------------------------------------------------- markdown

const CITE_CLASS =
  "ml-[3px] inline-grid h-[18px] min-w-[18px] place-items-center rounded-[5px] bg-violet/20 px-[5px] align-[2px] text-[10.5px] font-bold text-[#c9b6ff]";

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*|\[\d+\])/g).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return (
        <b key={key} className="font-semibold text-text">
          {part.slice(2, -2)}
        </b>
      );
    }
    if (/^\[\d+\]$/.test(part)) {
      return (
        <span key={key} className={CITE_CLASS}>
          {part.slice(1, -1)}
        </span>
      );
    }
    return <Fragment key={key}>{part}</Fragment>;
  });
}

const isTableRow = (l: string) => l.trim().startsWith("|") && l.trim().endsWith("|");
const isTableSep = (l: string) => /^\s*\|?[\s:-]+(\|[\s:-]+)+\|?\s*$/.test(l);
const splitRow = (l: string) =>
  l
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());

function Markdown({ text }: { text: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const key = `b${i}`;

    if (!line.trim()) {
      i++;
      continue;
    }

    const heading = line.match(/^#{1,4}\s+(.*)$/);
    if (heading) {
      blocks.push(
        <h3 key={key} className="mb-2.5 mt-[18px] text-[15px] font-semibold text-text first:mt-0">
          {inline(heading[1], key)}
        </h3>,
      );
      i++;
      continue;
    }

    if (isTableRow(line) && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && isTableRow(lines[i])) rows.push(splitRow(lines[i++]));
      blocks.push(
        <div key={key} className="mb-2 overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr>
                {head.map((h, c) => (
                  <th
                    key={c}
                    className="border-b border-border bg-surface-hover px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted"
                  >
                    {inline(h, `${key}h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri} className="border-t border-border first:border-t-0">
                  {r.map((cell, c) => (
                    <td key={c} className="px-3.5 py-3 align-top leading-[1.5] text-text-soft">
                      {inline(cell, `${key}r${ri}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }

    if (/^\s*([-*]|\d+\.)\s+/.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && /^\s*([-*]|\d+\.)\s+/.test(lines[i])) {
        items.push(lines[i++].replace(/^\s*([-*]|\d+\.)\s+/, ""));
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={key} className={"mb-3 ml-[18px] " + (ordered ? "list-decimal" : "list-disc")}>
          {items.map((it, li) => (
            <li key={li} className="mb-1.5">
              {inline(it, `${key}l${li}`)}
            </li>
          ))}
        </List>,
      );
      continue;
    }

    // paragraph: consecutive plain lines
    const para: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^#{1,4}\s+/.test(lines[i]) &&
      !/^\s*([-*]|\d+\.)\s+/.test(lines[i]) &&
      !isTableRow(lines[i])
    ) {
      para.push(lines[i++]);
    }
    blocks.push(
      <p key={key} className="mb-3">
        {inline(para.join(" "), key)}
      </p>,
    );
  }

  return <>{blocks}</>;
}

// ---------------------------------------------------------------- evidence

interface EvidenceItem {
  icon: string;
  tint: string;
  title: string;
  detail: string;
}

const clip = (s: string, n = 140) => (s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s);

function humanize(tool: string): string {
  const s = tool.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function flattenEvidence(evidence: Evidence[]): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  for (const ev of evidence) {
    if (ev.tool === "retrieve_knowledge" && Array.isArray(ev.result)) {
      for (const hit of ev.result as { source_file?: string; chunk_text?: string }[]) {
        items.push({
          icon: "📘",
          tint: "rgba(255,185,56,.12)",
          title: `Coaching guide · ${hit.source_file ?? "knowledge base"}`,
          detail: clip(hit.chunk_text ?? ""),
        });
      }
      continue;
    }
    const args = Object.keys(ev.arguments).length ? ` (${JSON.stringify(ev.arguments)})` : "";
    items.push({
      icon: "📊",
      tint: "rgba(56,214,255,.12)",
      title: humanize(ev.tool) + args,
      detail: clip(JSON.stringify(ev.result)),
    });
  }
  return items;
}

function EvidenceCard({ evidence }: { evidence: Evidence[] }) {
  const [open, setOpen] = useState(false);
  const items = flattenEvidence(evidence);
  if (items.length === 0) return null;

  return (
    <div className="mt-1 rounded-xl border border-border bg-surface-hover/50">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3.5 py-2.5 text-[12.5px] font-semibold text-text-soft"
      >
        <span>
          Evidence · {items.length} source{items.length === 1 ? "" : "s"}
        </span>
        <span className="flex items-center gap-1 font-normal text-text-muted">
          {open ? "Hide" : "Show"}
          <ChevronDownIcon className={"h-3.5 w-3.5 transition-transform " + (open ? "rotate-180" : "")} />
        </span>
      </button>
      {open &&
        items.map((it, i) => (
          <div
            key={i}
            className="grid grid-cols-[22px_30px_1fr] items-center gap-2.5 border-t border-border px-3.5 py-2.5 text-[12.5px]"
          >
            <span className="grid h-5 w-5 place-items-center rounded-md bg-violet/20 text-[10.5px] font-bold text-[#c9b6ff]">
              {i + 1}
            </span>
            <span
              className="grid h-[30px] w-[30px] place-items-center rounded-lg text-sm"
              style={{ background: it.tint }}
            >
              {it.icon}
            </span>
            <div className="min-w-0">
              <b className="block break-words text-[13px] font-semibold text-text">{it.title}</b>
              <span className="break-words text-text-muted">{it.detail}</span>
            </div>
          </div>
        ))}
    </div>
  );
}

// ----------------------------------------------------------------- message

export function AssistantMessage({ content, evidence }: { content: string; evidence: Evidence[] | null }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable (insecure context) -- nothing to do */
    }
  }

  return (
    <div className="grid grid-cols-[34px_1fr] gap-3.5">
      <div className="grid h-[34px] w-[34px] place-items-center rounded-[10px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] text-[15px]">
        ✦
      </div>
      <div className="min-w-0 text-sm leading-[1.65] text-text-soft">
        <Markdown text={content} />
        {evidence && evidence.length > 0 && <EvidenceCard evidence={evidence} />}
        <div className="mt-3 flex items-center gap-1.5">
          <button
            type="button"
            onClick={copy}
            className="rounded-lg border border-border px-2.5 py-1 text-xs text-text-muted hover:text-text"
          >
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
}
