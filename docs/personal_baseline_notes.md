# Personal Baseline — Computation Notes

Working notes on how `app/services/baseline_service.py::compute_baseline()`
(blueprint §12, currently a `NotImplementedError` stub) should actually be
computed, written up 2026-10-14 before implementation. Not a spec, not
implemented yet — just the methodology decisions worth settling first.

## What exists today (lightweight stand-in)

`app/services/coach/sql_tool.py::get_baseline()` — used only by the AI
coach's chat tool, not any UI:

```python
avg(pace), avg(hr), avg(cadence)  # over ALL activities, all-time, simple mean
```

This is a placeholder: it averages *every* run ever logged, hard efforts
and races included, with no time window.

## What the blueprint (§12) actually specifies

Easy-run pace, typical HR, typical cadence, weekly mileage, long-run
distance, workout intensity, performance range. The key word is
"**easy**-run pace," not "average pace" — a meaningfully different
computation from the stand-in above.

## Methodology decisions

### 1. Which runs count toward the baseline?
Averaging in hard workouts/races would skew "typical" pace faster than it
really is day-to-day. `analytics_service.py` already solves this
elsewhere — `pace-trend` and `biomechanics-trend` both filter to
`training_effect_label == "AEROBIC_BASE"`, documented as "avoids skewing
from hard workouts/races run at a deliberately different effort." The
real baseline should almost certainly reuse that same filter — it'd also
make the baseline directly comparable to the trend charts it's meant to
contextualize.

### 2. All-time vs. rolling window?
All-time average gets diluted by old data — if pace was slower 8 months
ago, that drags today's "baseline" down and understates real improvement.
A rolling window (last 8-12 weeks is a common training-load convention)
keeps the baseline representing *current* fitness, matching the
"reference point for later intelligence" framing better than a static
lifetime number.

### 3. Mean vs. median?
Mean is sensitive to one outlier day (a brutally hot run, a GPS glitch
inflating distance). Median is more robust, especially once filtering
down to a smaller "easy runs only, last N weeks" subset where one bad
data point has more leverage.

### 4. Weekly mileage / long-run distance need different math than pace/HR.
These aren't just averaged per-activity:
- Weekly mileage = sum distance per calendar week, then average/median
  those weekly sums.
- Long-run distance is more like a percentile (e.g. the top of the
  typical long-run range) than a mean.

### 5. "Workout intensity" and "performance range" are the vaguest terms.
Plausible interpretations:
- Intensity: the distribution of `training_effect_label` across recent
  runs (% easy vs. threshold vs. VO2max).
- Performance range: something like a 10th-90th percentile pace band
  instead of a single number.

### 6. Cold-start / minimum sample size.
Worth deciding a floor (e.g. "need at least 10 AEROBIC_BASE runs in the
window") before showing a baseline at all, rather than computing a shaky
average off 2 runs.

## Status

Not implemented. `compute_baseline()` in `baseline_service.py` is still a
bare `NotImplementedError`. Scaffolding (API/schema shape) can be added
on request once the aggregation logic above is ready to write.
