"use client";

import { useEffect, useState } from "react";

import Card from "@/components/Card";
import Header from "@/components/Header";

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

const inputClass =
  "w-full rounded-xl border border-border bg-bg px-3 py-2 text-sm text-text outline-none focus:border-brand";
const labelClass = "mb-1 block text-sm text-text-muted";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/profile/me")
      .then((res) => res.json())
      .then((data: Profile) =>
        setProfile({
          ...data,
          display_name: data.display_name ?? "",
          date_of_birth: data.date_of_birth ?? "",
          sex: data.sex ?? "",
          timezone: data.timezone ?? "",
        })
      )
      .finally(() => setLoading(false));
  }, []);

  function field<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setStatus(null);

    // Empty strings -> null for optional fields; PATCH only sends what's set.
    const payload = {
      ...profile,
      display_name: profile.display_name || null,
      date_of_birth: profile.date_of_birth || null,
      sex: profile.sex || null,
      timezone: profile.timezone || null,
    };

    try {
      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setStatus("Saved.");
    } catch (err) {
      setStatus(`Failed to save: ${(err as Error).message}`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div>
        <Header title="Profile" subtitle="Your personal details and preferences." />
        <p className="text-sm text-text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <Header title="Profile" subtitle="Your personal details and preferences." />

      <form onSubmit={handleSave} className="mx-auto flex max-w-2xl flex-col gap-4">
        <Card title="Basic info">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="display_name">
                Display name
              </label>
              <input
                id="display_name"
                className={inputClass}
                value={profile.display_name ?? ""}
                onChange={(e) => field("display_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="date_of_birth">
                Date of birth
              </label>
              <input
                id="date_of_birth"
                type="date"
                className={inputClass}
                value={profile.date_of_birth ?? ""}
                onChange={(e) => field("date_of_birth", e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="sex">
                Sex
              </label>
              <select
                id="sex"
                className={inputClass}
                value={profile.sex ?? ""}
                onChange={(e) => field("sex", e.target.value)}
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </Card>

        <Card title="Physiological data">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="height_cm">
                Height (cm)
              </label>
              <input
                id="height_cm"
                type="number"
                step="0.1"
                className={inputClass}
                value={profile.height_cm ?? ""}
                onChange={(e) => field("height_cm", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="weight_kg">
                Weight (kg)
              </label>
              <input
                id="weight_kg"
                type="number"
                step="0.1"
                className={inputClass}
                value={profile.weight_kg ?? ""}
                onChange={(e) => field("weight_kg", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="resting_hr">
                Resting HR (bpm)
              </label>
              <input
                id="resting_hr"
                type="number"
                className={inputClass}
                value={profile.resting_hr ?? ""}
                onChange={(e) => field("resting_hr", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="max_hr">
                Max HR (bpm)
              </label>
              <input
                id="max_hr"
                type="number"
                className={inputClass}
                value={profile.max_hr ?? ""}
                onChange={(e) => field("max_hr", e.target.value ? Number(e.target.value) : null)}
              />
            </div>
          </div>
        </Card>

        <Card title="Preferences">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="unit_system">
                Units
              </label>
              <select
                id="unit_system"
                className={inputClass}
                value={profile.unit_system}
                onChange={(e) => field("unit_system", e.target.value)}
              >
                <option value="metric">Metric (km, kg)</option>
                <option value="imperial">Imperial (mi, lb)</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="timezone">
                Timezone
              </label>
              <input
                id="timezone"
                className={inputClass}
                placeholder="e.g. Asia/Kuala_Lumpur"
                value={profile.timezone ?? ""}
                onChange={(e) => field("timezone", e.target.value)}
              />
            </div>
          </div>
        </Card>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          {status && <span className="text-sm text-text-muted">{status}</span>}
        </div>
      </form>

      <div className="mx-auto max-w-2xl">
        <ChangePasswordCard />
      </div>
    </div>
  );
}

function ChangePasswordCard() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
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
      setStatus("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setStatus((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card title="Change password" className="mt-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className={labelClass} htmlFor="current_password">
              Current password
            </label>
            <input
              id="current_password"
              type="password"
              required
              className={inputClass}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="new_password">
              New password
            </label>
            <input
              id="new_password"
              type="password"
              required
              minLength={8}
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-text disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? "Saving..." : "Change password"}
          </button>
          {status && <span className="text-sm text-text-muted">{status}</span>}
        </div>
      </form>
    </Card>
  );
}
