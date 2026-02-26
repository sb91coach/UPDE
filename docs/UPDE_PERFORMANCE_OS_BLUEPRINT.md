# UPDE Performance Pathfinder OS — Architecture Blueprint

**Human Performance Operating System**  
Reactive adaptation → **Predictive intervention + architectural steering**

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         UI LAYER (minimal, premium)                       │
│  Dashboard · Programme · Check-in · Decision log ("Why this changed")     │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                      MESSAGING / EXPLANATION LAYER                       │
│  Decision log model · Rule triggers · Structured explanations           │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                         CORE ENGINE (server)                             │
│  Forward modelling · Risk index · Energy bias · Constraint logic         │
│  Identity classifier · Programme flex · Microcycle architecture          │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                         SCORING MODULES (server)                         │
│  Adaptation velocity · Fatigue model · System bias · Volatility index    │
└─────────────────────────────────────────────────────────────────────────┘
                                      │
┌─────────────────────────────────────────────────────────────────────────┐
│                         DATA LAYER                                       │
│  profiles · time_series (scores, load) · checkins · decision_logs         │
└─────────────────────────────────────────────────────────────────────────┘
```

**Principle:** Backend owns all predictive and scoring logic. Frontend consumes derived state and displays it; no complex scoring in the client.

---

## 2. Forward Performance Modelling Layer

**Goal:** Track adaptation velocity, detect lagging systems, forecast 7–14 day drift, flag plateau/overload risk before it occurs.

### 2.1 Data model additions

| Entity / column | Purpose |
|-----------------|--------|
| `performance_snapshots` (new table) | Time-series: `profile_id`, `date`, `strength_upper`, `strength_lower`, `aerobic_score`, `mobility_score`, `readiness_score`, `fatigue_score`, `session_count`, `load_volume` (optional) |
| `profiles`: `adaptation_velocity_strength`, `adaptation_velocity_aerobic`, `adaptation_velocity_mobility` | Rate of change (e.g. 7-day delta / 7), computed server-side |
| `profiles`: `lagging_system` | Enum or string: `null` \| `mobility` \| `tendon` \| `aerobic_floor` \| `neural` — which system is falling behind |
| `profiles`: `drift_forecast_7d`, `drift_forecast_14d` | JSON or string: e.g. `"plateau_risk"` \| `"overload_risk"` \| `"on_track"` |
| `profiles`: `last_snapshot_date` | For incremental velocity computation |

### 2.2 Derived metrics (server)

- **Adaptation velocity (per system):**  
  `velocity = (score_today - score_7d_ago) / 7`  
  Store rolling 7d (and optionally 14d) so we can compare strength vs mobility vs aerobic.
- **Lagging system detection:**  
  If `velocity_strength > 0` and `velocity_mobility <= 0` (or declining) over 14d → flag `mobility` (or `tendon` if we add tendon-specific proxy).  
  Similar logic: aerobic floor lagging when strength rises but aerobic flat.
- **Drift forecast:**  
  Simple rule set: if velocity flattens (e.g. |velocity| < threshold) for 7d + load high → `plateau_risk`.  
  If load trend up + readiness trend down + fatigue up → `overload_risk`.

### 2.3 Where logic lives

- **Server:** Snapshot ingestion (daily or post-session), velocity computation, lagging-system and drift rules.  
- **Client:** Only displays `lagging_system`, `drift_forecast_*`, and optional velocity sparklines. No velocity math in the client.

### 2.4 UI surfaces

- Dashboard: small “Adaptation velocity” block (7d trend by system: strength / aerobic / mobility).  
- “Lagging system” chip + one-line recommendation (“Mobility focus this block”).  
- Optional “7-day outlook”: plateau / overload / on track with short explanation.

---

## 3. Performance Risk Index Engine

**Goal:** Estimate mechanical overload probability, neural strain, recovery compression, burnout drift — combine sleep, eccentric exposure, weekly density, momentum velocity, mobility suppression.

### 3.1 Inputs (from existing + new)

- Sleep trend (e.g. 7d average or trend slope from `sleep_score` / check-in sleep).
- Eccentric exposure: proxy from programme (e.g. count of RDL, split squat, loaded march, etc.) or from session tags.
- Weekly density: sessions per week × nominal volume (sets × reps or RPE-weighted).
- Momentum velocity: rate of change of “momentum” or session compliance.
- Mobility suppression: `mobility_score` trend down or below threshold.

### 3.2 Scoring logic (pseudo)

```
mechanical_overload_risk = f(weekly_density, eccentric_count, strength_velocity)
  — high density + high eccentric + rising strength load → elevate

