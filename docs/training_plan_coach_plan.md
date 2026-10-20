# RunIQ — AI Training Plan (Coach) Plan

**Status: proposed, not yet implemented.** This doc is the deliverable for
"plan the AI training plan feature" — no application code changes yet.
Implementation starts only after this is reviewed and explicitly approved.

## Goal

From `/coach`, the user asks for a training plan for a race. The coach builds a
draft, the user reviews and edits it in the chat, then loads it into their
training plan (the existing `planned_runs`, shown on the dashboard calendar).

> "make me a plan for my race" → draft plan card → edit → **Load into my plan**

## Decisions (2026-10-16)

| Question | Decision |
|---|---|
| How is the plan generated? | **Rule-based skeleton + LLM.** Code builds the week-by-week structure (phases, progression limits, taper). The LLM chooses parameters from chat, explains the plan and adjusts it within validated limits. It never invents the numbers freely. |
| Who writes the rules? | Claude writes a **first version** (generator + validator, with plain-language comments and tests); the user adjusts later. |
| Loading over existing planned runs? | **Replace within the plan's date range, with a preview** ("this will replace N planned runs"). Runs outside the plan's dates are never touched. |
| Relation to Module 4? | **Start of the race-tracking redesign.** v1 is the plan linked to a race. No race-time prediction, no plan-vs-actual progress tracking until the user designs those. |

## What already exists

- `planned_runs` (date, `run_type` ∈ Easy/Long/Tempo/Intervals/Recovery,
  distance) with CRUD at `/api/planned-runs`, shown by `WeekStripCard` and
  `MiniCalendar`. "Load" = create these rows.
- `races` (date, distance, goal time, priority, status) — the plan's anchor.
- Fitness inputs: recent weekly volume, longest recent run, baseline pace,
  personal records (activities / analytics services).
- Knowledge files `tapering_and_racing.md`, `training_plans.md`,
  `recovery_and_load.md` — the coach can cite them when explaining a plan.

## What is missing

1. Nothing groups planned runs into a plan (no undo / replace as one unit).
2. `planned_runs` has no notes field.
3. A chat message can only hold text + evidence — no place for an editable plan.
4. No check that a plan is safe or sensible.

## Data model

```
training_plans
  id, user_id,
  race_id        -> races.id  (nullable, ON DELETE SET NULL)
  name, status   ('draft' | 'active' | 'archived')
  start_date, end_date
  inputs  (JSON) race snapshot, days_per_week, max_weekly_km, long_run_day,
                 fitness snapshot (4-wk avg km, longest run) -- what the plan was built from
  items   (JSON) draft workouts: [{date, run_type, distance_km, note}]
  warnings(JSON) last validator output
  created_at, updated_at, loaded_at

planned_runs           + plan_id (nullable FK), + notes (nullable string)
conversation_messages  + plan_id (nullable FK)   -- the card survives a refresh
```

Drafts live in `training_plans.items` while being edited; "load" copies them
into `planned_runs` (with `plan_id`), so a plan can be removed or replaced
as one unit.

## Plan engine (first version — Claude writes, user adjusts)

Inputs from the database: race date/distance/goal; average weekly km over the
last 4 weeks; longest run in the last 8 weeks; run frequency. Inputs from the
user (asked in chat if missing): days per week, max weekly km, long-run day.

Structure: base → build → peak → taper, a lighter recovery week every ~4th
week, one long run per week, quality session (Tempo/Intervals) from build on,
easy/recovery runs fill the remaining days. Taper length follows
`tapering_and_racing.md` (about 2–3 weeks marathon, 10–14 days half, 7–10 days
5K/10K).

**Short horizons** (e.g. race in 16 days): if there are fewer weeks than the
distance needs, produce a *compressed* plan (skip base), and if fewer than the
taper length, a *race-week* plan — always with an explicit warning, never a
pretend 12-week plan.

## Safety validator (runs on every generated or hand-edited plan)

Warnings shown in the review step; they do **not** block loading. Initial rules
(defaults the user can tune):

- Weekly volume growth ≤ ~15% (≤ ~10% preferred) unless following a recovery week.
- Long run ≤ ~35% of weekly volume and ≤ a per-distance cap (marathon ~35 km,
  half ~24, 10K ~16, 5K ~12).
- At most 2 hard sessions per week, never on consecutive days.
- At least 1 rest day per week.
- No runs dated in the past.
- Taper actually reduces volume; final week lighter than peak.

## API

```
POST   /api/training-plans/draft            build a draft (race_id, days_per_week, ...)
GET    /api/training-plans/{id}
PUT    /api/training-plans/{id}/items       save edits -> re-validate -> warnings
POST   /api/training-plans/{id}/load?preview=true   -> {will_create, will_replace[]}
POST   /api/training-plans/{id}/load        replace range + create planned_runs, status=active
DELETE /api/training-plans/{id}/load        unload: remove this plan's planned_runs
```

## Coach integration

- New tool `create_training_plan_draft(race_id?, days_per_week?, max_weekly_km?, long_run_day?)`
  returns `{plan_id, summary, warnings}`.
- System prompt: for plan requests, find the upcoming race and **ask** for any
  missing preference; never state plan details that aren't in the tool result;
  confirm the race distance if it looks inconsistent with its name.
- `MessageOut` gains `plan: TrainingPlanOut | None`; the router attaches the
  draft to the assistant message.

## Frontend (`/coach`)

Plan card inside the assistant message:

- Header: race, dates, number of weeks, peak week.
- Weekly volume bars, then weeks as accordions with editable rows (type
  select, distance, note, delete, add) and live weekly totals.
- Warnings list.
- Actions: **Regenerate** (opens a chat follow-up), **Preview & load** (shows
  what will be replaced, then loads), **Unload** when active.
- After loading: confirmation with a link to the dashboard calendar.

## Build order and acceptance checks

1. **Backend core** — tables + migrations, generator v1, validator, unit tests.
   *Accept:* a 12-week marathon plan has no validator warnings; a hand-edited
   spike produces one; a 16-day horizon yields a labelled compressed plan.
2. **API + load/unload** — overlap preview.
   *Accept:* load replaces only runs in the plan's range; unload removes only
   that plan's runs.
3. **Coach tool + prompt + message attachment.**
   *Accept:* "make me a plan for my race" returns a draft with no numbers that
   aren't in the tool result; missing info triggers a question.
4. **Plan card UI** — edit/add/delete, totals, warnings, load flow, phone width.
5. **Polish** — regenerate, edge cases, end-to-end test through `/coach`.

## Out of scope for v1

Plan-vs-actual progress tracking, race-time prediction, adaptive re-planning,
target paces / heart-rate zones per workout, auto-matching completed runs to
plan days, calendar export, reminders. (Progress tracking and prediction
belong to the user's race-tracking redesign.)

## Risks

- A local 14B model is unreliable at long structured JSON → the rule engine
  produces the structure; the LLM only fills parameters and explains.
- Overwriting hand-made planned runs → preview, range-limited replace, unload.
- Data quirks: the upcoming race "Selangor Marathon 2026" is stored as
  21.0975 km (half-marathon distance) — the coach must confirm distance
  before planning.
- Dates/time zones: planned dates are plain calendar dates, no times.
