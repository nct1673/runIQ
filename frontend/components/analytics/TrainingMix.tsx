import { CardTitle } from "@/components/Card";

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

const NEED_HR_RUNS = 20;
const NEED_EASY_RUNS = 8;

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

/** "Personal baseline": readiness checklist from real counts; the baseline itself isn't computed yet. */
export function PersonalBaselineCard({
  hrRuns,
  hasDynamics,
  easyRunsLast4Weeks,
}: {
  hrRuns: number | null;
  hasDynamics: boolean | null;
  easyRunsLast4Weeks: number | null;
}) {
  const loaded = hrRuns != null && hasDynamics != null && easyRunsLast4Weeks != null;
  const hrOk = (hrRuns ?? 0) >= NEED_HR_RUNS;
  const easyOk = (easyRunsLast4Weeks ?? 0) >= NEED_EASY_RUNS;
  const ready = loaded && hrOk && hasDynamics && easyOk;

  return (
    <div className={CARD}>
      <div className="mb-[18px] flex items-center justify-between">
        <CardTitle accent="var(--color-violet)">Personal baseline</CardTitle>
        <span className="rounded-full border border-border-strong bg-surface-hover px-[9px] py-1 text-[11px] font-semibold text-text-muted">
          {ready ? "Ready" : "Not ready yet"}
        </span>
      </div>
      <div className="grid grid-cols-[auto_1fr] items-start gap-[22px]">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-violet/30 bg-violet/15 text-[#c9b6ff]">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 12h4l3-8 4 16 3-8h4" />
          </svg>
        </div>
        <div>
          <h3 className="mb-1.5 text-lg font-semibold">Your baseline unlocks personal ranges</h3>
          <p className="text-[13px] leading-[1.55] text-text-soft">
            Once computed, every metric above is compared to <i>your</i> normal rather than generic targets, so you&apos;ll
            see when a run is unusually good, or a sign of fatigue.
          </p>
          {loaded && (
            <div className="mt-4 flex flex-col gap-2.5">
              <Req ok={hrOk} n={1} label="Runs with heart-rate data" right={`${hrRuns} / ${NEED_HR_RUNS}`} />
              <Req ok={hasDynamics} n={2} label="Running-dynamics data (cadence, GCT)" right={hasDynamics ? "Available" : "Missing"} />
              <Req ok={easyOk} n={3} label="Easy runs in the last 4 weeks" right={`${easyRunsLast4Weeks} / ${NEED_EASY_RUNS}`} />
            </div>
          )}
          {/* TODO: baseline computation isn't built; the button stays disabled until it is. */}
          <div className="mt-[18px] flex items-center">
            <button
              type="button"
              disabled
              className="inline-flex items-center rounded-[10px] bg-[linear-gradient(135deg,#c9b6ff,#a27bff)] px-3.5 py-[9px] text-[13px] font-semibold text-[#14102a] opacity-45"
            >
              Compute baseline
            </button>
            {loaded && !easyOk && (
              <span className="ml-3 text-xs text-text-muted">Needs {NEED_EASY_RUNS - easyRunsLast4Weeks!} more easy runs</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
