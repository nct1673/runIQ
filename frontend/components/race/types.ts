import { formatDuration } from "@/lib/format";

export interface Race {
  id: string;
  name: string;
  distance_km: number;
  race_date: string; // "YYYY-MM-DD"
  race_time: string | null; // "HH:MM:SS", local flag-off time
  location: string | null;
  notes: string | null;
  goal_time_s: number | null;
  priority: "A" | "B" | "C" | null;
  status: "upcoming" | "completed";
  actual_time_s: number | null;
  created_at: string;
}

export interface RaceFormValues {
  name: string;
  distance_km: string;
  race_date: string;
  race_time: string; // "HH:MM", optional flag-off time
  location: string;
  notes: string;
  goal_time: string;
  priority: "" | "A" | "B" | "C";
  status: "upcoming" | "completed";
  actual_time: string;
}

export const EMPTY_FORM: RaceFormValues = {
  name: "",
  distance_km: "",
  race_date: "",
  race_time: "",
  location: "",
  notes: "",
  goal_time: "",
  priority: "",
  status: "upcoming",
  actual_time: "",
};

export function raceToForm(race: Race): RaceFormValues {
  return {
    name: race.name,
    distance_km: String(race.distance_km),
    race_date: race.race_date,
    race_time: race.race_time ? race.race_time.slice(0, 5) : "",
    location: race.location ?? "",
    notes: race.notes ?? "",
    goal_time: race.goal_time_s != null ? formatDuration(race.goal_time_s) : "",
    priority: race.priority ?? "",
    status: race.status,
    actual_time: race.actual_time_s != null ? formatDuration(race.actual_time_s) : "",
  };
}

/** Garmin personal record, as returned by /api/personal-records. */
export interface PersonalRecord {
  type_id: number;
  value: number;
  metric: "time_s" | "distance_m";
}

// Garmin PR type_id per race distance (see PersonalRecordsCard).
export const PR_TYPES: { type_id: number; km: number; name: string }[] = [
  { type_id: 3, km: 5, name: "5K" },
  { type_id: 4, km: 10, name: "10K" },
  { type_id: 5, km: 21.0975, name: "half" },
  { type_id: 6, km: 42.195, name: "marathon" },
];
