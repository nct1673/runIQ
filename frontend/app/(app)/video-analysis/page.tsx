"use client";

import { useEffect, useRef, useState } from "react";

import Header from "@/components/Header";
import AiAnalysePanel from "@/components/video-analysis/AiAnalysePanel";
import type { VideoAnalysis } from "@/components/video-analysis/types";
import VideoWorkspace from "@/components/video-analysis/VideoWorkspace";
import { PencilIcon, PlusIcon, RefreshIcon, SparklesIcon, TrashIcon, VideoIcon } from "@/components/icons";

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-surface-hover text-text-muted",
  processing: "bg-stat-time text-white",
  completed: "bg-positive text-white",
  failed: "bg-negative text-white",
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
  const [chatOpen, setChatOpen] = useState(false);
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

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

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

  return (
    <div>
      <Header title="Video Analysis" subtitle="Upload side-view running videos and pick one to see feedback on your form." />

      <div className="flex h-[calc(100vh-9rem)] gap-4">
        <aside className="flex w-56 shrink-0 flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-text hover:bg-surface-hover disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PlusIcon className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload video"}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
            onChange={handleFileSelected}
            className="hidden"
          />
          <div className="flex flex-col gap-1">
            {videos?.map((v) => (
              <div
                key={v.id}
                className={
                  "group flex items-center rounded-xl " +
                  (v.id === activeId ? "bg-brand text-white" : "text-text-muted hover:bg-surface-hover hover:text-text")
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
                    className="m-1 min-w-0 flex-1 rounded-lg border border-border bg-bg px-2 py-1 text-sm text-text outline-none"
                  />
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveId(v.id)}
                      onDoubleClick={(e) => startRename(v, e)}
                      className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm"
                    >
                      <span
                        className={"h-2 w-2 shrink-0 rounded-full " + (v.id === activeId ? "bg-white" : STATUS_DOT[v.status])}
                        title={STATUS_LABEL[v.status]}
                      />
                      <span className="truncate">{v.original_filename}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => startRename(v, e)}
                      aria-label="Rename video"
                      title="Rename video"
                      className={
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 " +
                        (v.id === activeId ? "hover:bg-white/20" : "hover:bg-surface-hover hover:text-text")
                      }
                    >
                      <PencilIcon className="h-3.5 w-3.5" />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={(e) => handleDelete(v.id, e)}
                  aria-label="Delete video"
                  title="Delete video"
                  className={
                    "mr-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 " +
                    (v.id === activeId ? "hover:bg-white/20" : "hover:bg-surface-hover hover:text-negative")
                  }
                >
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
            {videos && videos.length === 0 && <p className="px-3 py-2 text-sm text-text-muted">No videos yet.</p>}
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 overflow-hidden rounded-2xl border border-border bg-surface">
          {/* Main column: fixed header + its own scroll area, so the chat dock never moves the data. */}
          <div className="flex min-w-0 flex-1 flex-col">
            {!video ? (
              <div className="p-5">
                {error && <p className="mb-4 text-sm text-negative">{error}</p>}
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-stat-time">
                    <VideoIcon className="h-5 w-5 text-white" />
                  </div>
                  <div className="text-sm text-text-muted">
                    <p className="text-text">
                      {videos == null
                        ? "Loading..."
                        : videos.length === 0
                          ? "Upload a video to get started."
                          : "Select a video on the left."}
                    </p>
                    <p className="mt-1 text-text">Film from the side, not the front or back.</p>
                    <p className="mt-1">
                      A clean side-on view is what form analysis needs to read things like trunk lean, knee drive,
                      and overstride. A few steady seconds at a consistent distance from the camera works best.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-stat-time">
                      <VideoIcon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-text">{video.original_filename}</div>
                      <div className="text-xs text-text-muted">
                        {new Date(video.uploaded_at).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {video.file_size_bytes != null ? ` · ${formatFileSize(video.file_size_bytes)}` : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={"rounded-full px-3 py-1 text-xs font-medium " + STATUS_COLOR[video.status]}>
                      {STATUS_LABEL[video.status] ?? video.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleAnalyze(video.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-text-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <RefreshIcon className={"h-3.5 w-3.5" + (busy ? " animate-spin" : "")} />
                      {busy ? "Analyzing..." : video.status === "completed" ? "Re-analyze" : "Analyze"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setChatOpen((o) => !o)}
                      aria-pressed={chatOpen}
                      className={
                        "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium " +
                        (chatOpen ? "bg-brand text-white" : "border border-border text-text-muted hover:text-text")
                      }
                    >
                      <SparklesIcon className="h-3.5 w-3.5" />
                      AI Analyse
                    </button>
                  </div>
                </div>

                {/* @container: the workspace lays itself out by THIS width, not the viewport's. */}
                <div className="@container min-h-0 flex-1 overflow-y-auto p-5">
                  {error && <p className="mb-4 text-sm text-negative">{error}</p>}
                  {video.status === "pending" && (
                    <p className="mb-4 text-sm text-text-muted">Not analyzed yet -- press Analyze to start.</p>
                  )}
                  {video.status === "processing" && (
                    <p className="mb-4 text-sm text-text-muted">Analyzing -- this usually takes a few seconds.</p>
                  )}
                  {video.status === "failed" && video.error && (
                    <p className="mb-4 text-sm text-negative">{video.error}</p>
                  )}
                  <VideoWorkspace video={video} />
                </div>
              </>
            )}
          </div>

          {video && chatOpen && (
            <AiAnalysePanel key={video.id} videoId={video.id} filename={video.original_filename} onClose={() => setChatOpen(false)} />
          )}
        </div>
      </div>
    </div>
  );
}
