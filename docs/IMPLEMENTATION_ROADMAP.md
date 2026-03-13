# UPDE — Implementation Roadmap

**Performance Pathfinder OS** · Coaching-grade system evolution

This document is the single source for **architecture alignment**, **data schema**, **file layout**, and **concrete next steps**. It complements `UPDE_COACHING_OS_ARCHITECTURE.md` (detailed behaviour and pseudo-code).

---

## 1. Architecture at a Glance

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND (calm, premium, intentional)                           │
│  /app  — pages, layout                                           │
│  /app/ui — ProgrammeCard, WeeklyBrief, DecisionLog, BenchmarkMgr │
└───────────────────────────┬─────────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────────┐
│  ENGINE (intelligence behind the scenes)                          │
│  prescriptionEngine  — % → weight, RPE fallback                  │
│  benchmarkEngine     — getEffective1RM, round 2.5kg              │
│  fatigueModel        — fatigue score, recovery bandwidth          │
│  riskIndex           — fatigue risk, adaptation risk              │
│  systemBias          — strength/aerobic/hybrid classification     │
│  momentumEngine      — adaptation velocity, friction index        │
└───────────────────────────┬─────────────────────────────────────┘
                             │
┌───────────────────────────▼─────────────────────────────────────┐
│  PROFILE & DATA                                                  │
│  lib/profile/benchmarkSchema  — 1RM, aerobic, power               │
│  lib/profile/identityModel   — identity type, limiter hierarchy  │
│  profiles (Supabase)         — readiness, momentum, benchmarks   │
│  decision_logs (table)       — trigger, threshold, adjustment      │
│  session_logs / debriefs     — completion, friction signals      │
└─────────────────────────────────────────────────────────────────┘
```

- **No overcomplication in the UI.** All adaptive logic and narrative live in the engine and profile layer.
- **Session card:** Minimal, premium, A/B/C/D with percentage or RPE only.

---

## 2. Data Schema Summary

### 2.1 Already in place

| What | Where |
|------|--------|
| `performance_benchmarks` (exercise + aerobic + power) | `profiles.performance_benchmarks` (jsonb), `lib/profile/benchmarkSchema.ts` |
| Session completion | `session_logs` (profile_id, session_name, etc.) |
| Daily check-in | `profiles.checkin_*` columns |
| Readiness, momentum, primary_limiter | `profiles` |

### 2.2 To add (Phase 2)

| What | Where | Purpose |
|------|--------|--------|
| Decision log | `decision_logs` table or `profiles.decision_log_json` | Transparency: trigger, threshold, adjustment |
| Weekly brief | Computed from profile + phase; optionally `profiles.weekly_brief_json` | Coach-voice “why this week” |
| Identity / momentum | `profiles.identity_type`, `profiles.adaptation_velocity`, `profiles.friction_index` (or json) | Bias and compliance signals |
| Post-session debrief | `session_debriefs` table or `session_logs.debrief_json` | 2–3 questions, friction flags, recalibration |

### 2.3 Decision log row (example)

| Column | Example |
|--------|--------|
| `decision_type` | `volume_reduction` |
| `trigger_variables` | `{ "sleep_trend_pct": -18, "rpe_density": "high" }` |
| `threshold_breached` | `sleep_trend_below_0.85` |
| `adjustment_made` | `Lower-body volume reduced` |
| `explanation` | `Lower-body volume reduced due to sleep trend -18% and rising RPE density.` |

---

## 3. File Structure (target)

```
/engine
  benchmarkEngine.ts     ✅
  prescriptionEngine.ts ✅
  fatigueModel.ts       ✅ stub
  riskIndex.ts          ✅ stub
  systemBias.ts         ✅ stub
  momentumEngine.ts     ✅ stub

/app/ui
  ProgrammeCard.tsx     ✅
  WeeklyBrief.tsx       ✅
  DecisionLog.tsx       ✅
  BenchmarkManager.tsx  ✅ (benchmarks page uses own form; this is reusable block)

/lib/profile
  benchmarkSchema.ts    ✅
  benchmarkExerciseOptions.ts ✅
  identityModel.ts     ✅ stub
