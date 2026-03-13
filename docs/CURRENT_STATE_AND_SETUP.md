# UPDE (Performance Pathfinder) — Full Review & Current Setup

**Copy everything below this line to share with ChatGPT.**

---

## 1. What UPDE Is

UPDE is a **Human Performance Operating System** (not a workout logger). It is built as a **predictive, adaptive, coaching-grade performance system** that:

- Prescribes training from benchmarks and readiness (percentage-based and RPE fallbacks).
- Remembers injuries and applies guardrails (intensity caps, no explosive work when injured).
- Tracks risk (overload, neural strain, recovery compression) and surfaces it on the dashboard.
- Classifies identity (Neural Dominant, Aerobic Deficit, Recovery Limited, Hybrid Balanced) and system bias.
- Generates a weekly strategic brief and decision transparency log (why the programme changed).
- Uses a minimal, dark “OS” UI with clear hierarchy and no clutter.

---

## 2. Tech Stack

- **Framework:** Next.js 16 (App Router), React 19.
- **Auth & DB:** Supabase (auth, `profiles` table, RLS).
- **Styling:** Tailwind 4, styled-jsx in components, dark theme.
- **Payments:** Stripe (billing portal; customer created on first “Manage subscription” if no `stripe_customer_id`).
- **Other:** TypeScript, Geist fonts.

---

## 3. Environment & Config

- **Env file:** `.env.local` (from `.env.example`).
- **Required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- **Optional:** `STRIPE_SECRET_KEY`, `STRIPE_CUSTOMER_PORTAL_RETURN_URL`, `GARMIN_CONSUMER_KEY` / `GARMIN_CONSUMER_SECRET`.
- **Scripts:** `npm run dev`, `npm run build`, `npm run start`, `npm run db:print-preferences-migration` (prints SQL for user_preferences migration).

---

## 4. Routes & Auth

| Route        | Protected | Purpose |
|-------------|-----------|---------|
| `/`         | No        | Landing / hero; Login & Sign Up buttons. |
| `/login`    | No        | Email/password login (Supabase). |
| `/signup`   | No        | Sign up. |
| `/intake`   | No*       | Onboarding / intake. |
| `/profile`  | **Yes**   | Main dashboard (readiness, session card, PPS chart, benchmarks link, identity, performance adjustments). |
| `/programme`| **Yes**   | Weekly programme: brief, advisories, sessions with ProgrammeCard, completion, debrief. |
| `/checkin`  | **Yes**   | Redirects to `/profile` (check-in is a modal on profile). |
| `/benchmarks`| **Yes**  | Edit strength/CV/power benchmarks (1RM, MAS, etc.). |
| `/settings` | **Yes**   | Profile link, subscription, Stripe portal, preferences, marketing, Garmin (connect/disconnect), privacy. |
| `/u/[id]`   | No*       | Public share (if used). |

**Auth:** `lib/requireAuth.tsx` exposes `RequireAuth` and `useRequireAuth()`. Protected pages wrap content in `<RequireAuth>`; unauthenticated users see a loading state then redirect to `/login`. No protected content flashes.

---

## 5. Supabase Schema (Migrations)

- **profiles** — Core user state: readiness_score, aerobic_score, strength_upper/lower, mobility_score, sleep_score, stress_level, fatigue_score, primary_limiter, momentum, focus, goal, days_per_week, minutes_per_session, current_week, deload_active, performance_benchmarks (jsonb), checkin_* (daily check-in), last_session_focus, user_preferences (jsonb).
- **decision_logs** — Transparency log: profile_id, decision_type, trigger_variables (jsonb), threshold_breached, adjustment_made, explanation.
- **session_logs** — Completed sessions: profile_id, week, session_name, completed, perceived_exertion.
- **session_debriefs** — Post-session: how_felt, niggles, ready_next.
- **user_injury_log** — Injury memory: profile_id, body_part, severity (1–10), context, first_reported, last_reported, resolved, resolved_at, classification, risk_level (low|moderate|high).

