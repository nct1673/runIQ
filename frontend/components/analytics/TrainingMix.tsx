import { CardTitle } from "@/components/Card";
import { formatPace } from "@/lib/format";

export interface TypeSplitEntry {
  activity_type: string;
  runs: number;
  distance_km: number;
}

const CARD = "rounded-2xl border border-border bg-surface p-[22px] shadow-[0_8px_24px_rgba(0,0,0,0.2)]";
const OUTDOOR = "linear-gradient(90deg,#a27bff,#ff4d8d)";
const TREADMILL = "#38d6ff";

function SplitBar({ label, outdoorPct }: { label: string; outdoorPct: number }) {
  return (
    <>
      <div className="flex justify-between text-[13px] text-text-muted">
        <span>{label}</span>
        <span>
          <b className="text-text">{Math.round(outdoorPct)}%</b> outdoor ·{" "}
          <b className="text-text">{Math.round(100 - outdoorPct)}%</b> treadmill
        </span>
      </div>
      <div className="mb-5 mt-2 flex h-[18px] gap-[3px] overflow-hidden rounded-full">
        <i style={{ width: `${outdoorPct}%`, background: OUTDOOR }} />
        <i className="flex-1" style={{ background: TREADMILL }} />
      </div>
    </>
  );
}

function Tile({ color, name, km, runs }: { color: string; name: string; km: number; runs: number }) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-border bg-surface-hover px-5 py-5">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <i className="inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: color }} />
        {name}
      </div>
      <div className="my-4 text-[40px] font-semibold leading-none">
        {km.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        <em className="text-base font-medium not-italic text-text-muted"> km</em>
      </div>
      <div className="flex flex-col gap-2.5">
        <div className="flex justify-between text-[13.5px] text-text-muted">
          <span>Runs</span>
          <b className="font-semibold text-text">{runs}</b>
        </div>
        <div className="flex justify-between text-[13.5px] text-text-muted">
          <span>Avg per run</span>
          <b className="font-semibold text-text">{runs ? (km / runs).toFixed(1) : "--"} km</b>
        </div>
      </div>
    </div>
  );
}

