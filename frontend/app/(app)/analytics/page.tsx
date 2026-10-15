"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import MetricTrendChart, {
  BiomechanicsTrendPoint,
} from "@/components/charts/MetricTrendChart";
import PaceTrendChart, {
  PaceTrendPoint,
} from "@/components/charts/PaceTrendChart";
import Header from "@/components/Header";
import PersonalRecordsCard from "@/components/PersonalRecordsCard";
import TypeSplitCard from "@/components/TypeSplitCard";

/** Cadence (spm) zone bands -- bright, high-contrast hues chosen to read
 * clearly against the dark chart background (muted theme colors wash out
 * at small dot sizes). */
function cadenceZoneColor(spm: number): string {
  if (spm < 151) return "#ff5252"; // red
  if (spm <= 162) return "#ffab40"; // orange
  if (spm <= 173) return "#69f0ae"; // green
  if (spm <= 185) return "#448aff"; // blue
  return "#ff4fa3"; // pink
}

/** Vertical ratio (%) zone bands -- lower is better here, so the color
 * order flips vs. cadence (red = high/worse, pink = low/best). Same
 * bright palette for visual consistency between zone-colored cards. */
function verticalRatioZoneColor(pct: number): string {
  if (pct > 10.1) return "#ff5252"; // red
  if (pct >= 8.6) return "#ffab40"; // orange
  if (pct >= 7.4) return "#69f0ae"; // green
  if (pct >= 6.1) return "#448aff"; // blue
  return "#ff4fa3"; // pink
}

/** Vertical oscillation (cm) zone bands -- lower is better, same color
 * order as vertical ratio. Requested bands overlapped slightly (blue's
 * floor of 6.1 vs. pink's "<6.4"); resolved by using 6.4 as the shared
 * cutoff so bands stay contiguous. */
function verticalOscillationZoneColor(cm: number): string {
  if (cm > 11.5) return "#ff5252"; // red
  if (cm >= 9.7) return "#ffab40"; // orange
  if (cm >= 8.1) return "#69f0ae"; // green
  if (cm >= 6.4) return "#448aff"; // blue
  return "#ff4fa3"; // pink
}

/** Ground contact time (ms) zone bands -- lower is better, same color
 * order as vertical ratio/oscillation. */
function groundContactTimeZoneColor(ms: number): string {
  if (ms > 305) return "#ff5252"; // red
  if (ms >= 273) return "#ffab40"; // orange
  if (ms >= 241) return "#69f0ae"; // green
  if (ms >= 208) return "#448aff"; // blue
  return "#ff4fa3"; // pink
}

/** Tooltip body for the "i" icon: what the dot colors and the trend line mean. */
function ColorRule({
  about,
  dots,
  line,
}: {
  about: string;
  dots: { color: string; label: string }[];
  line: { color: string; label: string }[];
}) {
  const rows = (items: { color: string; label: string }[], shape: string) =>
    items.map((it) => (
      <div key={it.label} className="flex items-center gap-2">
        <span
          className={`inline-block shrink-0 ${shape}`}
          style={{ backgroundColor: it.color }}
        />
        <span>{it.label}</span>
      </div>
    ));
  return (
    <div className="space-y-2">
      <p className="border-b border-border pb-2">{about}</p>
      <div>
        <div className="mb-1 font-semibold text-text-muted">Dots</div>
        <div className="space-y-0.5">{rows(dots, "h-2 w-2 rounded-full")}</div>
      </div>
      <div>
        <div className="mb-1 font-semibold text-text-muted">Trend line</div>
        <div className="space-y-0.5">{rows(line, "h-0.5 w-3")}</div>
      </div>
    </div>
  );
}

const TYPE_DOTS = [
  { color: "#ec4470", label: "Outdoor run" },
  { color: "#a855f7", label: "Treadmill run" },
];
const ZONE_COLORS = ["#ff5252", "#ffab40", "#69f0ae", "#448aff", "#ff4fa3"];
const zoneDots = (labels: string[]) =>
  labels.map((label, i) => ({ color: ZONE_COLORS[i], label }));
const GOOD_BAD_LINE = (good: string) => [
  { color: "#22c55e", label: `Green: ${good}` },
  { color: "#f97316", label: "Orange: moving the wrong way" },
];

/**
 * Blueprint §10-13: trends, personal baseline, similar-run engine. The
 * dot-scatter + 5-run-average trend charts (pace, then biomechanics)
 * live here rather than on the dashboard, which stays to high-level
 * totals.
 */
