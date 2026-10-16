"use client";

import { useEffect, useRef, useState } from "react";

import type { VideoAnalysis } from "@/components/video-analysis/types";
import VideoWorkspace from "@/components/video-analysis/VideoWorkspace";
import { PencilIcon, RefreshIcon, TrashIcon, UploadIcon, VideoIcon } from "@/components/icons";

const STATUS_LABEL: Record<string, string> = {
  pending: "Not analysed",
  processing: "Analysing…",
  completed: "Analysed",
  failed: "Failed",
};
const STATUS_PILL: Record<string, string> = {
  pending: "bg-surface-hover text-text-muted",
  processing: "bg-amber/15 text-amber",
  completed: "bg-positive/10 text-positive",
  failed: "bg-negative/15 text-negative",
};
const STATUS_TEXT: Record<string, string> = {
  pending: "text-text-muted",
  processing: "text-amber",
  completed: "text-positive",
  failed: "text-negative",
};

function formatFileSize(bytes: number | null): string {
  if (bytes == null) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-text-muted",
  processing: "bg-stat-time animate-pulse",
  completed: "bg-positive",
  failed: "bg-negative",
};

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short" });

/**
 * Upload side-view running videos and get form feedback. Same layout as
 * /coach: a left list of uploaded videos (like conversations) and a main
 * panel for the selected one. Analysis runs as a background task, so we
 * poll while any video is "processing".
 */