```

---

## 4. Component Breakdown

| Component | Role | Data source |
|-----------|------|-------------|
| **ProgrammeCard** | Session header (title, duration, intensity, focus) + A/B/C/D exercises with prescription + rest | Programme builder (card object from `buildSession`) |
| **WeeklyBrief** | Phase intent, system bias, limiter, recovery bandwidth, “why this week” | `generateWeeklyBrief(profile, week)` (Phase 2) |
| **DecisionLog** | List of “why this changed” entries | `decision_logs` or `profiles.decision_log_json` |
| **BenchmarkManager** | View/edit strength (and optionally aerobic/power) benchmarks | `profiles.performance_benchmarks` |

---

## 5. Prescription Flow (current)

1. Programme page `buildSession()` builds blocks and `card.exercises`.
2. For each main/secondary lift it calls `prescribe(benchmarks, exerciseKey, { sets, reps, percentage, rpeFallback })`.
3. `prescribe` uses `benchmarkEngine.getEffectiveOneRM` → if present, `workingWeightFrom1RM(1RM, percentage)` and formats e.g. `3×5 @ 70% (105kg)`; else `3×5 @ RPE 7`.
4. ProgrammeCard receives `exercises[]` with `title`, `prescription`, `rest` and renders them.

**Phase 2:** Inject `fatigueModel` / `riskIndex` so that `buildSession` can lower percentage or simplify structure when risk is high.

---

## 6. Phased Implementation Checklist

### Phase 1 (done)

- [x] Benchmark storage (schema + migration + benchmarks page)
- [x] Percentage prescription engine (prescribe, round 2.5 kg)
- [x] RPE fallback when no 1RM
- [x] Clean programme card (ProgrammeCard.tsx, A/B/C/D)
- [x] Programme page builds card with prescribe()
- [x] Estimated 1RM supported and flagged in display

### Phase 2 (next)

- [ ] **Decision log:** Create `decision_logs` migration; add `logDecision(profileId, payload)`; call from programme builder when reducing volume / shifting focus; DecisionLog UI reads from API.
- [ ] **Weekly brief:** Implement `generateWeeklyBrief(profile, week)` using phase, `systemBias()`, `primary_limiter`, `recoveryBandwidth()` from fatigueModel; render WeeklyBrief on programme or dashboard with that data.
- [ ] **Momentum engine:** `adaptationVelocity` and `frictionIndex` from session_logs + check-ins; store or compute on demand; optional profile columns.
- [ ] **Identity model:** `classifyIdentity(profile)` → Neural Dominant / Aerobic Deficit / Recovery-Limited / Hybrid; store `identity_type`; programme builder uses it to bias emphasis (Phase 2.5).
- [ ] **Fatigue/recovery in prescription:** Pass `fatigueScore` / `recoveryBandwidth` into session builder; reduce prescribed % or volume when needed; log decision when threshold breached.

### Phase 3 (later)

- [ ] **Post-session debrief:** 2–3 questions after “Mark complete”; store in `session_debriefs` or `session_logs.debrief_json`; friction flags drive next-session recalibration.
- [ ] **Risk index:** Forecasting model (e.g. fatigue risk next 7 days); surface in brief or dashboard.
- [ ] **Predictive steering:** Use risk + identity to suggest “lighter week” or “neural emphasis” ahead of time.

---

## 7. Clear Next Implementation Steps

**Immediate (Phase 2 start):**

1. **Decision log**
   - Add migration: `decision_logs (id, profile_id, created_at, decision_type, trigger_variables jsonb, threshold_breached text, adjustment_made text, explanation text)`.
   - Add `engine/decisionLog.ts`: `logDecision(profileId, { decisionType, triggerVariables, thresholdBreached, adjustmentMade, explanation })` → insert into Supabase.
   - In programme page, when adaptation is `reduce` (or when you reduce volume due to fatigue), call `logDecision` with the reason.
   - Add API route `GET /api/decision-log` returning last N entries for the user; DecisionLog component fetches and displays them.

2. **Weekly brief generator**
   - Implement `engine/weeklyBriefGenerator.ts` (or inside a broader “brief” module):
     - `getPhaseIntent(phase, macrocycle)` — from phase label / week.
     - `getSystemBias(profile)` — use `systemBias.classify(profile)`.
     - `getRecoveryBandwidth(profile)` — use `fatigueModel.recoveryBandwidth(profile)`.
     - `generateWhyThisWeek(profile, week)` — 2–3 sentence template from above.
   - On programme page (or dashboard), call generator with current `profile` and `week`; pass result into `<WeeklyBrief />`.

3. **Wire identity and momentum**
   - Ensure `identityModel.classify(profile)` and `momentumEngine.velocity(profile)` / `frictionIndex(profile)` have clear interfaces (see engine stubs).
   - Add profile columns or JSON for `identity_type`, `adaptation_velocity`, `friction_index` if you want to persist; otherwise compute on demand for brief and programme logic.

4. **Use fatigue in programme builder**
   - In `buildSession`, call `fatigueModel.fatigueScore(profile)` and `riskIndex.adaptationRisk(profile)` (or similar).
   - If risk above threshold, set adaptation to `reduce` and/or lower prescription percentages; call `logDecision` with trigger and adjustment.

---

## 8. API Surface (current and suggested)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/profile` | POST | Update profile (including check-in); **extend to accept `performance_benchmarks` if not already.** |
| `/api/decision-log` | GET | Return last N decision log entries for current user (Phase 2). |
| `/api/weekly-brief` | GET | Optional: return generated brief for current week (Phase 2); or compute client-side. |
| Session logs | Supabase | Already used for “Mark complete”; extend with debrief payload in Phase 3. |

---

**Important:** Keep the frontend calm and premium. All branching logic, thresholds, and narrative live in the engine and profile layer; the UI only displays what the engine returns.
