import type { AnalysisResult } from "@/components/video-analysis/types";

/** Display-only description of one gauge: the axis, the "typical" band drawn
 * in green, and the words used when a value falls outside that band. The
 * numbers come from the design draft -- they are guide rails for reading a
 * 2D side-view estimate, not clinical thresholds. */
export interface GaugeDef {
  name: string;
  unit: string; // "°" or ""
  axis: [number, number];
  typical: [number, number];
  axisLabels: [string, string, string]; // left end, centre (typical band), right end
  decimals: number;
  aboveLabel: string;
  belowLabel: string;
}

export const SHANK: GaugeDef = {
  name: "Shank angle",
  unit: "°",
  axis: [-5, 20],
  typical: [0, 8],
  axisLabels: ["−5°", "0–8° typical", "20°"],
  decimals: 1,
  aboveLabel: "Overstriding",
  belowLabel: "Below typical",
};
export const FOOT_AHEAD: GaugeDef = {
  name: "Foot ahead of hip",
  unit: "",
  axis: [0, 1.2],
  typical: [0, 0.6],
  axisLabels: ["0", "≤ 0.6 typical", "1.2"],
  decimals: 2,
  aboveLabel: "A bit far",
  belowLabel: "Below typical",
};
export const KNEE_TD: GaugeDef = {
  name: "Knee flexion",
  unit: "°",
  axis: [0, 40],
  typical: [15, 30],
  axisLabels: ["0° straight", "15–30° typical", "40°"],
  decimals: 1,
  aboveLabel: "Bends a lot",
  belowLabel: "Stiff",
};
export const KNEE_MS: GaugeDef = {
  name: "Knee flexion · shock absorption",
  unit: "°",
  axis: [20, 60],
  typical: [35, 50],
  axisLabels: ["20°", "35–50° typical", "60°"],
  decimals: 1,
  aboveLabel: "Bends a lot",
  belowLabel: "Stiff",
};
export const TRUNK: GaugeDef = {
  name: "Trunk lean",
  unit: "°",
  axis: [-5, 15],
  typical: [2, 8],
  axisLabels: ["−5° back", "2–8° typical", "15°"],
  decimals: 1,
  aboveLabel: "Leaning far",
  belowLabel: "Upright",
};
export const ELBOW: GaugeDef = {
  name: "Elbow angle",
  unit: "°",
  axis: [60, 160],
  typical: [75, 105],
  axisLabels: ["60°", "75–105° typical", "160°"],
  decimals: 0,
  aboveLabel: "Slightly open",
  belowLabel: "Tightly bent",
};

export const pct = (def: GaugeDef, v: number) =>
  Math.min(100, Math.max(0, ((v - def.axis[0]) / (def.axis[1] - def.axis[0])) * 100));

export type Tone = "good" | "warn";

/** Good when every value sits inside the typical band; otherwise names the side it missed on. */
export function judge(def: GaugeDef, values: number[]): { tone: Tone; label: string } {
  const [lo, hi] = def.typical;
  if (values.some((v) => v > hi)) return { tone: "warn", label: def.aboveLabel };
  if (values.some((v) => v < lo)) return { tone: "warn", label: def.belowLabel };
  return { tone: "good", label: "Good" };
}

/** Frames of the analysis result -> per-frame value lookups used by the readout, timeline and check frames. */
export function valueAt(result: AnalysisResult, chart: string, key: string, frame: number): number | null {
  const rows = result.charts[chart];
  if (!rows?.length) return null;
  let best: Record<string, number> | null = null;
  for (const r of rows) if (best == null || Math.abs(r.frame - frame) < Math.abs(best.frame - frame)) best = r;
  const v = best?.[key];
  return v != null && Number.isFinite(v) ? v : null;
}

/** The charts store the inner knee angle (180° = straight); the design shows flexion (0° = straight). */
export const kneeFlexionAt = (result: AnalysisResult, frame: number) => {
  const inner = valueAt(result, "knee_angle", "value", frame);
  return inner == null ? null : 180 - inner;
};

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(2).padStart(5, "0")}`;
};