neural_strain = f(session_frequency, intensity_trend, sleep_trend)
  — high frequency + high intensity + declining sleep → elevate

recovery_compression = f(rest_days, sleep_trend, fatigue_score, readiness_trend)
  — few rest days + poor sleep + high fatigue → elevate

burnout_drift = f(momentum_velocity, stress_level, readiness_trend, compliance_confidence)
  — negative momentum + high stress + declining readiness → elevate

performance_risk_index = weighted_sum(
  mechanical_overload_risk, neural_strain, recovery_compression, burnout_drift
)
// Weights configurable; normalize to 0–100 or band: low / moderate / high / critical
```

### 3.3 Output format

- `performance_risk_index` (0–100 or band).  
- Optional sub-scores: `mechanical_risk`, `neural_risk`, `recovery_risk`, `burnout_risk` for “Why” drill-down.  
- Store in `profiles` or in a `risk_snapshots` table by date.

### 3.4 UI

- Dashboard: “Performance Risk” gauge or band (low / moderate / high / critical) with one line of copy.  
- “Why” → Decision Transparency Layer: short bullets (e.g. “Sleep trend -18%”, “Lower-body RPE increase”, “Mobility suppression widening”).

---

## 4. Energy System Architecture Model

**Goal:** Dynamic system bias classifier — aerobic floor depth, glycolytic reliance, neural output ceiling, interference risk — and rebalance block intent (not just load).

### 4.1 Data required

- From profiles: `aerobic_score`, `strength_upper`, `strength_lower`, programme type.  
- From programme/sessions: volume and type of conditioning (Zone 2 vs threshold vs glycolytic).  
- Optional: session tags (e.g. “predominantly aerobic”, “strength”, “power”).

### 4.2 Derived system bias score

- **Aerobic floor depth:** Based on `aerobic_score` trend and volume of Zone 2 / long steady work.  
- **Glycolytic reliance:** Proxy from threshold/high-intensity session count and duration.  
- **Neural output ceiling:** Proxy from power/speed session count and readiness.  
- **Interference risk:** High strength volume + high glycolytic volume in same microcycle → elevate.

Output: e.g. `system_bias: "aerobic_deficit" | "glycolytic_heavy" | "balanced" | "neural_dominant"` plus optional numeric sub-scores.

### 4.3 Phase-switch logic

- If `system_bias === "aerobic_deficit"` → bias next block toward aerobic floor (more Zone 2, less threshold density).  
- If `interference_risk` high → reduce glycolytic volume in strength block or separate in time.  
- Phase logic (GPP/SPP) stays; within phase, **block intent** (aerobic focus vs strength focus vs power) is adjusted by system bias.

### 4.4 Refactor points in programme engine

- Conditioning prescription (e.g. `conditioningPrescription()` in programme page) should take `system_bias` and `interference_risk` as inputs.  
- Session builder receives “block intent” (e.g. “aerobic_emphasis”, “strength_emphasis”, “minimal_interference”) and adjusts conditioning and possibly exercise selection.

---

## 5. Constraint Intelligence Layer

**Goal:** Volatility-aware planning — work stress, family load, travel, variable sleep, cognitive fatigue. Change intensity distribution, volume architecture, exercise density, recovery emphasis — not just move sessions.

### 5.1 Constraint scoring input

- From check-in or dedicated “constraint” questions: work_load (1–5), family_load (1–5), travel_this_week (y/n), sleep_volatility (low/medium/high), cognitive_fatigue (1–5).  
- Optional: calendar integration (travel, events) for future.

### 5.2 Weekly volatility index

- `volatility_index = f(sleep_volatility, work_load, family_load, travel, cognitive_fatigue)`  
  Simple: weighted sum normalized to 0–100 or band (low / medium / high).

### 5.3 Programme flex logic

- **High volatility:**  
  - Reduce intensity spread (avoid peak days; compress toward moderate).  
  - Reduce volume architecture (fewer sets or sessions).  
  - Lower exercise density (fewer exercises per session).  
  - Increase recovery emphasis (more rest days or lighter days).  
- **Low volatility:**  
  - Preserve or slightly increase density and intensity distribution.

### 5.4 Microcycle architecture changes

- When volatility rises: e.g. 3 sessions → 2 heavier + 1 light; or 4 sessions → 3 with one “flex” that can drop.  
- Session templates get a “volatility_override” branch: same movement patterns but lower volume/intensity and more rest.

---

## 6. Momentum & Identity Engine

**Goal:** Adaptation velocity score, behavioural friction index, compliance confidence, performance identity classification — identity alters programming bias.

### 6.1 Metrics

- **Adaptation velocity score:** Already in Forward Modelling; can be exposed as single “momentum” number (e.g. average of strength/aerobic/mobility velocity).  
- **Behavioural friction index:** Inverse of compliance (e.g. planned vs completed sessions, check-in consistency). Higher friction → lower index.  
- **Compliance confidence:** Probability that user will complete planned work (from past completion rate and recent friction).  
- **Performance identity:** Classification (see below).

### 6.2 Identity classification logic

- **Neural-dominant responder:** High power/speed performance, strength responds quickly, aerobic lags.  
- **Aerobic-deficit profile:** Aerobic score low relative to strength; poor sustained output.  
- **Recovery-limited performer:** Readiness/fatigue/sleep drive most variance; need more recovery emphasis.  
- **Hybrid balanced responder:** No single dominant limiter; balanced velocity across systems.

Rules: use velocity ratios (e.g. strength_velocity / aerobic_velocity), recovery sensitivity (readiness vs load correlation), and programme type to assign a primary identity tag.

### 6.3 Profile tagging

- `profiles.performance_identity`: enum or string (e.g. `neural_dominant`, `aerobic_deficit`, `recovery_limited`, `hybrid_balanced`).  
- Optional: `identity_confidence` (0–1) so UI can show “Likely neural-dominant” until enough data.

### 6.4 How identity alters programming bias

- **Recovery-limited:** Automatically bias toward more rest, lower density, more deload sensitivity.  
- **Aerobic-deficit:** Bias conditioning toward aerobic floor in programme engine.  
- **Neural-dominant:** Preserve power/speed work; avoid overloading with excessive glycolytic work.  
- **Hybrid:** Default balanced behaviour.

---

## 7. Decision Transparency Layer

**Goal:** Every AI/engine decision explainable — decision log model, rule triggers, structured explanation, “Why this changed” UI.

### 7.1 Decision log model

- Table: `decision_logs`  
  - `id`, `profile_id`, `created_at`  
  - `decision_type`: e.g. `volume_reduction`, `intensity_reduction`, `session_flex`, `block_intent_change`, `deload_trigger`, `constraint_adapt`  
  - `trigger_rules`: JSON array of rule IDs or names that fired  
  - `explanation`: structured (see below) or rich text  
  - `inputs_snapshot`: JSON (readiness, sleep, risk_index, etc.) for audit  
  - Optional: `affected_entity` (e.g. `programme`, `session_3`)

### 7.2 Rule triggers

- Each scoring or adaptation step can emit a “trigger” (e.g. `sleep_trend_down`, `mobility_suppression`, `volatility_high`, `overload_risk_high`).  
- Decision log entry is created when a user-visible change is made (e.g. programme adapted, session modified).

### 7.3 Structured explanation output

Example:

```json
{
  "summary": "Volume reduced for today's programme",
  "reasons": [
    { "factor": "Sleep", "direction": "trend", "value": "-18% over 7d" },
    { "factor": "Lower-body load", "direction": "RPE", "value": "elevated" },
    { "factor": "Mobility", "direction": "suppression", "value": "widening" }
  ]
}
```

Rendered as: “Volume reduced due to: Sleep -18% trend; Lower-body RPE increase; Mobility suppression widening.”

### 7.4 UI surface

- Programme page: “Why this changed” expandable or link.  
- Dashboard: “Latest decisions” (last 3–5) with summary + expand for reasons.  
- Check-in confirmation: “Today’s programme was adapted because: …”

---

## 8. System Architecture — Folder Structure & Refactor

### 8.1 Proposed folder structure

```
app/                    # Next.js app (unchanged)
  programme/
  profile/
  checkin/
  api/
    engine/             # Optional: thin API routes that call engine