export default function VideoAnalysisPage() {
  const [videos, setVideos] = useState<VideoAnalysis[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  function load() {
    fetch("/api/video-analysis")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VideoAnalysis[] | null) => {
        setVideos(data);
        // First load: open the newest video (the API returns newest first).
        setActiveId((cur) => cur ?? data?.[0]?.id ?? null);
      })
      .catch(() => setVideos(null));
  }

  useEffect(load, []);

  const video = videos?.find((v) => v.id === activeId) ?? null;
  const anyProcessing = videos?.some((v) => v.status === "processing") ?? false;

  // Poll while the backend is analyzing; stops once nothing is processing.
  useEffect(() => {
    if (!anyProcessing) return;
    const timer = setInterval(load, 2000);
    return () => clearInterval(timer);
  }, [anyProcessing]);

  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (file) void uploadFile(file);
  }

  async function uploadFile(file: File) {

    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/video-analysis", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      const created: VideoAnalysis = await res.json();
      setActiveId(created.id); // jump to the new upload
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function handleAnalyze(id: string) {
    setAnalyzingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/video-analysis/${id}/analyze`, { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setAnalyzingId(null);
    }
  }

  function startRename(v: VideoAnalysis, e: React.MouseEvent) {
    e.stopPropagation();
    setRenamingId(v.id);
    setRenameValue(v.original_filename);
  }

  async function commitRename() {
    const id = renamingId;
    const name = renameValue.trim();
    setRenamingId(null);
    const current = videos?.find((v) => v.id === id);
    if (!id || !name || name === current?.original_filename) return; // empty or unchanged: just cancel
    try {
      const res = await fetch(`/api/video-analysis/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated: VideoAnalysis = await res.json();
      setVideos((prev) => prev?.map((v) => (v.id === id ? updated : v)) ?? prev);
    } catch (err) {
      setError(`Failed to rename: ${(err as Error).message}`);
    }
  }

  async function handleDelete(id: string, e?: React.MouseEvent) {
    e?.stopPropagation(); // don't also select the row
    try {
      const res = await fetch(`/api/video-analysis/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      if (activeId === id) setActiveId(null);
      setVideos((prev) => prev?.filter((v) => v.id !== id) ?? prev);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const busy = video != null && (analyzingId === video.id || video.status === "processing");
  const result = video?.result;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
      <aside className="lg:-mt-1">
        <h2 className="mb-3.5 flex justify-between text-[13px] font-semibold uppercase tracking-[0.06em] text-text-soft">
          Videos <span className="font-medium text-text-muted">{videos?.length ?? ""}</span>
        </h2>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void uploadFile(file);
          }}
          className={
            "w-full rounded-[14px] border-[1.5px] border-dashed p-4 text-center disabled:cursor-not-allowed disabled:opacity-60 " +
            (dragging ? "border-violet bg-violet/15" : "border-border-strong bg-violet/5 hover:bg-violet/10")
          }
        >
          <div className="mx-auto mb-2.5 grid h-[38px] w-[38px] place-items-center rounded-[11px] bg-violet/15 text-[#c9b6ff]">
            <UploadIcon className="h-5 w-5" />
          </div>
          <b className="block text-[13.5px] font-semibold">{uploading ? "Uploading..." : "Upload a running video"}</b>
          <p className="mt-1.5 text-[11.5px] leading-normal text-text-muted">
            Drag &amp; drop or click · MP4, MOV
            <br />
            Side view, 10 s or longer
          </p>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          onChange={handleFileSelected}
          className="hidden"
        />

        <div className="mt-5 flex flex-col gap-2">
          {videos?.map((v) => {
            const active = v.id === activeId;
            return (
              <div
                key={v.id}
                className={
                  "group flex items-center gap-1 rounded-xl border p-2 " +
                  (active ? "border-violet/45 bg-surface-hover" : "border-transparent hover:bg-surface")
                }
              >
                {renamingId === v.id ? (
                  <input
                    autoFocus
                    value={renameValue}
                    maxLength={100}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRename();
                      if (e.key === "Escape") setRenamingId(null);
                    }}
                    className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveId(v.id)}
                      onDoubleClick={(e) => startRename(v, e)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
                    >
                      <div className="grid h-11 w-[72px] shrink-0 place-items-center rounded-lg bg-[linear-gradient(135deg,#2a2650,#1c1b36)] text-text-muted">
                        <VideoIcon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <b className="block truncate text-[13px] font-semibold">{v.original_filename}</b>
                        <span className="mt-0.5 block text-[11px] text-text-muted">
                          {fmtShort(v.uploaded_at)}
                          {v.file_size_bytes != null ? ` · ${formatFileSize(v.file_size_bytes)}` : ""}
                        </span>
                        <span className={"mt-1 inline-flex items-center gap-1.5 text-[10.5px] font-semibold " + STATUS_TEXT[v.status]}>
                          <i className={"h-1.5 w-1.5 rounded-full " + STATUS_DOT[v.status]} />
                          {STATUS_LABEL[v.status]}
                        </span>
                      </div>
                    </button>
                    <div className="flex shrink-0 flex-col opacity-0 group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={(e) => startRename(v, e)}
                        aria-label="Rename video"
                        title="Rename video"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-text"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(v.id, e)}
                        aria-label="Delete video"
                        title="Delete video"
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-text-muted hover:bg-surface hover:text-negative"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
          {videos && videos.length === 0 && <p className="px-2 py-1 text-sm text-text-muted">No videos yet.</p>}
        </div>

        <div className="mt-[22px] rounded-xl border border-border bg-surface p-3.5 text-xs leading-relaxed text-text-soft">
          <b className="mb-1.5 block text-[12.5px] text-text">📹 For the best analysis</b>
          <ul className="ml-4 list-disc text-text-muted">
            <li>Film from the side, at hip height</li>
            <li>Capture 10+ seconds (4+ strides)</li>
            <li>60 fps if your phone supports it</li>
          </ul>
        </div>
      </aside>

      <main className="min-w-0">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">Video analysis</div>
            <h1 className="mt-1 flex items-center gap-3 text-[26px] font-semibold tracking-tight">
              <span className="truncate">{video ? video.original_filename : "Video Analysis"}</span>
              {video && (
                <span className={"shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-normal " + STATUS_PILL[video.status]}>
                  {video.status === "completed" ? "Analysis complete" : STATUS_LABEL[video.status]}
                </span>
              )}
            </h1>
            <div className="mt-1.5 text-[13px] text-text-soft">
              {video
                ? [
                    new Date(video.uploaded_at).toLocaleString(undefined, {
                      weekday: "short",
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }),
                    result ? `facing ${result.facing}, near side ${result.near_side}` : null,
                    result ? `${result.strides_analyzed} complete stride${result.strides_analyzed === 1 ? "" : "s"}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "Upload side-view running videos and pick one to see feedback on your form."}
            </div>
          </div>
          {video && (
            <div className="flex gap-2.5">
              {/* Compare / Export report: designed in the draft, no backend yet. */}
              <button type="button" disabled title="Coming soon" className="flex h-[38px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-soft opacity-50">
                Compare
              </button>
              <button
                type="button"
                onClick={() => handleAnalyze(video.id)}
                disabled={busy}
                className="flex h-[38px] items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-[13px] font-medium text-text-soft hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshIcon className={"h-[15px] w-[15px]" + (busy ? " animate-spin" : "")} />
                {busy ? "Analysing..." : video.status === "completed" ? "Re-analyse" : "Analyse"}
              </button>
              <button type="button" disabled title="Coming soon" className="flex h-[38px] items-center gap-2 rounded-[10px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] px-3.5 text-[13px] font-semibold text-white opacity-50">
                Export report
              </button>
            </div>
          )}
        </div>

        {error && <p className="mb-4 text-sm text-negative">{error}</p>}

        {!video ? (
          <div className="flex items-start gap-3 rounded-2xl border border-border bg-surface p-5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stat-time">
              <VideoIcon className="h-5 w-5 text-white" />
            </div>
            <div className="text-sm text-text-muted">
              <p className="text-text">
                {videos == null ? "Loading..." : videos.length === 0 ? "Upload a video to get started." : "Select a video on the left."}
              </p>
              <p className="mt-1 text-text">Film from the side, not the front or back.</p>
              <p className="mt-1">
                A clean side-on view is what form analysis needs to read things like trunk lean, knee drive, and
                overstride. A few steady seconds at a consistent distance from the camera works best.
              </p>
            </div>
          </div>
        ) : (
          <>
            {video.status === "pending" && <p className="mb-4 text-sm text-text-muted">Not analysed yet -- press Analyse to start.</p>}
            {video.status === "processing" && <p className="mb-4 text-sm text-text-muted">Analysing -- this usually takes a few seconds.</p>}
            {video.status === "failed" && video.error && <p className="mb-4 text-sm text-negative">{video.error}</p>}
            <VideoWorkspace video={video} />
          </>
        )}
      </main>
    </div>
  );
}
