import { fmtTime, kneeFlexionAt, valueAt } from "@/components/video-analysis/ranges";
import type { AnalysisResult } from "@/components/video-analysis/types";

const KIND = {
  touchdown: { label: "Touchdown", color: "var(--color-brand)" },
  midstance: { label: "Midstance", color: "var(--color-positive)" },
} as Record<string, { label: string; color: string }>;

export default function CheckFrames({
  id,
  result,
  currentFrame,
  onSeek,
}: {
  id: string;
  result: AnalysisResult;
  currentFrame: number | null;
  onSeek?: (frame: number) => void;
}) {
  if (result.check_frames.length === 0) return null;
  const fmt = (v: number | null) => (v == null ? "–" : `${v.toFixed(1)}°`);
  return (
    <section className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      {result.check_frames.map((f) => {
        const kind = KIND[f.kind] ?? { label: f.kind, color: "var(--color-text-muted)" };
        const active = currentFrame === f.frame;
        return (
          <button
            key={f.file}
            type="button"
            onClick={() => onSeek?.(f.frame)}
            disabled={!onSeek}
            title={onSeek ? "Open this frame in the player" : undefined}
            className={
              "overflow-hidden rounded-[14px] border bg-surface text-left " +
              (active ? "border-brand shadow-[0_0_0_1px_var(--color-brand)]" : "border-border enabled:hover:border-border-strong")
            }
          >
            <div className="relative aspect-video overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/video-analysis/${id}/frames/${f.file}`} alt={`${kind.label} at frame ${f.frame}`} className="h-full w-full object-cover object-top" />
              {/* The rendered frame has the pipeline's own text box burned in at the top-left; this label replaces it. */}
              <div className="absolute left-0 top-0 flex h-1/3 w-[36%] items-center gap-1.5 whitespace-nowrap rounded-br-[10px] bg-[#100e22] px-2.5 text-[10.5px] font-semibold">
                <i className="h-[7px] w-[7px] shrink-0 rounded-sm" style={{ background: kind.color }} />
                {kind.label}
              </div>
            </div>
            <div className="px-3.5 py-3">
              <div className="flex justify-between text-[12.5px] font-semibold">
                Frame {f.frame}
                <span className="font-medium text-text-muted">
                  {result.fps > 0 ? fmtTime(f.frame / result.fps) : ""}
                  {active ? " · playing" : ""}
                </span>
              </div>
              <div className="mt-2.5 grid grid-cols-3 gap-1.5 text-[10.5px] text-text-muted">
                <div>Knee<b className="mt-0.5 block text-sm font-semibold text-text">{fmt(kneeFlexionAt(result, f.frame))}</b></div>
                <div>Trunk<b className="mt-0.5 block text-sm font-semibold text-text">{fmt(valueAt(result, "trunk_lean", "value", f.frame))}</b></div>
                <div>Arm<b className="mt-0.5 block text-sm font-semibold text-text">{fmt(valueAt(result, "arm_swing", "value", f.frame))}</b></div>
              </div>
            </div>
          </button>
        );
      })}
    </section>
  );
}
