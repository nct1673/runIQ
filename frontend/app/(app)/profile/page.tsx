"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { bestVdot, type PersonalRecord } from "@/components/analytics/records";
import Header from "@/components/Header";
import BodyMetrics, { ageFromDob } from "@/components/profile/BodyMetrics";
import { btnClass, btnPrimaryClass, CARD, Field, Input, SectionHead, Segmented } from "@/components/profile/Fields";

/** Profile & settings (design: runIQ_draft/profile_design.html). */

interface Profile {
  display_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  resting_hr: number | null;
  max_hr: number | null;
  unit_system: string;
  timezone: string | null;
}

const EMPTY_PROFILE: Profile = {
  display_name: "",
  date_of_birth: "",
  sex: "",
  height_cm: null,
  weight_kg: null,
  resting_hr: null,
  max_hr: null,
  unit_system: "metric",
  timezone: "",
};

const FIELD_LABEL: Record<keyof Profile, string> = {
  display_name: "Display name",
  date_of_birth: "Date of birth",
  sex: "Sex",
  height_cm: "Height",
  weight_kg: "Weight",
  resting_hr: "Resting HR",
  max_hr: "Max HR",
  unit_system: "Units",
  timezone: "Timezone",
};

const SECTIONS = [
  {
    id: "basic",
    label: "Basic info",
    fields: ["display_name", "date_of_birth", "sex"] as (keyof Profile)[],
    icon: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0116 0" /></>,
  },
  {
    id: "body",
    label: "Body & heart rate",
    fields: ["height_cm", "weight_kg", "resting_hr", "max_hr"] as (keyof Profile)[],
    icon: <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />,
  },
  {
    id: "prefs",
    label: "Preferences",
    fields: ["unit_system", "timezone"] as (keyof Profile)[],
    icon: <path d="M4 6h16M4 12h10M4 18h7" />,
  },
  {
    id: "security",
    label: "Security",
    fields: [] as (keyof Profile)[],
    icon: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></>,
  },
];

const num = (v: string): number | null => (v === "" || Number.isNaN(Number(v)) ? null : Number(v));

function initials(name: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  return parts.length ? parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("") : "RQ";
}

function gmtOffset(tz: string | null): string {
  if (!tz) return "";
  try {
    return (
      new Intl.DateTimeFormat("en", { timeZone: tz, timeZoneName: "shortOffset" })
        .formatToParts(new Date())
        .find((p) => p.type === "timeZoneName")?.value ?? ""
    );
  } catch {
    return ""; // not a valid IANA zone
  }
}

function normalize(data: Profile): Profile {
  return {
    ...data,
    display_name: data.display_name ?? "",
    date_of_birth: data.date_of_birth ?? "",
    sex: data.sex ?? "",
    timezone: data.timezone ?? "",
  };
}

interface RunRow {
  started_at: string;
  distance_km: number;
}

