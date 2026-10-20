"use client";

import { useEffect, useState } from "react";

/** Derived numbers under the Body & heart rate fields: BMI, HR reserve,
 * easy-run ceiling and the five heart-rate zones (Karvonen / heart-rate
 * reserve method: resting + 50/60/70/80/90/100% of max − resting).
 * Zones are read-only until "Edit" is pressed. */

export function ageFromDob(dob: string | null | undefined): number | null {
  if (!dob || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const [y, m, d] = dob.split("-").map(Number);
  const now = new Date();
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age >= 0 && age < 130 ? age : null;
}

function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return "Underweight";
  if (bmi < 25) return "Healthy range";
  if (bmi < 30) return "Overweight";
  return "Obese range";
}

const ZONES = [
  { name: "Z1", label: "Warm up", color: "#6E6A9E", from: 0.5 },
  { name: "Z2", label: "Easy", color: "#38D6FF", from: 0.6 },
  { name: "Z3", label: "Aerobic", color: "#B6F35A", from: 0.7 },
  { name: "Z4", label: "Threshold", color: "#FFB938", from: 0.8 },
  { name: "Z5", label: "Maximum", color: "#FF4D8D", from: 0.9 },
];

/** Calculated zone boundaries: 6 numbers, so zone i spans [b[i], b[i+1]]
 * (the last one is max HR). Neighbouring zones share a boundary. */
function autoBounds(resting: number, max: number): number[] {
  const reserve = max - resting;
  return [...ZONES.map((z) => Math.round(resting + z.from * reserve)), max];
}

const MIN_HR = 30;
const CAP_HR = 250;
const STORAGE_KEY = "runiq.hrZoneStarts";

/** Boundaries forced to be strictly increasing, within [MIN_HR, CAP_HR]. */
function sanitize(bounds: number[]): number[] {
  const out: number[] = [];
  bounds.forEach((v, i) => {
    const lo = i === 0 ? MIN_HR : out[i - 1] + 1;
    const hi = CAP_HR - (bounds.length - 1 - i); // leave room for the boundaries above
    out.push(Math.max(lo, Math.min(hi, Math.round(v))));
  });
  return out;
}

function Tile({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-hover px-3.5 py-3">
      <small className="text-[11px] font-semibold uppercase tracking-[0.06em] text-text-muted">{label}</small>
      <b className="mt-1 block text-xl font-semibold">{value}</b>
      <span className="text-xs text-text-muted">{note}</span>
    </div>
  );
}

/** One editable zone bound; commits on blur / Enter. */
function BoundInput({
  value,
  edited,
  onCommit,
  label,
}: {
  value: number;
  edited: boolean;
  onCommit: (v: number) => void;
  label: string;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const n = Number(text);
    if (text.trim() === "" || Number.isNaN(n)) setText(String(value));
    else onCommit(n);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      maxLength={3}
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
      onBlur={commit}
      onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
      className={
        "h-7 w-[52px] min-w-0 rounded-md border bg-bg px-1.5 text-[13px] font-semibold text-text outline-none focus:border-violet " +
        (edited ? "border-amber" : "border-border-strong")
      }
    />
  );
}

const smallBtn =
  "rounded-md border border-border-strong px-2 py-0.5 text-xs text-text-soft hover:text-text";