export default function AnalyticsPage() {
  const [paceTrend, setPaceTrend] = useState<PaceTrendPoint[] | null>(null);
  const [biomechanicsTrend, setBiomechanicsTrend] = useState<
    BiomechanicsTrendPoint[] | null
  >(null);
  const [includeTreadmill, setIncludeTreadmill] = useState(true);

  useEffect(() => {
    fetch("/api/analytics/pace-trend?months=6")
      .then((res) => (res.ok ? res.json() : null))
      .then(setPaceTrend)
      .catch(() => setPaceTrend(null));

    fetch("/api/analytics/biomechanics-trend?months=6")
      .then((res) => (res.ok ? res.json() : null))
      .then(setBiomechanicsTrend)
      .catch(() => setBiomechanicsTrend(null));
  }, []);

  const isShown = (d: { activity_type: string | null }) =>
    includeTreadmill || d.activity_type !== "treadmill_running";
  const shownPace = paceTrend?.filter(isShown) ?? null;
  const shownBiomechanics = biomechanicsTrend?.filter(isShown) ?? null;

  return (
    <div>
      <Header title="Analytics" subtitle="What is happening to my running?" />

      <PersonalRecordsCard />

      <div className="mb-3 mt-6 flex items-center gap-3">
        <h2 className="text-sm font-semibold text-text-muted">
          Pace &amp; Biomechanics
        </h2>
        <button
          type="button"
          role="switch"
          aria-checked={includeTreadmill}
          onClick={() => setIncludeTreadmill((v) => !v)}
          className="flex items-center gap-2 text-[11px] text-text-muted hover:text-text"
        >
          <span
            className={`relative h-4 w-7 rounded-full transition-colors ${includeTreadmill ? "bg-positive" : "bg-border"}`}
          >
            <span
              className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all ${includeTreadmill ? "left-3.5" : "left-0.5"}`}
            />
          </span>
          Include treadmill
        </button>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Pace Trend"
          info={
            <ColorRule
              about="How fast you run, in minutes per km. Lower is faster. The chart is flipped so a line going up means you're getting faster."
              dots={TYPE_DOTS}
              line={GOOD_BAD_LINE("getting faster")}
            />
          }
        >
          {shownPace ? (
            <PaceTrendChart data={shownPace} months={6} />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card
          title="Cadence"
          info={
            <ColorRule
              about="Steps per minute (spm). Higher cadence usually means shorter, quicker steps, which tends to be easier on your joints."
              dots={zoneDots([
                "< 151 spm",
                "151-162 spm",
                "163-173 spm",
                "174-185 spm",
                "> 185 spm",
              ])}
              line={GOOD_BAD_LINE("cadence rising")}
            />
          }
        >
          {shownBiomechanics ? (
            <MetricTrendChart
              data={shownBiomechanics}
              getValue={(d) => d.avg_cadence}
              formatValue={(v) => `${Math.round(v)} spm`}
              getColor={(d) =>
                d.avg_cadence != null
                  ? cadenceZoneColor(d.avg_cadence)
                  : "var(--color-text-muted)"
              }
              goodDirection="up"
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card
          title="Stride Length"
          info={
            <ColorRule
              about="Distance covered by each step. It grows when you run faster, so it isn't simply good or bad."
              dots={TYPE_DOTS}
              line={[
                {
                  color: "#ef4444",
                  label: "Red: neutral, no good/bad direction",
                },
              ]}
            />
          }
        >
          {shownBiomechanics ? (
            <MetricTrendChart
              data={shownBiomechanics}
              getValue={(d) => d.avg_stride_length}
              formatValue={(v) => `${v.toFixed(1)} cm`}
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card
          title="Vertical Oscillation"
          info={
            <ColorRule
              about="How much your body bounces up and down with each step. Less bounce means less energy wasted going up instead of forward."
              dots={zoneDots([
                "> 11.5 cm",
                "9.7-11.5 cm",
                "8.1-9.6 cm",
                "6.4-8.0 cm",
                "< 6.4 cm (best)",
              ])}
              line={GOOD_BAD_LINE("oscillation falling (lower = better)")}
            />
          }
        >
          {shownBiomechanics ? (
            <MetricTrendChart
              data={shownBiomechanics}
              getValue={(d) => d.avg_vertical_oscillation}
              formatValue={(v) => `${v.toFixed(1)} cm`}
              getColor={(d) =>
                d.avg_vertical_oscillation != null
                  ? verticalOscillationZoneColor(d.avg_vertical_oscillation)
                  : "var(--color-text-muted)"
              }
              goodDirection="down"
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card
          title="Vertical Ratio"
          info={
            <ColorRule
              about="Bounce divided by stride length, as a %. It shows how much of your effort goes up instead of forward. Lower is more efficient."
              dots={zoneDots([
                "> 10.1%",
                "8.6-10.1%",
                "7.4-8.5%",
                "6.1-7.3%",
                "< 6.1% (best)",
              ])}
              line={GOOD_BAD_LINE("ratio falling (lower = better)")}
            />
          }
        >
          {shownBiomechanics ? (
            <MetricTrendChart
              data={shownBiomechanics}
              getValue={(d) => d.avg_vertical_ratio}
              formatValue={(v) => `${v.toFixed(1)}%`}
              getColor={(d) =>
                d.avg_vertical_ratio != null
                  ? verticalRatioZoneColor(d.avg_vertical_ratio)
                  : "var(--color-text-muted)"
              }
              goodDirection="down"
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
        <Card
          title="Ground Contact Time"
          info={
            <ColorRule
              about="How long your foot stays on the ground each step. Shorter contact usually means a quicker, more efficient stride."
              dots={zoneDots([
                "> 305 ms",
                "273-305 ms",
                "241-272 ms",
                "208-240 ms",
                "< 208 ms (best)",
              ])}
              line={GOOD_BAD_LINE("contact time falling (lower = better)")}
            />
          }
        >
          {shownBiomechanics ? (
            <MetricTrendChart
              data={shownBiomechanics}
              getValue={(d) => d.avg_ground_contact_time}
              formatValue={(v) => `${Math.round(v)} ms`}
              getColor={(d) =>
                d.avg_ground_contact_time != null
                  ? groundContactTimeZoneColor(d.avg_ground_contact_time)
                  : "var(--color-text-muted)"
              }
              goodDirection="down"
            />
          ) : (
            <EmptyPlaceholder label="Loading..." />
          )}
        </Card>
      </div>

      <h2 className="mb-3 mt-6 text-sm font-semibold text-text-muted">
        Training Mix
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TypeSplitCard />
        <Card title="Personal Baseline">
          <EmptyPlaceholder label="No baseline computed yet" />
        </Card>
      </div>
    </div>
  );
}
