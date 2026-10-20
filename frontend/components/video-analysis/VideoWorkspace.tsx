"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import AiAnalysePanel from "@/components/video-analysis/AiAnalysePanel";
import CheckFrames from "@/components/video-analysis/CheckFrames";
import PhaseCards from "@/components/video-analysis/PhaseCards";
import StrideTimeline from "@/components/video-analysis/StrideTimeline";
import type { VideoAnalysis } from "@/components/video-analysis/types";
import VideoPlayer from "@/components/video-analysis/VideoPlayer";

interface VideoFrameMeta {
  mediaTime: number;
}
interface VideoWithFrameCallback {
  requestVideoFrameCallback?: (cb: (now: number, meta: VideoFrameMeta) => void) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
}

function SectionTitle({ children, note }: { children: React.ReactNode; note?: string }) {
  return (
    <div className="mb-3.5 mt-7 flex items-center gap-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-text-soft">
      {children}
      <span className="h-px flex-1 bg-border" />
      {note && <em className="order-2 text-[13px] font-medium normal-case not-italic tracking-normal text-text-muted">{note}</em>}
    </div>
  );
}

/**
 * Everything under the page header for one video: player + AI coach, metrics
 * by stride phase, the synced stride timeline and the check frames. This
 * component owns the <video> element and the playhead so the timeline and
 * check frames can seek it (needs `fps` in the result).
 */
export default function VideoWorkspace({ video }: { video: VideoAnalysis }) {
  const result = video.result;
  const fps = result?.fps ?? 0;
  const synced = fps > 0;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentFrame, setCurrentFrame] = useState<number | null>(null);

  // Follow the playhead: per presented frame where supported, else timeupdate/seeked.
  useEffect(() => {
    const el = videoRef.current;
    if (!el || !synced) return;
    const withCb = el as unknown as VideoWithFrameCallback;
    if (withCb.requestVideoFrameCallback) {
      let handle = 0;
      const loop = (_now: number, meta: VideoFrameMeta) => {
        setCurrentFrame(Math.round(meta.mediaTime * fps));
        handle = withCb.requestVideoFrameCallback!(loop);
      };
      handle = withCb.requestVideoFrameCallback(loop);
      return () => withCb.cancelVideoFrameCallback?.(handle);
    }
    const update = () => setCurrentFrame(Math.round(el.currentTime * fps));
    el.addEventListener("timeupdate", update);
    el.addEventListener("seeked", update);
    return () => {
      el.removeEventListener("timeupdate", update);
      el.removeEventListener("seeked", update);
    };
  }, [fps, synced, video.id]);

  const seekToFrame = useCallback(
    (frame: number) => {
      const el = videoRef.current;
      if (!el || !synced) return;
      el.pause(); // seeking is for inspecting a moment
      el.currentTime = (frame + 0.5) / fps; // land inside the frame, not on its edge
      setCurrentFrame(frame);
    },
    [fps, synced],
  );

  const frame = synced ? currentFrame : null;
  const onSeek = synced ? seekToFrame : undefined;

  return (
    <div>
      {result && (
        <>
          {result.warnings.map((w) => (
            <p key={w} className="mb-3 text-xs text-negative">
              {w}
            </p>
          ))}
        </>
      )}

      <section className="grid grid-cols-1 gap-[18px] xl:grid-cols-[minmax(0,1fr)_400px]">
        <VideoPlayer videoId={video.id} videoRef={videoRef} result={result} currentFrame={frame} seekToFrame={seekToFrame} />
        <AiAnalysePanel key={video.id} videoId={video.id} filename={video.original_filename} />
      </section>

      {result && (
        <>
          <SectionTitle note="Strides 1 / 2 · green band = typical range">Metrics by stride phase</SectionTitle>
          <PhaseCards result={result} />

          <SectionTitle note={onSeek ? "Synced with the video · click anywhere to jump" : "Synced with the video"}>Stride timeline</SectionTitle>
          <StrideTimeline result={result} currentFrame={frame} onSeek={onSeek} />

          {result.check_frames.length > 0 && (
            <>
              <SectionTitle note={onSeek ? "Click to open in the player" : undefined}>Check frames</SectionTitle>
              <CheckFrames id={video.id} result={result} currentFrame={frame} onSeek={onSeek} />
            </>
          )}
          <p className="mt-4 text-xs leading-relaxed text-text-muted">
            2D side-view estimates from one video. Best for comparing your own videos over time, not as absolute targets.
          </p>
        </>
      )}
    </div>
  );
}
