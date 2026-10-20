"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";

import DatePicker from "@/components/DatePicker";
import { ClockIcon, CloseIcon, PinIcon } from "@/components/icons";
import { PR_TYPES, type PersonalRecord, type RaceFormValues } from "@/components/race/types";
import { formatDuration, formatPace, parseDurationInput } from "@/lib/format";
import { equivalentTimeS, vdotScore } from "@/lib/vdot";

/** Add / edit race side drawer (design: runIQ_draft/race_design.html,
 * the #add state). Pure form: the parent owns the request. */

const DISTANCES: { value: string; label: string; sub?: string }[] = [
  { value: "5", label: "5K" },
  { value: "10", label: "10K" },
  { value: "21.0975", label: "Half", sub: "21.1 km" },
  { value: "42.195", label: "Full", sub: "42.2 km" },
];

const PRIORITIES: { value: "A" | "B" | "C"; name: string; hint: string; chip: string }[] = [
  { value: "A", name: "Goal race", hint: "Full taper, peak effort", chip: "bg-brand text-white" },
  { value: "B", name: "Tune-up", hint: "Short taper, hard effort", chip: "bg-violet/25 text-[#c9b6ff]" },
  { value: "C", name: "Training", hint: "Run through it", chip: "bg-blue/20 text-blue" },
];

const fieldClass =
  "h-11 w-full rounded-[11px] border border-border-strong bg-bg px-3.5 text-sm text-text outline-none placeholder:text-text-muted focus:border-violet focus:shadow-[0_0_0_3px_rgba(162,123,255,0.2)]";

function presetOf(distanceKm: string): string {
  if (!distanceKm) return "";
  const n = Number(distanceKm);
  if (Number.isNaN(n)) return "custom";
  const hit = DISTANCES.find((d) => Math.abs(Number(d.value) - n) < 0.05);
  return hit ? hit.value : "custom";
}

function Field({ label, optional, children }: { label: string; optional?: boolean; children: ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-[12.5px] font-semibold text-text-soft">
        {label}
        {optional && <em className="ml-1 font-normal not-italic text-text-muted">optional</em>}
      </div>
      {children}
    </div>
  );
}

function segClass(on: boolean): string {
  return (
    "rounded-[11px] border text-[13px] transition-colors " +
    (on
      ? "border-violet bg-violet/15 font-semibold text-text"
      : "border-border-strong text-text-soft hover:bg-surface-hover")
  );
}

/** Suggested goal: the user's best PR-derived VDOT projected to this distance. */
function suggestGoalS(prs: PersonalRecord[], km: number): number | null {
  let best: number | null = null;
  for (const t of PR_TYPES) {
    const pr = prs.find((p) => p.type_id === t.type_id && p.metric === "time_s");
    if (!pr) continue;
    const v = vdotScore(t.km * 1000, pr.value);
    if (best == null || v > best) best = v;
  }
  if (best == null) return null;
  const raw = equivalentTimeS(best, km * 1000);
  return raw >= 3600 ? Math.round(raw / 60) * 60 : Math.round(raw / 10) * 10;
}

function formatSuggestion(s: number): string {
  if (s >= 3600) {
    const h = Math.floor(s / 3600);
    const m = Math.round((s % 3600) / 60);
    return `${h}:${String(m).padStart(2, "0")}`;
  }
  return formatDuration(s);
}