export default function ProfilePage() {
  const [saved, setSaved] = useState<Profile>(EMPTY_PROFILE);
  const [draft, setDraft] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [records, setRecords] = useState<PersonalRecord[] | null>(null);
  const [active, setActive] = useState("basic");

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => res.json())
      .then((data: Profile) => {
        const p = normalize(data);
        setSaved(p);
        setDraft(p);
      })
      .finally(() => setLoading(false));
    // Header stats are decoration: a failed fetch just shows "--".
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then(setRuns)
      .catch(() => setRuns(null));
    fetch("/api/personal-records")
      .then((r) => (r.ok ? r.json() : null))
      .then(setRecords)
      .catch(() => setRecords(null));
  }, []);

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setDraft((p) => ({ ...p, [key]: value }));
    setStatus(null);
  }

  const changed = useMemo(
    () => (Object.keys(FIELD_LABEL) as (keyof Profile)[]).filter((k) => draft[k] !== saved[k]),
    [draft, saved],
  );
  const isDirty = (k: keyof Profile) => changed.includes(k);

  // Highlight the sidebar entry of the section nearest the top while scrolling.
  const visible = useRef(new Set<string>());
  useEffect(() => {
    if (loading) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) (e.isIntersecting ? visible.current.add(e.target.id) : visible.current.delete(e.target.id));
        const first = SECTIONS.find((s) => visible.current.has(s.id));
        if (first) setActive(first.id);
      },
      { rootMargin: "-10% 0px -60% 0px" },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [loading]);

  useEffect(() => {
    if (!status?.ok) return;
    const t = setTimeout(() => setStatus(null), 3000);
    return () => clearTimeout(t);
  }, [status]);

  async function handleSave() {
    setSaving(true);
    setStatus(null);

    // Empty strings -> null for optional fields.
    const payload = {
      ...draft,
      display_name: draft.display_name || null,
      date_of_birth: draft.date_of_birth || null,
      sex: draft.sex || null,
      timezone: draft.timezone || null,
    };

    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSaved(draft);
      setStatus({ ok: true, text: "Saved" });
    } catch (err) {
      setStatus({ ok: false, text: `Failed to save: ${(err as Error).message}` });
    } finally {
      setSaving(false);
    }
  }

  function goTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setActive(id);
  }

  if (loading) {
    return (
      <div>
        <Header eyebrow="Settings" title="Profile" />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  const age = ageFromDob(draft.date_of_birth);
  const sexValue = draft.sex === "male" || draft.sex === "female" ? draft.sex : "";
  const totalKm = runs?.reduce((s, r) => s + r.distance_km, 0) ?? 0;
  const since = runs?.length
    ? new Date(Math.min(...runs.map((r) => new Date(r.started_at).getTime()))).toLocaleDateString(undefined, {
        month: "short",
        year: "numeric",
      })
    : null;
  const vdot = bestVdot(records);
  const zones = draft.timezone && gmtOffset(draft.timezone) ? draft.timezone : null;
  const timezones = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.("timeZone") ?? [];

  return (
    <div className="pb-28">
      <Header
        eyebrow="Settings"
        title="Profile"
        subtitle="Your details, body data and preferences. These make your zones, calories and coach advice accurate."
      />

      <div className="mt-[26px] grid grid-cols-1 items-start gap-9 lg:grid-cols-[230px_1fr]">
        <nav aria-label="Profile sections" className="sticky top-5 hidden flex-col gap-1 lg:flex">
          {SECTIONS.map((s) => {
            const on = active === s.id;
            const dirty = s.fields.some(isDirty);
            return (
              <a
                key={s.id}
                href={`#${s.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  goTo(s.id);
                }}
                className={
                  "flex items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[13.5px] " +
                  (on
                    ? "bg-surface-hover font-semibold text-text shadow-[inset_0_0_0_1px_var(--color-border-strong)]"
                    : "text-text-muted hover:text-text-soft")
                }
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
                  {s.icon}
                </svg>
                {s.label}
                {dirty && <span className="ml-auto h-[7px] w-[7px] rounded-full bg-amber" />}
              </a>
            );
          })}
        </nav>

        <div className="flex max-w-[900px] flex-col gap-[18px]">
          {/* Identity */}
          <section className="flex flex-wrap items-center gap-[22px] rounded-2xl border border-violet/30 bg-[radial-gradient(520px_260px_at_100%_0%,rgba(255,77,141,0.14),transparent_65%),radial-gradient(480px_240px_at_0%_100%,rgba(122,92,255,0.18),transparent_65%),#17143a] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.2)]">
            <div className="grid h-[84px] w-[84px] place-items-center rounded-full bg-[linear-gradient(135deg,#38d6ff,#a27bff_60%,#ff4d8d)] text-3xl font-bold">
              {initials(draft.display_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-2xl font-semibold tracking-[-0.01em]">{draft.display_name || "Your name"}</h2>
              <div className="mt-[5px] text-[13px] text-text-soft">
                {[since ? `Runner since ${since}` : null, draft.timezone || null].filter(Boolean).join(" · ") || "Add your details below"}
              </div>
            </div>
            <div className="ml-auto flex [&>div]:border-l [&>div]:border-white/10 [&>div]:px-[22px] [&>div]:text-right [&>div:first-child]:border-l-0">
              <Stat label="Runs" value={runs ? String(runs.length) : "--"} />
              <Stat label="Distance" value={runs ? `${Math.round(totalKm).toLocaleString()} km` : "--"} />
              <Stat label="VDOT" value={vdot ? vdot.vdot.toFixed(1) : "--"} />
            </div>
          </section>

          <section id="basic" className={CARD}>
            <SectionHead title="Basic info">Age and sex are used to estimate calories and VO₂ max.</SectionHead>
            <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <Field label="Display name" htmlFor="display_name" edited={isDirty("display_name")}>
                <Input
                  id="display_name"
                  value={draft.display_name ?? ""}
                  onChange={(v) => field("display_name", v)}
                  dirty={isDirty("display_name")}
                />
              </Field>
              <Field label="Date of birth" htmlFor="date_of_birth" edited={isDirty("date_of_birth")}>
                <Input
                  id="date_of_birth"
                  type="date"
                  value={draft.date_of_birth ?? ""}
                  onChange={(v) => field("date_of_birth", v)}
                  dirty={isDirty("date_of_birth")}
                  right={age != null ? <span className="text-[12.5px] text-text-muted">Age {age}</span> : undefined}
                />
              </Field>
              <Field label="Sex" edited={isDirty("sex")}>
                <Segmented
                  label="Sex"
                  value={sexValue}
                  onChange={(v) => field("sex", v)}
                  dirty={isDirty("sex")}
                  options={[
                    { value: "male", label: "Male" },
                    { value: "female", label: "Female" },
                    { value: "", label: "Prefer not to say" },
                  ]}
                />
              </Field>
            </div>
          </section>

          <section id="body" className={CARD}>
            <SectionHead title="Body & heart rate">
              Your heart-rate zones are calculated from resting and max HR. Update them when they change for more accurate effort
              tracking.
            </SectionHead>
            <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <Field label="Height" htmlFor="height_cm" edited={isDirty("height_cm")}>
                <Input
                  id="height_cm"
                  type="number"
                  step="0.1"
                  unit="cm"
                  value={draft.height_cm ?? ""}
                  onChange={(v) => field("height_cm", num(v))}
                  dirty={isDirty("height_cm")}
                />
              </Field>
              <Field
                label="Weight"
                htmlFor="weight_kg"
                edited={isDirty("weight_kg")}
                help={isDirty("weight_kg") && saved.weight_kg != null ? `Was ${saved.weight_kg} kg` : undefined}
              >
                <Input
                  id="weight_kg"
                  type="number"
                  step="0.1"
                  unit="kg"
                  value={draft.weight_kg ?? ""}
                  onChange={(v) => field("weight_kg", num(v))}
                  dirty={isDirty("weight_kg")}
                />
              </Field>
              <Field
                label="Resting HR"
                htmlFor="resting_hr"
                edited={isDirty("resting_hr")}
                help="Measure first thing in the morning"
              >
                <Input
                  id="resting_hr"
                  type="number"
                  unit="bpm"
                  value={draft.resting_hr ?? ""}
                  onChange={(v) => field("resting_hr", num(v))}
                  dirty={isDirty("resting_hr")}
                />
              </Field>
              <Field
                label="Max HR"
                htmlFor="max_hr"
                edited={isDirty("max_hr")}
                help={
                  age != null ? (
                    <span>
                      Age estimate is <b className="font-semibold text-text">{220 - age}</b>. A measured value is more accurate.
                    </span>
                  ) : undefined
                }
              >
                <Input
                  id="max_hr"
                  type="number"
                  unit="bpm"
                  value={draft.max_hr ?? ""}
                  onChange={(v) => field("max_hr", num(v))}
                  dirty={isDirty("max_hr")}
                />
              </Field>
            </div>
            <BodyMetrics
              heightCm={draft.height_cm}
              weightKg={draft.weight_kg}
              restingHr={draft.resting_hr}
              maxHr={draft.max_hr}
            />
          </section>

          <section id="prefs" className={CARD}>
            <SectionHead title="Preferences">How distances, paces and dates are shown across the app.</SectionHead>
            <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
              <Field label="Units" edited={isDirty("unit_system")}>
                <Segmented
                  label="Units"
                  value={draft.unit_system === "imperial" ? "imperial" : "metric"}
                  onChange={(v) => field("unit_system", v)}
                  dirty={isDirty("unit_system")}
                  options={[
                    { value: "metric", label: "Metric · km, kg" },
                    { value: "imperial", label: "Imperial · mi, lb" },
                  ]}
                />
              </Field>
              <Field
                label="Timezone"
                htmlFor="timezone"
                edited={isDirty("timezone")}
                help={draft.timezone && !zones ? "Not a recognised timezone, e.g. Asia/Kuala_Lumpur" : undefined}
              >
                <Input
                  id="timezone"
                  list="timezone-options"
                  placeholder="e.g. Asia/Kuala_Lumpur"
                  value={draft.timezone ?? ""}
                  onChange={(v) => field("timezone", v)}
                  dirty={isDirty("timezone")}
                  right={zones ? <span className="text-[12.5px] text-text-muted">{gmtOffset(zones)}</span> : undefined}
                />
                <datalist id="timezone-options">
                  {timezones.map((tz) => (
                    <option key={tz} value={tz} />
                  ))}
                </datalist>
              </Field>
            </div>
          </section>

          <PasswordCard />
        </div>
      </div>

      {(changed.length > 0 || status) && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-20 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 items-center gap-4 rounded-2xl border border-border-strong bg-[#1e1c3d] py-3 pl-5 pr-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] lg:ml-[38px]"
        >
          <span className="flex items-center gap-2 text-[13.5px] text-text-soft">
            {changed.length > 0 ? (
              <>
                <i className="h-2 w-2 rounded-full bg-amber" />
                <b className="font-semibold text-text">
                  {changed.length} unsaved change{changed.length === 1 ? "" : "s"}
                </b>
                <span className="hidden sm:inline">· {changed.map((k) => FIELD_LABEL[k]).join(", ")}</span>
              </>
            ) : (
              <span className={status?.ok ? "text-positive" : "text-negative"}>{status?.text}</span>
            )}
          </span>
          {changed.length > 0 && (
            <>
              {status && !status.ok && <span className="text-[13px] text-negative">{status.text}</span>}
              <button
                type="button"
                onClick={() => {
                  setDraft(saved);
                  setStatus(null);
                }}
                className={btnClass + " !h-[38px]"}
              >
                Discard
              </button>
              <button type="button" onClick={handleSave} disabled={saving} className={btnPrimaryClass + " !h-[38px]"}>
                {saving ? "Saving..." : "Save changes"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <small className="block text-[11px] font-semibold uppercase tracking-[0.07em] text-text-muted">{label}</small>
      <b className="mt-1 block text-xl font-semibold">{value}</b>
    </div>
  );
}

function EyeButton({ shown, onClick }: { shown: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={shown ? "Hide password" : "Show password"}
      className="text-text-muted hover:text-text"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
        {shown ? (
          <path d="M3 3l18 18M10.6 10.6a3 3 0 004.2 4.2M9.9 5.1A9.7 9.7 0 0112 5c6 0 10 7 10 7a17 17 0 01-3.2 4M6.1 6.1A17 17 0 002 12s4 7 10 7a9.6 9.6 0 004.1-.9" />
        ) : (
          <>
            <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
            <circle cx="12" cy="12" r="3" />
          </>
        )}
      </svg>
    </button>
  );
}

/** 0-4: length >= 8, length >= 12, upper + lower case, digit + symbol. */
function passwordStrength(pw: string): number {
  return [pw.length >= 8, pw.length >= 12, /[a-z]/.test(pw) && /[A-Z]/.test(pw), /\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)].filter(Boolean)
    .length;
}

const STRENGTH_COLOR = ["", "#ff5a6a", "#ffb938", "#b6f35a", "#b6f35a"];

function PasswordCard(): ReactNode {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const strength = passwordStrength(newPassword);
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 8 && !saving;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.detail ?? "Failed to change password");
      }
      setStatus({ ok: true, text: "Password changed." });
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setStatus({ ok: false, text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="security" className={CARD}>
      <SectionHead title="Password">Saved separately from your profile.</SectionHead>
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 gap-x-5 gap-y-[18px] sm:grid-cols-2">
          <Field label="Current password" htmlFor="current_password">
            <Input
              id="current_password"
              type={showCurrent ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              value={currentPassword}
              onChange={setCurrentPassword}
              right={<EyeButton shown={showCurrent} onClick={() => setShowCurrent((v) => !v)} />}
            />
          </Field>
          <Field label="New password" htmlFor="new_password">
            <Input
              id="new_password"
              type={showNew ? "text" : "password"}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              value={newPassword}
              onChange={setNewPassword}
              right={<EyeButton shown={showNew} onClick={() => setShowNew((v) => !v)} />}
            />
            <div className="mt-[9px] flex gap-1" aria-hidden>
              {[1, 2, 3, 4].map((i) => (
                <i
                  key={i}
                  className="h-1 flex-1 rounded-sm bg-border-strong"
                  style={i <= strength ? { background: STRENGTH_COLOR[strength] } : undefined}
                />
              ))}
            </div>
          </Field>
        </div>
        <div className="mt-[18px] flex items-center gap-3">
          <button type="submit" disabled={!canSubmit} className={btnClass}>
            {saving ? "Saving..." : "Update password"}
          </button>
          {status && <span className={"text-sm " + (status.ok ? "text-positive" : "text-negative")}>{status.text}</span>}
        </div>
      </form>
    </section>
  );
}
