# RunIQ — Product Requirements (condensed)

Full detail: [`../RunIQ_Project_Blueprint.pdf`](../RunIQ_Project_Blueprint.pdf).
This is the frozen Phase-0 summary — treat the PDF as source of truth for
anything not captured here.

## Vision

A personalized running-intelligence platform that combines historical
Garmin activity data and weather with ML and an LLM-based
coach to answer: **"How am I performing, why is my performance changing,
and what should I do next?"** It does not replace Strava/Garmin as an
activity tracker — it adds personalized intelligence and decision support
on top.

## Philosophy: "You vs. Yourself"

Every comparison is against the user's own historical baseline, never
population averages or professional athletes. E.g. not "30°C is hot" but
"your pace tends to decline past ~29°C, especially above 75% humidity."

## Target user

Single user (the project owner): a recreational/amateur runner who runs
regularly, uses Garmin, has a race/performance goal, and wants
data-driven, personalized insight rather than just activity logging.

## MVP scope (must work end-to-end)

```
Garmin CSV export → Ingestion Pipeline → PostgreSQL → Weather + AQ →
Analytics → ML Prediction → Goal Tracking → AI Coach → Web Dashboard
```

The user should be able to answer, through the product: *How am I doing?
Am I improving? What affects my performance? How does weather affect me?
What's my current 10K prediction? Am I on track for my goal? Why was
today's run different? What does my historical data tell me?*

## Non-goals (explicitly out of scope for the MVP)

Mobile app, social network, public profiles, subscriptions, multi-user
permissions, real-time GPS tracking, generic workout marketplace, full
medical injury prediction, complex deep learning, full computer-vision
system, generic AI chatbot. (The architecture should not make future
multi-user expansion *impossible*, but building it now is out of scope.)

## Data collection — current approach (temporary)

No automated Garmin/Strava API integration yet. The user exports a CSV
from Garmin Connect and uploads it through the frontend; the backend
ingestion pipeline is transport-agnostic so an automated sync can replace
the manual upload later without changing the ingestion logic itself.

## Modules

1. **Data Platform** — ingestion, validation, normalization → Postgres
2. **Running Analytics** — stats, trends, personal baseline, similar-run engine
3. **Training Intelligence** — training load, fitness vs. fatigue, timeline
4. **Performance Prediction** — 5K/10K/half-marathon, classical ML, explainable
5. **Goals** — race goals, progress tracking, training-focus recommendations
6. **AI Running Coach** — SQL + analytics + RAG + LLM, evidence-based answers
7. *(Optional, Phase 3/non-blocking)* **Running Form Analysis** — pose
   estimation from video; framed as movement-pattern insight, never
   medical diagnosis.

## Success criteria / Definition of Done

- **Data:** raw export reproducibly processed into Postgres.
- **ML:** models have baselines, time-series-safe evaluation, documented
  limitations.
- **AI:** chatbot answers real questions using the user's real data, with
  evidence, not fabrication.
- **Engineering:** containerized, tested, deployable.
- **Product:** the user can actually use the system to understand their
  training — not just "the website looks good."