Migrations live in `supabase/migrations/` (run manually or via Supabase CLI).

---

## 6. API Routes

- `GET/PATCH /api/settings` — Read/update user_preferences (weight_unit, session_reminders, marketing, garmin_connected, stripe_customer_id, etc.).
- `POST /api/stripe-portal` — Create Stripe billing portal session; creates customer if missing and stores stripe_customer_id in user_preferences.
- `POST /api/garmin/connect` — Set garmin_connected in user_preferences (soft connect when no Garmin keys).
- `POST /api/garmin/disconnect` — Clear Garmin connection.
- `GET /api/injuries` — List user_injury_log entries.
- `POST /api/injuries` — Log or re-report injury (upsert by body_part when unresolved).
- `PATCH /api/injuries/[id]` — Resolve or update injury.
- `GET /api/decision-log` — Last N decision log entries.
- `POST /api/decision-log` — Insert decision (e.g. when guardrails applied).
- `GET /api/today-session` — Today’s session summary and sessions this week.
- `POST /api/profile` — Update profile (check-in, benchmarks, etc.).

---

## 7. Engines (Intelligence Layer)

All under `engine/`:

- **benchmarkEngine.ts** — getBenchmark, getEffectiveOneRM, updateBenchmark, estimateOneRM (Epley), validateBenchmark, workingWeightFrom1RM.
- **prescriptionEngine.ts** — prescribe() (sets×reps @ % or RPE), prescribeAerobic() (MAS-based or RPE/conversational).
- **fatigueModel.ts** — fatigueScore, recoveryBandwidth (adequate|compressed|critical).
- **riskIndex.ts** — getRiskSignals: fatigueRisk, adaptationRisk, overloadRisk, neuralStrain, recoveryCompression.
- **momentumEngine.ts** — adaptationVelocity, frictionIndex.
- **systemBias.ts** — classifySystemBias, systemBiasPhrase (Strength-dominant, Aerobic-dominant, etc.).
- **identityClassifier.ts** / **lib/profile/identityModel.ts** — classifyIdentity, identityToSpecLabel (Neural Dominant, Aerobic Deficit, Recovery Limited, Hybrid Balanced).
- **weeklyBriefGenerator.ts** — generateWeeklyBrief (phase intent, system bias, primary limiter, recovery bandwidth, whyThisWeek; coach-voice).
- **decisionLog.ts** — logDecision(supabase, profileId, payload) for transparency.
- **advisoriesEngine.ts** — getAdvisories (daily advisories from check-in).
- **constraintModel.ts** — constraintVolatility, getConstraintRecommendations (work_stress, travel_week, cognitive_load).
- **injuryMemoryEngine.ts** — logInjury, updateInjury, resolveInjury, getActiveInjuries, classifyInjury, calculateInjuryRisk.
- **injuryModifier.ts** — getInjuryModifiers (knee → reduce knee-dominant, no plyometrics, etc.; shoulder → no overhead, etc.; tendon → reduce eccentric, more isometric).
- **adaptiveGuardrails.ts** — getAdaptiveGuardrails (maxIntensity, removeExplosive, maxWeeklySessions, submaxBias, addFlushSession), applyIntensityCap.

Programme page uses guardrails: fetches injuries, computes guardrails, caps prescribe() intensity via applyIntensityCap, and POSTs to decision-log when guardrails apply.

---

## 8. Profile & Schema Helpers

- **lib/profile/benchmarkSchema.ts** — PerformanceBenchmarks, exerciseBenchmarks, aerobicBenchmarks, powerBenchmarks, EXERCISE_KEY_TO_BENCHMARK, EXERCISE_DISPLAY_NAMES, BENCHMARK_SECTIONS.
- **lib/profile/identityModel.ts** — classifyIdentity, identityLabel.
- **lib/profile/identitySchema.ts** — IdentityLabel, IDENTITY_LABELS.
- **lib/profile/benchmarkExerciseOptions.ts** — OPTIONS_BY_SECTION for benchmarks page.