/** "Where you run": outdoor vs treadmill split by distance and by run count. */
export function WhereYouRunCard({ data }: { data: TypeSplitEntry[] | null }) {
  const outdoor = data?.find((d) => d.activity_type === "running");
  const treadmill = data?.find((d) => d.activity_type === "treadmill_running");
  const o = { runs: outdoor?.runs ?? 0, km: outdoor?.distance_km ?? 0 };
  const t = { runs: treadmill?.runs ?? 0, km: treadmill?.distance_km ?? 0 };
  const totalKm = o.km + t.km;
  const totalRuns = o.runs + t.runs;

  return (
    <div className={CARD + " flex flex-col"}>
      <div className="mb-[18px] flex items-center justify-between">
        <CardTitle accent="var(--color-brand)">Where you run</CardTitle>
        {data && (
          <span className="text-xs text-text-muted">
            {totalRuns} runs · {totalKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km
          </span>
        )}
      </div>
      {!data ? (
        <div className="flex h-40 items-center justify-center text-sm text-text-muted">Loading...</div>
      ) : totalRuns === 0 ? (
        <div className="flex h-40 items-center justify-center text-sm text-text-muted">No data yet</div>
      ) : (
        <div className="flex flex-1 flex-col">
          <SplitBar label="By distance" outdoorPct={totalKm ? (o.km / totalKm) * 100 : 0} />
          <SplitBar label="By runs" outdoorPct={totalRuns ? (o.runs / totalRuns) * 100 : 0} />
          <div className="mt-1 grid flex-1 grid-cols-2 gap-3">
            <Tile color={OUTDOOR} name="Outdoor" km={o.km} runs={o.runs} />
            <Tile color={TREADMILL} name="Treadmill" km={t.km} runs={t.runs} />
          </div>
        </div>
      )}
    </div>
  );
}

export interface BaselineSpread {
  typical: number;
  low: number;
  high: number;
}

/** GET /api/analytics/baseline: spreads are null until `ready`. */
export interface Baseline {
  ready: boolean;
  window_weeks: number;
  requirements: {
    hr_runs: number;
    hr_runs_required: number;
    has_running_dynamics: boolean;
    easy_runs_last_4_weeks: number;
    easy_runs_last_4_weeks_required: number;
  };
  easy_runs_used: number;
  easy_pace_s_per_km: BaselineSpread | null;
  easy_hr: BaselineSpread | null;
  easy_cadence: BaselineSpread | null;
  weekly_km: BaselineSpread | null;
  long_run_km: BaselineSpread | null;
  easy_share_pct: number | null;
}

function Req({ ok, n, label, right }: { ok: boolean; n: number; label: string; right: string }) {
  return (
    <div className="flex items-center gap-2.5 text-[13px] text-text-soft">
      <span
        className={
          "grid h-5 w-5 place-items-center rounded-full text-[11px] font-bold " +
          (ok ? "bg-positive text-[#14102a]" : "border-[1.5px] border-border-strong text-text-muted")
        }
      >
        {ok ? "✓" : n}
      </span>
      {label}
      <span className="ml-auto text-xs text-text-muted">{right}</span>
    </div>
  );
}

const mmss = (s: number) => formatPace(s).replace("/km", "");

function BaselineTile({
  label,
  value,
  unit,
  range,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  range: string;
  color: string;
}) {
  return (
    <div className="rounded-xl border bg-bg/35 px-4 py-3.5" style={{ borderColor: `${color}40` }}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">
        <i className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        {label}
      </div>
      <div className="mt-2 text-[26px] font-semibold leading-none">
        {value}
        <em className="ml-1 text-[13px] font-medium not-italic text-text-muted">{unit}</em>
      </div>
      <div className="mt-2 text-xs text-text-muted">{range}</div>
    </div>
  );
}

/** "Personal baseline": your typical numbers over the last 8 weeks (easy road runs), or a
 * readiness checklist until there is enough data. All values come from the backend. */
export function PersonalBaselineCard({ baseline }: { baseline: Baseline | null }) {
  const req = baseline?.requirements;
  const ready = baseline?.ready ?? false;
  const pace = baseline?.easy_pace_s_per_km;
  const hr = baseline?.easy_hr;
  const cadence = baseline?.easy_cadence;
  const weekly = baseline?.weekly_km;
  const longRun = baseline?.long_run_km;
  const easyRunsNeeded = req ? Math.max(0, req.easy_runs_last_4_weeks_required - req.easy_runs_last_4_weeks) : 0;

  return (
    <div className={CARD}>
      <div className="mb-[18px] flex items-center justify-between">
        <CardTitle accent="var(--color-violet)">Personal baseline</CardTitle>
        <span className="rounded-full border border-border-strong bg-surface-hover px-[9px] py-1 text-[11px] font-semibold text-text-muted">
          {!baseline ? "Loading..." : ready ? `Last ${baseline.window_weeks} weeks` : "Not ready yet"}
        </span>
      </div>

      {ready && pace && hr && cadence && weekly && longRun ? (
        <>
          <p className="mb-4 text-[13px] leading-[1.55] text-text-soft">
            Your typical numbers on easy road runs. The range under each is where you usually land, so a run
            outside it stands out as unusually good, or a sign of fatigue.
          </p>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <BaselineTile
              label="Easy pace"
              value={mmss(pace.typical)}
              unit="/km"
              range={`usually ${mmss(pace.low)} – ${mmss(pace.high)}`}
              color="#b6f35a"
            />
            <BaselineTile
              label="Easy heart rate"
              value={String(hr.typical)}
              unit="bpm"
              range={`usually ${hr.low} – ${hr.high}`}
              color="#ff4d8d"
            />
            <BaselineTile
              label="Cadence"
              value={String(cadence.typical)}
              unit="spm"
              range={`usually ${cadence.low} – ${cadence.high}`}
              color="#38d6ff"
            />
            <BaselineTile
              label="Weekly distance"
              value={weekly.typical.toFixed(1)}
              unit="km"
              range={`usually ${weekly.low.toFixed(0)} – ${weekly.high.toFixed(0)} km`}
              color="#a27bff"
            />
            <BaselineTile
              label="Long run"
              value={longRun.typical.toFixed(1)}
              unit="km"
              range={`longest weekly runs up to ${longRun.high.toFixed(1)} km`}
              color="#ffb938"
            />
            <BaselineTile
              label="Easy share"
              value={baseline?.easy_share_pct != null ? String(baseline.easy_share_pct) : "--"}
              unit="%"
              range="of recent runs are easy"
              color="#8c86c8"
            />
          </div>
          <p className="mt-3.5 text-xs text-text-muted">
            Median over the last {baseline!.window_weeks} weeks · based on {baseline!.easy_runs_used} easy runs
          </p>
        </>
      ) : (
        <div className="grid grid-cols-[auto_1fr] items-start gap-[22px]">
          <div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet/30 bg-violet/15 text-[#c9b6ff]">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M3 12h4l3-8 4 16 3-8h4" />
            </svg>
          </div>
          <div>
            <h3 className="mb-1.5 text-lg font-semibold">Your baseline unlocks personal ranges</h3>
            <p className="text-[13px] leading-[1.55] text-text-soft">
              Once there is enough easy-run data, every metric is compared to <i>your</i> normal rather than generic
              targets, so you&apos;ll see when a run is unusually good, or a sign of fatigue.
            </p>
            {req && (
              <div className="mt-4 flex flex-col gap-2.5">
                <Req
                  ok={req.hr_runs >= req.hr_runs_required}
                  n={1}
                  label="Easy runs with heart-rate data"
                  right={`${req.hr_runs} / ${req.hr_runs_required}`}
                />
                <Req
                  ok={req.has_running_dynamics}
                  n={2}
                  label="Running-dynamics data (cadence, GCT)"
                  right={req.has_running_dynamics ? "Available" : "Missing"}
                />
                <Req
                  ok={easyRunsNeeded === 0}
                  n={3}
                  label="Easy runs in the last 4 weeks"
                  right={`${req.easy_runs_last_4_weeks} / ${req.easy_runs_last_4_weeks_required}`}
                />
              </div>
            )}
            {req && easyRunsNeeded > 0 && (
              <p className="mt-3.5 text-xs text-text-muted">Needs {easyRunsNeeded} more easy runs in the last 4 weeks.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