export default function BodyMetrics({
  heightCm,
  weightKg,
  restingHr,
  maxHr,
}: {
  heightCm: number | null;
  weightKg: number | null;
  restingHr: number | null;
  maxHr: number | null;
}) {
  const bmi = heightCm && weightKg && heightCm > 0 ? weightKg / (heightCm / 100) ** 2 : null;
  const hrOk = restingHr != null && maxHr != null && maxHr > restingHr;
  const [editing, setEditing] = useState(false);

  // Custom zone boundaries are display-only: kept in this browser, never sent to the
  // backend, and nothing else in the app reads them.
  const [custom, setCustom] = useState<number[] | null>(null);
  useEffect(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
      if (Array.isArray(raw) && raw.every((n) => Number.isFinite(n))) {
        // Older saves only had the 5 zone starts; the top boundary then followed max HR.
        if (raw.length === ZONES.length + 1) setCustom(raw);
        else if (raw.length === ZONES.length && maxHr != null) setCustom([...raw, maxHr]);
      }
    } catch {
      /* storage unavailable or corrupt: fall back to calculated zones */
    }
  }, []);

  const auto = hrOk ? autoBounds(restingHr, maxHr) : null;
  const bounds = hrOk && auto ? (custom ? sanitize(custom) : auto) : null;
  const isCustom = !!(bounds && auto && bounds.some((v, i) => v !== auto[i]));

  function save(next: number[] | null) {
    setCustom(next);
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* not persisted this session */
    }
  }

  /** Set boundary `i` (0 = Z1 start ... 5 = Z5 end); the zones either side move with it. */
  function setBound(i: number, value: number) {
    if (!bounds || !auto) return;
    const next = sanitize(bounds.map((v, j) => (j === i ? value : v)));
    save(next.every((v, j) => v === auto[j]) ? null : next);
  }

  return (
    <>
      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile label="BMI" value={bmi ? bmi.toFixed(1) : "--"} note={bmi ? bmiLabel(bmi) : "Needs height and weight"} />
        <Tile
          label="HR reserve"
          value={hrOk ? `${maxHr - restingHr} bpm` : "--"}
          note={hrOk ? "Max − resting" : "Needs resting and max HR"}
        />
        <Tile
          label="Easy-run ceiling"
          value={bounds ? `${bounds[2]} bpm` : "--"}
          note={bounds ? "Top of Zone 2" : "Needs resting and max HR"}
        />
      </div>

      <div className="mt-5 border-t border-border pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <b className="text-[13.5px] font-semibold">Your heart-rate zones</b>
          <span className="flex items-center gap-2.5 text-xs text-text-muted">
            {editing
              ? "Edit any bound · neighbouring zones move with it"
              : isCustom
                ? "Custom zones · saved on this device"
                : "Heart-rate reserve method · updates as you type"}
            {bounds && editing && isCustom && (
              <button type="button" onClick={() => save(null)} className={smallBtn}>
                Reset
              </button>
            )}
            {bounds && (
              <button
                type="button"
                onClick={() => setEditing((v) => !v)}
                className={editing ? smallBtn + " !border-violet !text-text" : smallBtn}
              >
                {editing ? "Done" : "Edit"}
              </button>
            )}
          </span>
        </div>
        {bounds && auto ? (
          <>
            <div className="flex h-[34px] gap-[3px]">
              {ZONES.map((z) => (
                <div
                  key={z.name}
                  className="flex flex-1 flex-col justify-center rounded-[7px] px-2.5 text-[11px] font-bold text-[#14102a]"
                  style={{ background: z.color }}
                >
                  {z.name}
                </div>
              ))}
            </div>
            <div className="mt-[7px] flex gap-[3px]">
              {ZONES.map((z, i) => (
                <div key={z.name} className="flex-1 text-[11.5px] text-text-muted">
                  {z.label}
                  {editing ? (
                    <div className="mt-1 flex items-center gap-1 text-[13px] font-semibold text-text">
                      <BoundInput
                        label={`${z.name} lower bound`}
                        value={bounds[i]}
                        edited={bounds[i] !== auto[i]}
                        onCommit={(v) => setBound(i, v)}
                      />
                      <span className="text-text-muted">–</span>
                      <BoundInput
                        label={`${z.name} upper bound`}
                        value={bounds[i + 1]}
                        edited={bounds[i + 1] !== auto[i + 1]}
                        onCommit={(v) => setBound(i + 1, v)}
                      />
                    </div>
                  ) : (
                    <>
                      <br />
                      <b className="font-semibold text-text">
                        {bounds[i]}–{bounds[i + 1]}
                      </b>
                    </>
                  )}
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-[12.5px] text-text-muted">Enter a resting HR below your max HR to see your zones.</p>
        )}
      </div>
    </>
  );
}
