import type { ReactNode } from "react";

import {
  type DashboardActivity,
  EASY_TARGET_PCT,
  MIX_WINDOW_DAYS,
  intensitySplit,
  surfaceSplit,
  trainingEffectMix,
} from "@/components/dashboard/mixStats";
import { formatPace } from "@/lib/format";

const PACE = (s: number | null) => (s == null ? "--" : formatPace(s).replace("/km", ""));

/** Same shell as KpiCard (coloured top edge, label row), but with a free-form body. */
function MixCard({
  accent,
  label,
  footer,
  children,
}: {
  accent: string;
  label: string;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-w-0 flex-col rounded-2xl border border-border bg-surface px-5 py-[18px]"
      style={{ boxShadow: `inset 0 3px 0 ${accent}, 0 8px 24px rgba(0,0,0,0.2)` }}
    >
      <div className="flex justify-between text-xs font-medium text-text-soft">
        <span>{label}</span>
        <span className="text-text-muted">Last {MIX_WINDOW_DAYS} days</span>
      </div>
      <div className="flex flex-1 flex-col justify-center py-3">{children}</div>
      {footer && <div className="text-xs text-text-muted">{footer}</div>}
    </div>
  );
}

const Empty = () => <div className="text-sm text-text-muted">No data yet</div>;

// ---- 1. road vs treadmill donut -------------------------------------------------

const R = 28;
const CIRC = 2 * Math.PI * R;

export function SurfaceCard({ activities }: { activities: DashboardActivity[] | null }) {
  const s = activities ? surfaceSplit(activities) : null;
  const total = s ? s.roadKm + s.treadmillKm : 0;
  const roadPct = s && total > 0 ? (s.roadKm / total) * 100 : 0;

  return (
    <MixCard
      accent="#38d6ff"
      label="Road vs treadmill"
      footer={
        s && total > 0
          ? s.roadPace != null && s.treadmillPace != null
            ? `Treadmill is ${Math.abs(Math.round(s.roadPace - s.treadmillPace))}s/km ${s.treadmillPace < s.roadPace ? "faster" : "slower"}`
            : "Only one surface so far"
          : undefined
      }
    >
      {!s || total === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="flex items-center gap-4">
            <div className="relative h-[92px] w-[92px] shrink-0">
              <svg viewBox="0 0 72 72" className="-rotate-90">
                <circle cx="36" cy="36" r={R} fill="none" stroke="#a27bff" strokeWidth="9" />
                <circle
                  cx="36"
                  cy="36"
                  r={R}
                  fill="none"
                  stroke="#38d6ff"
                  strokeWidth="9"
                  strokeDasharray={`${(roadPct / 100) * CIRC} ${CIRC}`}
                />
              </svg>
              <div className="absolute inset-0 grid place-items-center text-[19px] font-semibold tabular-nums">
                {Math.round(roadPct)}%
              </div>
            </div>
            <div className="min-w-0 space-y-3 text-[13px]">
              <Legend color="#38d6ff" name="Road" km={s.roadKm} pace={s.roadPace} />
              <Legend color="#a27bff" name="Treadmill" km={s.treadmillKm} pace={s.treadmillPace} />
            </div>
          </div>
        </>
      )}
    </MixCard>
  );
}

function Legend({ color, name, km, pace }: { color: string; name: string; km: number; pace: number | null }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-text-soft">
        <i className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
        {name}
      </div>
      <div className="mt-0.5 tabular-nums text-text-muted">
        <b className="text-[15px] font-semibold text-text">{km.toFixed(0)}</b> km · {PACE(pace)}
      </div>
    </div>
  );
}

// ---- 4. easy / hard split --------------------------------------------------------

export function IntensityCard({ activities }: { activities: DashboardActivity[] | null }) {
  const s = activities ? intensitySplit(activities) : null;
  const total = s ? s.easy + s.moderate + s.hard : 0;
  const pct = (v: number) => (total > 0 ? (v / total) * 100 : 0);
  const easyPct = s ? pct(s.easy) : 0;
  const onTarget = easyPct >= EASY_TARGET_PCT;

  return (
    <MixCard
      accent="#b6f35a"
      label="Easy / hard split"
      footer={
        s && total > 0 ? (
          <div className="flex items-end justify-between">
            <span>
              Z3 {Math.round(pct(s.moderate))}% · Z4-5 {Math.round(pct(s.hard))}%
            </span>
            <span className={onTarget ? "text-positive" : "text-amber"}>
              {onTarget ? "On target" : "Too much grey zone"}
            </span>
          </div>
        ) : undefined
      }
    >
      {!s || total === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="mb-3 text-[46px] font-semibold leading-none tracking-tight tabular-nums">
            {Math.round(easyPct)}
            <span className="ml-1.5 text-base font-medium text-text-muted">% easy</span>
          </div>
          <div className="relative">
            <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
              <i style={{ width: `${pct(s.easy)}%`, background: "#b6f35a" }} />
              <i style={{ width: `${pct(s.moderate)}%`, background: "#ffb938" }} />
              <i style={{ width: `${pct(s.hard)}%`, background: "#ff7a45" }} />
            </div>
            <div
              className="absolute -inset-y-[3px] border-l border-dashed border-text-soft"
              style={{ left: `${EASY_TARGET_PCT}%` }}
              title={`${EASY_TARGET_PCT}% easy target`}
            />
          </div>
        </>
      )}
    </MixCard>
  );
}

// ---- 5. training effect mix ------------------------------------------------------

const TE_COLORS = ["#a27bff", "#ff4d8d", "#ffb938", "#38d6ff", "#b6f35a", "#ff7a45"];
const prettyLabel = (l: string) => {
  const t = l.replace(/_/g, " ").toLowerCase();
  return t.charAt(0).toUpperCase() + t.slice(1);
};

export function TrainingEffectCard({ activities }: { activities: DashboardActivity[] | null }) {
  const mix = activities ? trainingEffectMix(activities) : null;
  const total = mix?.reduce((s, m) => s + m.count, 0) ?? 0;
  const top = mix?.slice(0, 3) ?? [];

  return (
    <MixCard
      accent="#ff4d8d"
      label="Run types"
      footer={
        mix && total > 0
          ? `${total} run${total === 1 ? "" : "s"} · ${mix.length} type${mix.length === 1 ? "" : "s"}`
          : undefined
      }
    >
      {!mix || total === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="mb-3 truncate text-[28px] font-semibold leading-none tracking-tight">
            {prettyLabel(mix[0].label)}
          </div>
          <div className="flex flex-col gap-2.5">
            {top.map((m, i) => (
              <div key={m.label} className="flex items-center gap-2 text-xs text-text-muted">
                <span className="w-[78px] shrink-0 truncate">{prettyLabel(m.label)}</span>
                <div className="h-[7px] flex-1 rounded-full bg-surface-hover">
                  <i
                    className="block h-full rounded-full"
                    style={{ width: `${(m.count / mix[0].count) * 100}%`, background: TE_COLORS[i % TE_COLORS.length] }}
                  />
                </div>
                <b className="w-4 text-right font-semibold tabular-nums text-text-soft">{m.count}</b>
              </div>
            ))}
          </div>
        </>
      )}
    </MixCard>
  );
}