---

## 9. UI Components (app/ui & app/components)

- **ProgrammeCard** — Premium session card: block title, duration, intensity, primary focus, exercises with letter, prescription, rest.
- **RemakerProgressBlock** — PPS (Performance Pathfinder Score) chart: tabs PPS/Weight/Velocity/Consistency; active line glow; mock trend data.
- **WeeklyBrief** — Phase intent, system bias, primary limiter, recovery bandwidth, whyThisWeek.
- **DecisionLog** — List of decision log entries (adjustment, triggers, threshold, explanation).
- **RiskBadge** — Surfaces overloadRisk, neuralStrain, recoveryCompression when not all low/stable (on dashboard).
- **DailyAdvisories** — Today’s advisories from getAdvisories.
- **BenchmarkManager** — Simple benchmark display (dashboard); full edit on `/benchmarks` page.
- **BodyReportChart** — Body report visualisation if used.
- **UPDEDashboard** — Main profile/dashboard: readiness gauge, identity row, session card, PPS block, benchmarks link, performance identity, performance adjustments (this week, readiness, advisory), risk badge when relevant.
- **OSLayer** — Top bar (Dashboard, AI, Settings links), main content area, floating AI orb.
- **SettingsView** — Sections: Profile, Subscription, Stripe gateway, Preferences, Marketing, Wearables (Garmin), Privacy.

---

## 10. Key User Flows

1. **Landing → Login/Signup → Intake (optional) → Profile.**
2. **Profile:** Readiness, today’s session, PPS chart, benchmarks link, identity, performance adjustments; daily check-in modal; nav to Programme, Check-in, Benchmarks, Settings.
3. **Programme:** Weekly brief + performance adjustments; expandable days with ProgrammeCard and blocks; Mark Complete → debrief modal; intensity and volume adapted by readiness/fatigue and by injury guardrails.
4. **Benchmarks:** Strength / CV / Power sections; add exercises; save to profiles.performance_benchmarks.
5. **Settings:** Preferences (units, notifications, marketing), Stripe portal (subscription/payments), Garmin connect/disconnect.

---

## 11. What’s Implemented vs Not

- **Done:** Auth, route protection, dashboard, programme with prescription and guardrails, benchmarks CRUD, settings with preferences and Stripe/Garmin, injury memory and API, decision log and guardrail logging, weekly brief, risk index, identity/momentum engines, PPS chart (mock data), constraint model (logic only).
- **Not wired / partial:** Real PPS time-series data, Garmin OAuth, behaviour drift engine, pattern detection engine, contextual follow-up (e.g. “How is your knee today?”), dashboard “active injury alert” tile, middleware-based auth (currently client-side RequireAuth only).

---

## 12. Project Layout (Summary)

```
app/
  page.tsx (home), login, signup, intake
  profile/page.tsx (dashboard, RequireAuth)
  programme/page.tsx (weekly programme, RequireAuth)
  checkin/page.tsx (redirect to profile, RequireAuth)
  benchmarks/page.tsx (RequireAuth)
  settings/page.tsx (RequireAuth)
  api/ (settings, stripe-portal, garmin, injuries, decision-log, today-session, profile)
  components/ (UPDEDashboard, OSLayer, SettingsView, …)
  ui/ (ProgrammeCard, WeeklyBrief, DecisionLog, RiskBadge, RemakerProgressBlock, …)
engine/ (all .ts engines above)
lib/ (requireAuth, supabaseClient, supabaseServer, profile/*, …)
supabase/migrations/ (profiles, decision_logs, session_*, user_injury_log, user_preferences, …)
```

---

Use this as the single source of truth for “where we are” and “current setup” when briefing ChatGPT or onboarding.
