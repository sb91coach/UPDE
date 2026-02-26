# UPDE Coaching OS — Architecture & Implementation

**Human Performance Coaching System**  
Adaptive workout generator → **Coaching-grade performance operating system**

---

## Section 1 — Coaching Experience Layer

### 1.1 Weekly Strategic Brief Generator

**Purpose:** Before each training week, generate a coach-voice brief.

**Inputs:** Readiness trends, momentum, fatigue model, phase, primary limiter.

**Output (narrative):**
- Phase intent (e.g. "GPP — building aerobic floor and work capacity")
- Current system bias (e.g. "Strength-dominant; aerobic floor building")
- Primary limiter (from profile)
- Recovery bandwidth status (e.g. "Adequate" / "Compressed")
- Why this week looks the way it does (2–3 sentences)

**Storage:** `weekly_briefs` table or `profiles.weekly_brief_json` (current week). Generated server-side or client-side from profile + phase.

**Pseudo-code:**
```
brief.phaseIntent = getPhaseIntent(phase, macrocycle)
brief.systemBias = classifySystemBias(aerobic_score, strength_upper, strength_lower)
brief.primaryLimiter = profile.primary_limiter
brief.recoveryBandwidth = recoveryBandwidth(readiness_trend, sleep_trend, fatigue_score)
brief.whyThisWeek = template(phaseIntent, systemBias, recoveryBandwidth)
```

### 1.2 Post-Session Debrief Engine

**Purpose:** After each session, 2–3 reflective inputs; detect friction; recalibrate.

**Inputs:** Session name, 2–3 questions (e.g. "How did that feel? (1–5)", "Any niggles?", "Ready for next session?").

**Storage:** `session_debriefs` (profile_id, session_id, responses, friction_flags) or append to `session_logs.debrief_json`.

**Recalibration:** If friction_flags (e.g. pain, high strain) → next session gets reduce signal or alternative exercise hint.

### 1.3 Decision Transparency Log

**Schema:**
```
decision_logs: id, profile_id, created_at, decision_type, trigger_variables (jsonb),
  threshold_breached (text), adjustment_made (text), explanation (text)
```

**Example row:**  
`decision_type: "volume_reduction"`, `trigger_variables: { sleep_trend: -18, rpe_density: "high" }`,  
`adjustment_made: "Lower-body volume reduced"`,  
`explanation: "Lower-body volume reduced due to sleep trend -18% and rising RPE density."`

**UI:** "Why this changed" expandable or dedicated Decision log view.

---

## Section 2 — Benchmark & 1RM System

### 2.1 Data Structure (profile.performance_benchmarks)

```ts
performanceBenchmarks: {
  exerciseBenchmarks: {
    back_squat:    { oneRM: number | null, estimatedOneRM: number | null, lastUpdated: string },
    bench_press:   { ... },
    deadlift:      { ... },
    overhead_press: { ... },
    weighted_pullup: { ... },
    trap_bar_deadlift: { ... },
    hip_thrust:    { ... },
    split_squat:   { ... }
  },
  aerobicBenchmarks: {
    vo2max: number | null,
    vt1: number | null,
    vt2: number | null,
    MAS: number | null,
    two_mile_time: number | null  // seconds
  },
  powerBenchmarks: {
    CMJ: number | null,   // cm
    RSI: number | null,
    sprint_10m: number | null,
    sprint_30m: number | null
  }
}
```

- Users can manually update any benchmark; system stores `lastUpdated` (ISO date).
- Auto-estimation from logged sessions: e.g. from sets × reps × weight use Epley/Brzycki to get estimated 1RM, store in `estimatedOneRM`; `oneRM` remains null until user confirms.

### 2.2 DB Change

- `profiles.performance_benchmarks` (jsonb, nullable). Migration adds column.

---

## Section 3 — Percentage Prescription Engine

**Logic:**