lib/
  supabaseClient.ts
  trainingTargets.ts
  exerciseVideos.ts
engine/                 # NEW: Core performance engine (server-only logic)
  index.ts              # Orchestrator: runs scoring, returns derived state
  forwardModelling.ts   # Velocity, lagging system, drift forecast
  riskIndex.ts          # Performance risk index + sub-scores
  energySystemBias.ts   # System bias, interference risk
  constraintLayer.ts    # Volatility index, programme flex
  identityEngine.ts    # Identity classification, compliance confidence
  decisionLog.ts        # Create log entries, format explanations
scoring/                # NEW: Pure scoring modules (no DB, testable)
  adaptationVelocity.ts
  fatigueModel.ts
  volatilityIndex.ts
  systemBiasScore.ts
types/
  engine.ts             # Shared types: AdaptationLevel, RiskBand, etc.
  decisionLog.ts
db/ or supabase/
  migrations/
  seed/
docs/
  UPDE_PERFORMANCE_OS_BLUEPRINT.md  # This doc
```

### 8.2 Where predictive logic lives

- **Server:** All of `engine/` and `scoring/`.  
- **API:** `app/api/engine/route.ts` (or per-domain routes) loads profile + time-series, runs engine, writes decision_logs and profile updates, returns derived state for UI.  
- **Client:** Fetches derived state (e.g. `GET /api/engine` or embedded in profile); renders programme and dashboard. No scoring in client.

### 8.3 Modularisation

- Scoring modules: pure functions `(inputs) => score`. No Supabase in scoring.  
- Engine: composes scoring modules, reads/writes DB, produces decision log entries.  
- Programme builder (current `buildSession` logic): can move to `engine/programmeBuilder.ts` and take `adaptation`, `system_bias`, `volatility`, `identity` as parameters.

### 8.4 Performance

- Snapshot and risk runs: daily cron or post-check-in job; not on every page load.  
- Programme page: load profile + today’s engine output (cached or fast query).  
- Decision log: last N entries per profile; paginate if needed.

---

## 9. Data Model Additions (Summary)

| Table / column | Type | Purpose |
|----------------|------|--------|
| `performance_snapshots` | table | Daily snapshot of scores + load for velocity and drift |
| `risk_snapshots` | table (optional) | Daily risk index + sub-scores for history |
| `decision_logs` | table | Decision type, triggers, explanation, inputs_snapshot |
| `profiles.checkin_*` | columns | Already added for daily check-in |
| `profiles.adaptation_velocity_*` | columns | 7d velocity per system |
| `profiles.lagging_system` | column | Flagged system |
| `profiles.drift_forecast_7d` / `_14d` | columns | Plateau / overload / on_track |
| `profiles.performance_risk_index` | column | 0–100 or band |
| `profiles.system_bias` | column | Aerobic_deficit / glycolytic_heavy / balanced / neural_dominant |
| `profiles.volatility_index` | column | 0–100 or band (weekly) |
| `profiles.performance_identity` | column | neural_dominant / aerobic_deficit / recovery_limited / hybrid_balanced |
| `profiles.constraint_*` | columns (optional) | Work/family/travel/sleep volatility from check-in |

---

## 10. Phased Rollout

### Phase 1 — Immediate build (MVP)

- **Data:** Add `performance_snapshots` (write on check-in or session complete); add `decision_logs` with simple schema.  
- **Scoring:** Adaptation velocity (7d) for strength, aerobic, mobility; store on profile.  
- **Engine:** Single module that: reads snapshots, computes velocity, writes back to profile. Optional: write one decision log when daily check-in triggers programme adaptation (reuse existing “reduce/normal/increase” logic).  
- **UI:** Dashboard shows “Adaptation velocity (7d)” for 3 systems. Programme page: “Why this changed” from last decision log entry (if any).  
- **Constraint:** Add 1–2 volatility questions to daily check-in; compute simple `volatility_index` and pass into programme builder as “flex” (reduce volume when high).  
- Keep: current programme builder in app; call engine API to get `adaptation` + optional `volatility` and `decision_explanation`.

### Phase 2 — Advanced modelling

- **Risk index:** Implement full Performance Risk Index (mechanical, neural, recovery, burnout); store and display band.  
- **Lagging system + drift forecast:** Implement rules; surface in dashboard.  
- **Energy system bias:** Compute system_bias and interference_risk; feed into conditioning prescription.  
- **Identity:** Implement classification; tag profile; alter programme bias (recovery-limited → more rest, etc.).  
- **Decision log:** All adaptation and risk-triggered changes write to decision_logs with structured reasons.

### Phase 3 — Predictive steering

- **Forward-looking:** Use drift_forecast to suggest block intent (e.g. “Mobility focus next 2 weeks”).  
- **Programme flex:** Full constraint layer — volatility drives microcycle layout (session count, density, intensity distribution).  
- **Compliance confidence:** Use behavioural friction and compliance confidence to adjust prescribed volume (e.g. prescribe 90% of “ideal” when confidence low).  
- **Rich “Why”:** Every programme and dashboard change traceable to triggers and reasons in UI.

---

## 11. UI Surfaces (Summary)

| Surface | Phase 1 | Phase 2 | Phase 3 |
|--------|--------|--------|--------|
| Dashboard | Velocity (7d) × 3 systems | + Risk band, lagging system, drift | + Outlook, identity tag |
| Programme | “Why this changed” (1 line) | + Full reasons list | + Full decision history |
| Check-in | Existing 5 Qs + optional volatility | + Risk feedback after check-in | + Suggested focus (e.g. mobility) |
| New: Decision log | Last decision only | List last 5–10 | Filterable, exportable |

---

## 12. Example Scoring Logic (Pseudo-code)

### Adaptation velocity (7d)

```ts
function computeVelocity(snapshots: Snapshot[], system: 'strength' | 'aerobic' | 'mobility'): number {
  const key = system === 'strength' ? (s) => (s.strength_upper + s.strength_lower) / 2
    : system === 'aerobic' ? (s) => s.aerobic_score
    : (s) => s.mobility_score;
  const recent = snapshots.slice(-8).filter(Boolean); // last 7 days
  if (recent.length < 2) return 0;
  const first = key(recent[0]), last = key(recent[recent.length - 1]);
  const days = (recent[recent.length - 1].date - recent[0].date) / 86400000;
  return days > 0 ? (last - first) / days : 0;
}
```

### Performance risk index (simplified)

```ts
function performanceRiskIndex(p: Profile, snapshots: Snapshot[]): number {
  const sleepTrend = trendSlope(snapshots.map(s => s.sleep_score));
  const density = (p.days_per_week ?? 3) * 4; // proxy volume
  const mechanical = Math.min(100, (density / 20) * 30 + (1 - (p.readiness_score ?? 50) / 100) * 40);
  const recovery = (100 - (p.readiness_score ?? 50)) * 0.5 + (p.fatigue_score ?? 0) * 0.3;
  const burnout = sleepTrend < 0 ? 20 + Math.abs(sleepTrend) * 2 : 0;
  return clamp(0, 100, (mechanical + recovery + burnout) / 2);
}
```

### Volatility index (from check-in)

```ts
function volatilityIndex(checkin: DailyCheckin): number {
  const work = (checkin.work_load ?? 3) / 5;
  const family = (checkin.family_load ?? 3) / 5;
  const travel = checkin.travel_this_week ? 1 : 0;
  const sleepV = { low: 0, medium: 0.5, high: 1 }[checkin.sleep_volatility ?? 'medium'];
  const cognitive = (checkin.cognitive_fatigue ?? 3) / 5;
  return Math.round((work + family + travel + sleepV + cognitive) * 20); // 0–100
}
```

---

This blueprint keeps the frontend minimal and premium, centralises predictive and scoring logic on the server, and scales via clear modules and phased rollout. The system behaves as a **Human Performance Operating System**: predictive, constraint-aware, and decision-transparent.
