"use client";

import { useEffect, useMemo, useState } from "react";

import AnalyticsTabs, { useTabFromHash } from "@/components/analytics/AnalyticsTabs";
import FitnessHero from "@/components/analytics/FitnessHero";
import MileageCard from "@/components/analytics/MileageCard";
import { SummaryCards } from "@/components/analytics/OverviewSummary";
import PersonalRecordsGrid, { RunRow } from "@/components/analytics/PersonalRecordsGrid";
import { PersonalRecord } from "@/components/analytics/records";
import ScatterTrendCard from "@/components/analytics/ScatterTrendCard";
import { PersonalBaselineCard, TypeSplitEntry, WhereYouRunCard } from "@/components/analytics/TrainingMix";
import { useWeatherImpact } from "@/components/analytics/weather/useWeatherImpact";
import WeatherSection from "@/components/analytics/weather/WeatherSection";
import { analyzeSeries, SeriesPoint } from "@/components/analytics/trendStats";
import { BiomechanicsTrendPoint } from "@/components/charts/MetricTrendChart";
import { PaceTrendPoint } from "@/components/charts/PaceTrendChart";
import Header from "@/components/Header";
import { shiftMonths, startOfMonth } from "@/components/charts/trendMath";
import { formatPace } from "@/lib/format";

const RANGES = [
  { label: "3M", months: 3 },
  { label: "6M", months: 6 },
  { label: "1Y", months: 12 },
  { label: "All", months: 24 }, // backend caps the trend endpoints at 24 months
] as const;

function getJson<T>(url: string, set: (v: T | null) => void) {
  fetch(url)
    .then((res) => (res.ok ? res.json() : null))
    .then(set)
    .catch(() => set(null));
}

function SectionLabel({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3.5 mt-[30px] flex items-center gap-3">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-text-soft">{children}</h2>
      <div className="h-px flex-1 bg-border" />
      {right}
    </div>
  );
}

const mmss = (s: number) => formatPace(s).replace("/km", "");
const signed = (n: number, digits: number) => `${n >= 0 ? "↑" : "↓"} ${Math.abs(n).toFixed(digits)}`;

function PanelTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-[18px]">
      <h2 className="text-xl font-semibold tracking-[-0.01em]">{title}</h2>
      <p className="mt-1 text-[13px] text-text-muted">{subtitle}</p>
    </div>
  );
}

/** Analytics, in four tabs: Overview (fitness, summaries, training mix), Records,
 * Form (pace & running dynamics) and Conditions (weather). */
