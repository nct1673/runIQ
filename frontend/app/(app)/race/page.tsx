"use client";

import { useEffect, useState } from "react";

import Card, { EmptyPlaceholder } from "@/components/Card";
import Header from "@/components/Header";
import { ChevronDownIcon, FlagIcon, PlusIcon, TrophyIcon } from "@/components/icons";
import { formatDuration, formatPace, parseDurationInput } from "@/lib/format";

interface Race {
  id: string;
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
  location: string | null;
  notes: string | null;
  goal_time_s: number | null;
  priority: "A" | "B" | "C" | null;
  status: "upcoming" | "completed";
  actual_time_s: number | null;
  created_at: string;
}

interface RaceFormValues {
  name: string;
  distance_km: string;
  race_date: string;
  location: string;
  notes: string;
  goal_time: string;
  priority: "" | "A" | "B" | "C";
  status: "upcoming" | "completed";
  actual_time: string;
}

const EMPTY_FORM: RaceFormValues = {
  name: "",
  distance_km: "",
  race_date: "",
  location: "",
  notes: "",
  goal_time: "",
  priority: "",
  status: "upcoming",
  actual_time: "",
};

const PRIORITY_LABEL: Record<string, string> = { A: "A-race (goal)", B: "B-race", C: "C-race" };
const PRIORITY_COLOR: Record<string, string> = {
  A: "bg-brand text-white",
  B: "bg-stat-time text-white",
  C: "bg-surface-hover text-text-muted",
};