```
FOR each programmed lift:
  IF user has valid oneRM (or estimatedOneRM with flag):
    workingWeight = oneRM × prescribedPercentage
    workingWeight = roundToNearest2_5(workingWeight)
    display = "{exercise} — {sets}x{reps} @ {pct}% ({workingWeight}kg)"
    IF estimatedOneRM only: append " (estimated)"
  ELSE:
    display = "{exercise} — {sets}x{reps} @ RPE {rpeTarget}"
```

**Inputs:** Phase intent, fatigue state, recovery bandwidth, neural strain (Phase 2) can adjust the prescribed percentage (e.g. reduce % on high fatigue).

**Output:** Single line per exercise for programme card.

---

## Section 4 — Programme Card Layout (Clean UX)

**Layout:**

- **Header:** Session type · Bias | Duration | Intensity | Primary focus
- **Body:** A. / B. / C. / D. with exercise name, prescription line, rest
- **Footer:** Optional aerobic flush with MAS or Zone 2

**Rules:** Clear hierarchy; % → weight via prescription engine; RPE fallback; aerobic from MAS or HR zones when available.

**Component:** `ProgrammeCard.tsx` — minimal, premium, no clutter.

---

## Section 5 — Adaptive Architecture Logic

**Signals:**
- Rising eccentric density (e.g. volume of RDL, split squat, loaded march)
- Neural compression (high intensity × frequency)
- Recovery bandwidth narrowing (readiness down, fatigue up)

**Actions:**
- Fatigue risk ↑ → reduce bilateral load, increase unilateral tempo, shift intensity distribution
- Readiness high + recovery stable → allow neural emphasis
- Compliance drops → simplify session structure (fewer exercises, clearer focus)

**Implementation:** Engine modules (`fatigueModel`, `riskIndex`) output signals; programme builder reads them and adjusts block selection and prescription %.

---

## Section 6 — Momentum & Identity Engine

**Metrics:**
- `adaptationVelocity`: rate of performance change (from snapshots)
- `frictionIndex`: compliance + behavioural drift
- `identityType`: classification (Neural Dominant Responder, Aerobic Deficit Profile, Recovery-Limited Performer, Hybrid Balanced Responder)

**Programming bias:** Identity alters programme emphasis (e.g. recovery-limited → more rest, aerobic-deficit → more Zone 2).

**Schema:** `profiles.adaptation_velocity`, `profiles.friction_index`, `profiles.identity_type`.

---

## Section 7 — System Architecture Refactor

**Target structure:**

```
/engine
  fatigueModel.ts
  riskIndex.ts
  systemBias.ts
  prescriptionEngine.ts
  benchmarkEngine.ts
  momentumEngine.ts

/app/ui
  ProgrammeCard.tsx
  WeeklyBrief.tsx
  DecisionLog.tsx
  BenchmarkManager.tsx

/lib/profile
  benchmarkSchema.ts
  identityModel.ts
```

Frontend stays clean; complexity in engine layer.

---

## Section 8 — Phased Build

| Phase | Deliverables |
|-------|--------------|
| **Phase 1** | Benchmark storage, percentage prescription, clean programme cards, RPE fallback |
| **Phase 2** | Momentum engine, identity classifier, decision transparency layer, weekly brief |
| **Phase 3** | Predictive modelling, risk index forecasting, post-session debrief |

---

## Implemented (Phase 1)

| Item | Location |
|------|----------|
| Benchmark schema | `lib/profile/benchmarkSchema.ts` |
| Benchmark engine | `engine/benchmarkEngine.ts` |
| Prescription engine | `engine/prescriptionEngine.ts` |
| Programme card | `app/ui/ProgrammeCard.tsx` |
| Programme page | Builds `card` per session; renders ProgrammeCard when day expanded |
| Migration | `supabase/migrations/20250225100000_add_performance_benchmarks.sql` |
| WeeklyBrief, DecisionLog, BenchmarkManager | `app/ui/*.tsx` (placeholders) |

## Next Steps

**Phase 1 remaining:** API or profile page to update `performance_benchmarks`; optional auto-estimate 1RM from logs.

**Phase 2:** decision_logs table + log writes; WeeklyBrief generator; momentum/identity; DecisionLog from DB.

**Phase 3:** risk index, post-session debrief, forward steering.