export default function RaceDrawer({
  mode,
  initial,
  prs,
  submitting,
  serverError,
  onCancel,
  onSubmit,
}: {
  mode: "add" | "edit";
  initial: RaceFormValues;
  prs: PersonalRecord[];
  submitting: boolean;
  serverError: string | null;
  onCancel: () => void;
  onSubmit: (values: RaceFormValues) => void;
}) {
  const [values, setValues] = useState(initial);
  const [preset, setPreset] = useState(() => presetOf(initial.distance_km));
  const [formError, setFormError] = useState<string | null>(null);

  function set<K extends keyof RaceFormValues>(key: K, value: RaceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function pickDistance(p: string) {
    setPreset(p);
    set("distance_km", p === "custom" ? "" : p);
  }

  const km = Number(values.distance_km);
  const goalS = values.goal_time ? parseDurationInput(values.goal_time) : null;
  const prForDistance = useMemo(() => {
    const t = PR_TYPES.find((x) => Math.abs(x.km - km) < 0.05);
    return t ? (prs.find((p) => p.type_id === t.type_id && p.metric === "time_s")?.value ?? null) : null;
  }, [prs, km]);
  const suggestion = useMemo(() => (km > 0 ? suggestGoalS(prs, km) : null), [prs, km]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!values.name.trim()) return setFormError("Race name is required.");
    if (!values.distance_km || km <= 0) return setFormError("Pick a distance (or enter a custom one).");
    if (!values.race_date) return setFormError("Race date is required.");
    if (values.goal_time && goalS == null) return setFormError('Goal time must look like "1:45:00" or "45:00".');
    if (values.status === "completed" && values.actual_time && parseDurationInput(values.actual_time) == null) {
      return setFormError('Result must look like "1:45:00" or "45:00".');
    }
    onSubmit(values);
  }

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-[rgba(5,4,14,0.66)] backdrop-blur-[2px]"
        onClick={onCancel}
        aria-hidden
      />
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-label={mode === "add" ? "Add a race" : "Edit race"}
        className="absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col border-l border-border-strong bg-[#13122a] shadow-[-30px_0_60px_rgba(0,0,0,0.4)]"
      >
        <div className="flex items-center justify-between border-b border-border px-7 py-6">
          <div>
            <b className="text-xl font-semibold">{mode === "add" ? "Add a race" : "Edit race"}</b>
            <span className="mt-[3px] block text-[12.5px] font-normal text-text-muted">
              {mode === "add"
                ? "It appears on your dashboard countdown and coach plans."
                : "Update the details, goal or result."}
            </span>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="grid h-[34px] w-[34px] place-items-center rounded-[9px] border border-border text-text-muted hover:text-text"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-7 py-[22px]">
          <Field label="Race name">
            <input
              className={fieldClass}
              placeholder="e.g. Kuala Lumpur Standard Chartered Marathon 2027"
              value={values.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </Field>

          <Field label="Distance">
            <div className="grid grid-cols-5 gap-1.5">
              {[...DISTANCES, { value: "custom", label: "Custom", sub: undefined }].map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => pickDistance(d.value)}
                  className={segClass(preset === d.value) + " h-11 leading-tight"}
                >
                  {d.label}
                  {d.sub && <small className="block text-[10.5px] font-normal text-text-muted">{d.sub}</small>}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <input
                type="number"
                step="any"
                min="0"
                className={fieldClass + " mt-2"}
                placeholder="Distance in km, e.g. 15.3"
                value={values.distance_km}
                onChange={(e) => set("distance_km", e.target.value)}
              />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3.5">
            <Field label="Date">
              <DatePicker variant="drawer" value={values.race_date} onChange={(v) => set("race_date", v)} />
            </Field>
            <Field label="Flag-off time" optional>
              <div className="relative">
                <ClockIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <input
                  type="time"
                  className={fieldClass + " pl-10 [color-scheme:dark]"}
                  value={values.race_time}
                  onChange={(e) => set("race_time", e.target.value)}
                />
              </div>
            </Field>
          </div>

          <Field label="Location">
            <div className="relative">
              <PinIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                className={fieldClass + " pl-10"}
                placeholder="e.g. Kuala Lumpur"
                value={values.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
          </Field>

          <Field label="Priority">
            <div className="grid grid-cols-3 gap-1.5">
              {PRIORITIES.map((p) => {
                const on = values.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    aria-pressed={on}
                    // Priority is optional: clicking the selected one clears it.
                    onClick={() => set("priority", on ? "" : p.value)}
                    className={segClass(on) + " h-[62px] px-3.5 text-left"}
                  >
                    <b className="mb-1 flex items-center gap-2 text-[13px]">
                      <span
                        className={
                          "grid h-[22px] w-[22px] place-items-center rounded-[7px] text-[10.5px] font-extrabold " + p.chip
                        }
                      >
                        {p.value}
                      </span>
                      {p.name}
                    </b>
                    <small className="block text-[11px] font-normal text-text-muted">{p.hint}</small>
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label="Goal time" optional>
            <input
              className={fieldClass}
              placeholder="e.g. 2:10:00"
              value={values.goal_time}
              onChange={(e) => set("goal_time", e.target.value)}
            />
            {(goalS != null && km > 0) || suggestion != null ? (
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-text-muted">
                <span>
                  {goalS != null && km > 0 && (
                    <>
                      = <b className="text-text">{formatPace(goalS / km).replace("/km", " /km")}</b>
                      {prForDistance != null &&
                        (goalS === prForDistance
                          ? " · same as your PR"
                          : ` · ${formatDuration(Math.abs(prForDistance - goalS))} ${
                              goalS < prForDistance ? "faster" : "slower"
                            } than your PR`)}
                    </>
                  )}
                </span>
                {suggestion != null && (
                  <button
                    type="button"
                    onClick={() => set("goal_time", formatDuration(suggestion))}
                    className="shrink-0 rounded-[7px] bg-violet/15 px-[9px] py-1 text-xs font-semibold text-[#c9b6ff] hover:bg-violet/25"
                  >
                    Suggested {formatSuggestion(suggestion)} from your fitness
                  </button>
                )}
              </div>
            ) : null}
          </Field>

          {mode === "edit" && (
            <Field label="Status">
              <div className="grid grid-cols-2 gap-1.5">
                {(["upcoming", "completed"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => set("status", s)}
                    className={segClass(values.status === s) + " h-11 capitalize"}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {values.status === "completed" && (
                <input
                  className={fieldClass + " mt-2"}
                  placeholder="Result, e.g. 1:48:30"
                  value={values.actual_time}
                  onChange={(e) => set("actual_time", e.target.value)}
                />
              )}
            </Field>
          )}

          <Field label="Notes" optional>
            <textarea
              rows={3}
              className={fieldClass + " h-auto resize-none py-3"}
              placeholder="Course notes, registration link, bib pickup…"
              value={values.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>

          {(formError || serverError) && <p className="text-sm text-negative">{formError ?? serverError}</p>}
        </div>

        <div className="flex items-center justify-between border-t border-border px-7 py-[18px]">
          <span className="text-xs text-text-muted">
            {mode === "add" ? "Saved as upcoming — mark it completed after race day." : ""}
          </span>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              className="h-[42px] rounded-[11px] border border-border-strong px-[18px] text-[13.5px] text-text-soft hover:text-text"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] rounded-[11px] bg-[linear-gradient(135deg,#a27bff,#ff4d8d)] px-4 text-[13.5px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? "Saving..." : "Save race"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