export default function AnalyticsPage() {
  const [tab, setTab] = useTabFromHash();
  const [months, setMonths] = useState(12);
  const [includeTreadmill, setIncludeTreadmill] = useState(true);

  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [typeSplit, setTypeSplit] = useState<TypeSplitEntry[] | null>(null);
  const [paceTrend, setPaceTrend] = useState<PaceTrendPoint[] | null>(null);
  const [biomech, setBiomech] = useState<BiomechanicsTrendPoint[] | null>(null);
  const [easyRecent, setEasyRecent] = useState<PaceTrendPoint[] | null>(null);

  useEffect(() => {
    getJson("/api/personal-records", setRecords);
    getJson("/api/activities", setRuns);
    getJson("/api/analytics/type-split", setTypeSplit);
    getJson("/api/analytics/pace-trend?months=1", setEasyRecent);
  }, []);

  const weather = useWeatherImpact(months);

  useEffect(() => {
    getJson(`/api/analytics/pace-trend?months=${months}`, setPaceTrend);
    getJson(`/api/analytics/biomechanics-trend?months=${months}`, setBiomech);
  }, [months]);

  const rangeStart = shiftMonths(startOfMonth(new Date()), -(months - 1)).getTime();
  const rangeEnd = Date.now();

  const shown = <T extends { activity_type: string | null }>(rows: T[] | null) =>
    rows?.filter((d) => includeTreadmill || d.activity_type !== "treadmill_running") ?? null;

  const series = useMemo(() => {
    const toPoints = <T extends { started_at: string; activity_type: string | null }>(
      rows: T[] | null,
      get: (d: T) => number | null,
    ): SeriesPoint[] | null =>
      rows
        ? shown(rows)!
            .map((d) => ({ t: new Date(d.started_at).getTime(), v: get(d), treadmill: d.activity_type === "treadmill_running" }))
            .filter((p): p is SeriesPoint => p.v != null)
        : null;
    return {
      pace: toPoints(paceTrend, (d) => d.avg_pace_s_per_km),
      cadence: toPoints(biomech, (d) => d.avg_cadence),
      stride: toPoints(biomech, (d) => d.avg_stride_length),
      vo: toPoints(biomech, (d) => d.avg_vertical_oscillation),
      vr: toPoints(biomech, (d) => d.avg_vertical_ratio),
      gct: toPoints(biomech, (d) => d.avg_ground_contact_time),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paceTrend, biomech, includeTreadmill]);

  const stats = {
    pace: series.pace && analyzeSeries(series.pace, "down"),
    cadence: series.cadence && analyzeSeries(series.cadence, "up"),
    stride: series.stride && analyzeSeries(series.stride, "up"),
    vo: series.vo && analyzeSeries(series.vo, "down"),
    vr: series.vr && analyzeSeries(series.vr, "down"),
    gct: series.gct && analyzeSeries(series.gct, "down"),
  };
  const statList = Object.values(stats).filter((s) => s != null);
  const improvingCount = statList.filter((s) => s!.improving).length;
  const worsening = (
    [
      ["Pace", stats.pace],
      ["Cadence", stats.cadence],
      ["Stride length", stats.stride],
      ["Vertical oscillation", stats.vo],
      ["Vertical ratio", stats.vr],
      ["Ground contact time", stats.gct],
    ] as const
  )
    .filter(([, s]) => s && !s.improving)
    .map(([n]) => n);

  const common = { rangeStart, rangeEnd };
  const now = Date.now();

  const formSummary = statList.length ? { improving: improvingCount, total: statList.length, worsening } : null;
  const conditionsTab = tab === "conditions"; // weather is outdoor-only, so the treadmill switch doesn't apply

  return (
    <div>
      <Header
        eyebrow="Analytics"
        title="What's happening with my running?"
        subtitle="Performance, records and form, all from your synced runs."
      >
        <button
          type="button"
          role="switch"
          aria-checked={includeTreadmill && !conditionsTab}
          disabled={conditionsTab}
          onClick={() => setIncludeTreadmill((v) => !v)}
          className={
            "flex h-10 items-center gap-2 rounded-[10px] border border-border bg-surface px-3 text-[13px] text-text-soft " +
            (conditionsTab ? "cursor-default opacity-45" : "")
          }
        >
          <span
            className={
              "relative h-[18px] w-[30px] rounded-full " + (includeTreadmill && !conditionsTab ? "bg-positive" : "bg-border-strong")
            }
          >
            <span
              className={
                "absolute top-0.5 h-3.5 w-3.5 rounded-full bg-[#14102a] " + (includeTreadmill && !conditionsTab ? "right-0.5" : "left-0.5")
              }
            />
          </span>
          {conditionsTab ? "Treadmill excluded here" : "Include treadmill"}
        </button>
        <div role="group" aria-label="Range" className="flex rounded-[10px] border border-border bg-surface p-[3px]">
          {RANGES.map((r) => (
            <button
              key={r.label}
              type="button"
              aria-pressed={months === r.months}
              onClick={() => setMonths(r.months)}
              className={
                "rounded-[7px] px-3.5 py-[7px] text-[13px] " +
                (months === r.months
                  ? "bg-surface-hover text-text shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
                  : "text-text-soft hover:text-text")
              }
            >
              {r.label}
            </button>
          ))}
        </div>
      </Header>

      <AnalyticsTabs
        active={tab}
        onSelect={setTab}
        badges={{
          records: records ? { text: String(records.length) } : null,
          form: formSummary ? { text: `${formSummary.improving}/${formSummary.total} ↑`, tone: "good" } : null,
        }}
      />

      {tab === "overview" && (
        <>
          <FitnessHero records={records} runs={runs} />
          <SummaryCards records={records} form={formSummary} weather={weather.data} onNavigate={setTab} />
          <SectionLabel>Training mix</SectionLabel>
          <section className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,4fr)_minmax(0,6fr)]">
            <WhereYouRunCard data={typeSplit} />
            <MileageCard />
          </section>
        </>
      )}

      {tab === "records" && (
        <>
          <PanelTitle
            title="Personal records"
            subtitle="Your best efforts at each distance, with the fitness (VDOT) each one shows."
          />
          <PersonalRecordsGrid records={records} runs={runs} />
        </>
      )}

      {tab === "form" && (
        <>
          <PanelTitle
            title="Pace & biomechanics"
            subtitle="How your running form is changing, from your watch's running-dynamics data."
          />
          <div className="mb-3.5 flex flex-wrap justify-end gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10"><circle cx="5" cy="5" r="4" fill="#8c86c8" /></svg>Outdoor run
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="10" height="10"><circle cx="5" cy="5" r="3.5" fill="none" stroke="#38d6ff" strokeWidth="1.5" /></svg>Treadmill
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[3px] w-3.5 rounded-sm bg-positive" />Trend · improving
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-[3px] w-3.5 rounded-sm bg-amber" />Trend · worsening
            </span>
          </div>

      <div className="mb-[18px] flex flex-wrap items-center gap-[18px] rounded-[14px] border border-border bg-surface px-[18px] py-3.5">
        <div className="flex items-baseline gap-1.5">
          <b className="text-[28px] font-semibold">
            {statList.length ? improvingCount : "--"}
            <span className="text-lg text-text-muted">/{statList.length || 6}</span>
          </b>
          <span className="text-[13px] text-text-muted">form metrics improving</span>
        </div>
        <div className="flex gap-1.5">
          {Object.values(stats).map((s, i) => (
            <i key={i} className={"h-1.5 w-7 rounded-[3px] " + (s == null ? "bg-border" : s.improving ? "bg-positive" : "bg-amber")} />
          ))}
        </div>
        <p className="min-w-[200px] flex-1 border-l border-border pl-[18px] text-[13px] leading-normal text-text-soft">
          {!statList.length
            ? "Not enough runs in this range yet."
            : worsening.length === 0
              ? "Every tracked metric is trending the right way over this range."
              : (
                <>
                  <b className="font-semibold text-amber">{worsening.join(", ")}</b> {worsening.length === 1 ? "is" : "are"}{" "}
                  trending the wrong way over this range.
                </>
              )}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-[18px] md:grid-cols-2 xl:grid-cols-3">
        <ScatterTrendCard
          {...common}
          name="Pace trend"
          hint="Easy runs, faster is up"
          info="How fast you run, in minutes per km. Lower is faster; the chart is flipped so a line going up means getting faster."
          unit="/km"
          points={series.pace}
          stats={stats.pace}
          invert
          formatTick={mmss}
          formatValue={mmss}
          formatDelta={(c) => `${c <= 0 ? "↑" : "↓"} ${mmss(Math.abs(c))} ${c <= 0 ? "faster" : "slower"}`}
        />
        <ScatterTrendCard
          {...common}
          name="Cadence"
          hint="Steps per minute"
          info="Steps per minute. Higher cadence usually means shorter, quicker steps, which tends to be easier on your joints."
          unit="spm"
          points={series.cadence}
          stats={stats.cadence}
          formatTick={(v) => String(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          formatDelta={(c) => `${signed(c, 0)} spm`}
          band={{ lo: 170, hi: 180, label: "Target 170–180" }}
        />
        <ScatterTrendCard
          {...common}
          name="Stride length"
          hint="Distance per step"
          info="Distance covered by each step. It grows when you run faster, so it isn't simply good or bad."
          unit="cm"
          points={series.stride}
          stats={stats.stride}
          formatTick={(v) => String(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          formatDelta={(c) => `${signed(c, 1)} cm`}
        />
        <ScatterTrendCard
          {...common}
          name="Vertical oscillation"
          hint="Bounce per step · lower is better"
          info="How much your body bounces up and down with each step. Less bounce means less energy wasted going up instead of forward."
          unit="cm"
          points={series.vo}
          stats={stats.vo}
          formatTick={(v) => v.toFixed(1)}
          formatValue={(v) => v.toFixed(1)}
          formatDelta={(c) => `${signed(c, 1)} cm`}
        />
        <ScatterTrendCard
          {...common}
          name="Vertical ratio"
          hint="Bounce ÷ stride · lower is better"
          info="Bounce divided by stride length, as a %. Lower is more efficient."
          unit="%"
          points={series.vr}
          stats={stats.vr}
          formatTick={(v) => `${v.toFixed(0)}%`}
          formatValue={(v) => v.toFixed(1)}
          formatDelta={(c) => `${signed(c, 1)}%`}
          band={{ lo: -Infinity, hi: 8.6, label: "Efficient < 8.6%" }}
        />
        <ScatterTrendCard
          {...common}
          name="Ground contact time"
          hint="Foot on ground · lower is better"
          info="How long your foot stays on the ground each step. Shorter contact usually means a quicker, more efficient stride."
          unit="ms"
          points={series.gct}
          stats={stats.gct}
          formatTick={(v) => String(Math.round(v))}
          formatValue={(v) => String(Math.round(v))}
          formatDelta={(c) => `${signed(c, 0)} ms`}
        />
      </section>

          <section className="mt-[18px]">
            <PersonalBaselineCard
              hrRuns={biomech ? biomech.filter((d) => d.avg_hr != null).length : null}
              hasDynamics={biomech ? biomech.some((d) => d.avg_cadence != null) : null}
              easyRunsLast4Weeks={easyRecent ? easyRecent.filter((d) => now - new Date(d.started_at).getTime() <= 28 * 86_400_000).length : null}
            />
          </section>
        </>
      )}

      {tab === "conditions" && (
        <>
          <PanelTitle
            title="Weather & conditions"
            subtitle="How heat and time of day affect your pace. Outdoor runs only; weather at start time."
          />
          <WeatherSection data={weather.data} error={weather.error} />
        </>
      )}
    </div>
  );
}