function raceToForm(race: Race): RaceFormValues {
  return {
    name: race.name,
    distance_km: String(race.distance_km),
    race_date: race.race_date,
    location: race.location ?? "",
    notes: race.notes ?? "",
    goal_time: race.goal_time_s != null ? formatDuration(race.goal_time_s) : "",
    priority: race.priority ?? "",
    status: race.status,
    actual_time: race.actual_time_s != null ? formatDuration(race.actual_time_s) : "",
  };
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const race = new Date(dateStr + "T00:00:00");
  return Math.round((race.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Common race distances get a nicer label than "21.1 km". */
function distanceLabel(km: number): string {
  const known: [number, string][] = [
    [5, "5K"],
    [10, "10K"],
    [21.0975, "Half Marathon"],
    [42.195, "Marathon"],
  ];
  const match = known.find(([d]) => Math.abs(d - km) < 0.05);
  return match ? `${match[1]} · ${km.toFixed(1)} km` : `${km.toFixed(1)} km`;
}

const inputClass =
  "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand";
const labelClass = "mb-1 block text-sm text-text-muted";

function RaceForm({
  initial,
  onCancel,
  onSubmit,
  submitting,
}: {
  initial: RaceFormValues;
  onCancel: () => void;
  onSubmit: (values: RaceFormValues) => void;
  submitting: boolean;
}) {
  const [values, setValues] = useState(initial);
  const [formError, setFormError] = useState<string | null>(null);

  function field<K extends keyof RaceFormValues>(key: K, value: RaceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!values.name.trim()) return setFormError("Race name is required.");
    if (!values.distance_km || Number(values.distance_km) <= 0) return setFormError("Distance must be greater than 0.");
    if (!values.race_date) return setFormError("Race date is required.");
    if (values.goal_time && parseDurationInput(values.goal_time) == null) {
      return setFormError('Goal time must look like "1:45:00" or "45:00".');
    }
    if (values.status === "completed" && values.actual_time && parseDurationInput(values.actual_time) == null) {
      return setFormError('Actual time must look like "1:45:00" or "45:00".');
    }

    onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="name">
            Race name
          </label>
          <input
            id="name"
            className={inputClass}
            placeholder="e.g. KL Standard Chartered Marathon"
            value={values.name}
            onChange={(e) => field("name", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="distance_km">
            Distance (km)
          </label>
          <input
            id="distance_km"
            type="number"
            step="any"
            min="0"
            className={inputClass}
            placeholder="e.g. 21.1"
            value={values.distance_km}
            onChange={(e) => field("distance_km", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="race_date">
            Date
          </label>
          <input
            id="race_date"
            type="date"
            className={inputClass}
            value={values.race_date}
            onChange={(e) => field("race_date", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="location">
            Location
          </label>
          <input
            id="location"
            className={inputClass}
            placeholder="e.g. Kuala Lumpur"
            value={values.location}
            onChange={(e) => field("location", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="priority">
            Priority
          </label>
          <select
            id="priority"
            className={inputClass}
            value={values.priority}
            onChange={(e) => field("priority", e.target.value as RaceFormValues["priority"])}
          >
            <option value="">None</option>
            <option value="A">A-race (goal)</option>
            <option value="B">B-race</option>
            <option value="C">C-race</option>
          </select>
        </div>
        <div>
          <label className={labelClass} htmlFor="goal_time">
            Goal time
          </label>
          <input
            id="goal_time"
            className={inputClass}
            placeholder="e.g. 1:45:00"
            value={values.goal_time}
            onChange={(e) => field("goal_time", e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="status">
            Status
          </label>
          <select
            id="status"
            className={inputClass}
            value={values.status}
            onChange={(e) => field("status", e.target.value as RaceFormValues["status"])}
          >
            <option value="upcoming">Upcoming</option>
            <option value="completed">Completed</option>
          </select>
        </div>
        {values.status === "completed" && (
          <div>
            <label className={labelClass} htmlFor="actual_time">
              Actual time
            </label>
            <input
              id="actual_time"
              className={inputClass}
              placeholder="e.g. 1:48:30"
              value={values.actual_time}
              onChange={(e) => field("actual_time", e.target.value)}
            />
          </div>
        )}
        <div className="sm:col-span-2">
          <label className={labelClass} htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            rows={2}
            className={inputClass}
            placeholder="Optional -- course notes, registration link, etc."
            value={values.notes}
            onChange={(e) => field("notes", e.target.value)}
          />
        </div>
      </div>

      {formError && <p className="text-sm text-negative">{formError}</p>}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? "Saving..." : "Save race"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm text-text-muted hover:text-text"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function RaceCard({
  race,
  isEditing,
  onEdit,
  onCancelEdit,
  onSave,
  onDelete,
  saving,
}: {
  race: Race;
  isEditing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (values: RaceFormValues) => void;
  onDelete: () => void;
  saving: boolean;
}) {
  const isUpcoming = race.status === "upcoming";
  const days = isUpcoming ? daysUntil(race.race_date) : null;
  const delta =
    race.status === "completed" && race.actual_time_s != null && race.goal_time_s != null
      ? race.actual_time_s - race.goal_time_s
      : null;

  if (isEditing) {
    return (
      <Card>
        <RaceForm initial={raceToForm(race)} onCancel={onCancelEdit} onSubmit={onSave} submitting={saving} />
      </Card>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl " +
              (isUpcoming ? "bg-stat-runs" : "bg-stat-distance")
            }
          >
            {isUpcoming ? <FlagIcon className="h-5 w-5 text-white" /> : <TrophyIcon className="h-5 w-5 text-white" />}
          </div>
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-text">
              {race.name}
              {race.priority && (
                <span className={"rounded-full px-2 py-0.5 text-[10px] font-semibold " + PRIORITY_COLOR[race.priority]}>
                  {race.priority}
                </span>
              )}
            </div>
            <div className="text-xs text-text-muted">
              {distanceLabel(race.distance_km)} · {formatRaceDate(race.race_date)}
              {race.location ? ` · ${race.location}` : ""}
            </div>
          </div>
        </div>

        {isUpcoming && days != null && (
          <div className="shrink-0 rounded-full border border-border px-3 py-1 text-xs text-text-muted">
            {days === 0 ? "Today" : days > 0 ? `in ${days}d` : `${Math.abs(days)}d ago`}
          </div>
        )}
      </div>

      {(race.goal_time_s != null || race.actual_time_s != null || race.notes) && (
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-border pt-4 text-sm">
          {race.goal_time_s != null && (
            <div>
              <span className="text-text-muted">Goal: </span>
              <span className="text-text">{formatDuration(race.goal_time_s)}</span>
              <span className="text-text-muted"> ({formatPace(race.goal_time_s / race.distance_km)})</span>
            </div>
          )}
          {race.actual_time_s != null && (
            <div>
              <span className="text-text-muted">Result: </span>
              <span className="text-text">{formatDuration(race.actual_time_s)}</span>
              {delta != null && (
                <span className={delta <= 0 ? "text-positive" : "text-negative"}>
                  {" "}
                  ({delta <= 0 ? "-" : "+"}
                  {formatDuration(Math.abs(delta))})
                </span>
              )}
            </div>
          )}
          {race.notes && <div className="text-text-muted">{race.notes}</div>}
        </div>
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-border pt-3">
        <button type="button" onClick={onEdit} className="text-xs font-medium text-text-muted hover:text-text">
          {isUpcoming ? "Edit / Mark completed" : "Edit"}
        </button>
        <button type="button" onClick={onDelete} className="text-xs font-medium text-negative hover:opacity-80">
          Delete
        </button>
      </div>
    </div>
  );
}

export default function RacePage() {
  const [races, setRaces] = useState<Race[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showCompleted, setShowCompleted] = useState(true);

  function load() {
    fetch("/api/races")
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
        return res.json();
      })
      .then(setRaces)
      .catch((err) => setError(err.message));
  }

  useEffect(load, []);

  function payloadFromForm(values: RaceFormValues) {
    return {
      name: values.name.trim(),
      distance_km: Number(values.distance_km),
      race_date: values.race_date,
      location: values.location.trim() || null,
      notes: values.notes.trim() || null,
      goal_time_s: values.goal_time ? parseDurationInput(values.goal_time) : null,
      priority: values.priority || null,
    };
  }

  async function handleCreate(values: RaceFormValues) {
    setSaving(true);
    try {
      const res = await fetch("/api/races", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFromForm(values)),
      });
      if (!res.ok) throw new Error(await res.text());
      setAdding(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdate(id: string, values: RaceFormValues) {
    setSaving(true);
    try {
      const res = await fetch(`/api/races/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payloadFromForm(values),
          status: values.status,
          actual_time_s: values.status === "completed" && values.actual_time ? parseDurationInput(values.actual_time) : null,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setEditingId(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/races/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await res.text());
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  const upcoming = races?.filter((r) => r.status === "upcoming") ?? [];
  const completed = races?.filter((r) => r.status === "completed") ?? [];

  return (
    <div>
      <Header title="Race" subtitle="Manage your upcoming and completed race events.">
        <button
          type="button"
          onClick={() => {
            setAdding((v) => !v);
            setEditingId(null);
          }}
          className="flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white"
        >
          <PlusIcon className="h-4 w-4" />
          Add Race
        </button>
      </Header>

      {error && <p className="mb-4 text-sm text-negative">{error}</p>}
      {!error && !races && <p className="text-sm text-text-muted">Loading...</p>}

      {adding && (
        <Card title="New race" className="mb-4">
          <RaceForm initial={EMPTY_FORM} onCancel={() => setAdding(false)} onSubmit={handleCreate} submitting={saving} />
        </Card>
      )}

      {races && races.length === 0 && !adding && (
        <EmptyPlaceholder label='No races yet -- press "Add Race" to plan your next one.' />
      )}

      {upcoming.length > 0 && (
        <div className="mb-6 flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-text-muted">Upcoming</h2>
          {upcoming.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              isEditing={editingId === race.id}
              onEdit={() => {
                setEditingId(race.id);
                setAdding(false);
              }}
              onCancelEdit={() => setEditingId(null)}
              onSave={(values) => handleUpdate(race.id, values)}
              onDelete={() => handleDelete(race.id)}
              saving={saving}
            />
          ))}
        </div>
      )}

      {completed.length > 0 && (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowCompleted((v) => !v)}
            className="flex w-fit items-center gap-2 text-sm font-semibold text-text-muted hover:text-text"
          >
            <ChevronDownIcon className={"h-4 w-4 transition-transform " + (showCompleted ? "" : "-rotate-90")} />
            Completed ({completed.length})
          </button>
          {showCompleted &&
            completed.map((race) => (
              <RaceCard
                key={race.id}
                race={race}
                isEditing={editingId === race.id}
                onEdit={() => {
                  setEditingId(race.id);
                  setAdding(false);
                }}
                onCancelEdit={() => setEditingId(null)}
                onSave={(values) => handleUpdate(race.id, values)}
                onDelete={() => handleDelete(race.id)}
                saving={saving}
              />
            ))}
        </div>
      )}
    </div>
  );
}
