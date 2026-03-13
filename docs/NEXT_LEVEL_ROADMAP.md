# Take it to the next level — roadmap

A single, ordered list of what to do next so the app feels complete, then differentiated.

---

## Tier 1 — Finish the loop (1–2 weeks)

**Goal:** Every dashboard and programme element is real. No more “3 of 4 done” or hardcoded session titles.

| # | What | Why |
|---|------|-----|
| 1 | **Today’s session card from real data** | Dashboard shows the actual session for today (name, duration, intensity) from the same logic as the programme page. Shared helper or API that returns “today’s session summary” for the dashboard. |
| 2 | **Sessions this week: real count** | Query `session_logs` (or profile) for current week; show “X of Y done” where Y = planned sessions (e.g. from programme days per week). |
| 3 | **Your programme line** | Replace “Strength–Endurance Hybrid · Phase 2” with `profile.programme_name` / `profile.phase` or first line of the weekly brief. Add columns to profile if needed. |
| 4 | **Performance identity row** | Derive “Training focus”, “Capacity”, “Phase”, “Recovery style” from `identityModel` and engine (e.g. `systemBias`, phase, capacity from benchmarks). |
| 5 | **“What this means for you” from engine** | Feed `generateWeeklyBrief` (or risk/advisories) into 1–3 Signal bullets; or hide the block until this is ready. |

**Outcome:** Dashboard is fully live. Users see their real programme, session, and progress at a glance.

---

## Tier 2 — Progress and history (2–3 weeks)

**Goal:** Real trends and a sense of improvement over time.

| # | What | Why |
|---|------|-----|
| 6 | **Progress chart with real data** | Store or derive time-series: e.g. weekly readiness, weekly volume, or benchmark history. Feed into RemakerProgressBlock (RPS / Weight / Velocity / Consistency or simplified metrics). Even 4–8 weeks of data makes the chart meaningful. |
| 7 | **Session logs + debriefs drive something** | Use `session_logs` and `session_debriefs` (niggles, how_felt, ready_next) to: (a) show “last session” on dashboard or programme, (b) feed into fatigue/risk so next week can adapt. |
| 8 | **Fatigue/risk in prescription** | Pass `fatigueScore` and `riskIndex` into the programme builder; when risk is high, reduce volume or intensity and log a decision. Decision log already exists; wire the trigger. |

**Outcome:** The app feels like it “remembers” training and adapts. Progress chart is a real motivator.

---

## Tier 3 — Differentiation (3–6 weeks)

**Goal:** Features that make Performance Pathfinder stand out (Train Heroic / VBT / Fitr / Everfit style).

| # | What | Why |
|---|------|-----|
| 9 | **Weekly brief as the “coach voice”** | One clear “why this week” and “what we’re working on” from `generateWeeklyBrief` (phase, limiter, recovery). Show on programme and optionally on dashboard. |
| 10 | **Identity-driven programme bias** | Use `identityModel` (Neural / Aerobic deficit / Recovery-limited / Hybrid) to nudge emphasis (e.g. more aerobic, more neural, or more recovery) in the programme builder. |
| 11 | **Rest timer + simple session logging** | In-session: rest timer and “log set” (weight/reps or RPE) so users can track what they did. Store in `session_logs` or a `session_sets` table. |
| 12 | **Velocity or RPE autoregulation** | Optional: if you add velocity or consistent RPE logging, use it to auto-adjust next session (e.g. “last session was heavy, today we hold”). |
| 13 | **Calendar / week view** | Fitr/Everfit-style: one view of the week (Mon–Sun) with planned vs completed sessions. Reuse “sessions this week” and session_logs. |
| 14 | **Export or share** | PDF of the week’s programme, or shareable “this week’s focus” for coach or accountability. |

**Outcome:** The product feels like a coaching system, not just a programme viewer.

---

## Tier 4 — Polish and scale (ongoing)

- **Onboarding:** First-time flow (goal, sport, experience → set phase, limiter, benchmarks).
- **Notifications / reminders:** “Time for your check-in” or “Session planned today” (email or push if you add a backend job).
- **Mobile PWA:** You have responsive + “save to home screen”; add offline-friendly programme view or cached dashboard.
- **Multi-athlete / coach view:** If you ever target coaches, a dashboard that shows multiple athletes and their readiness/decisions.

---

## Suggested order to start

1. **This week:** Do Tier 1 items **1, 2, 3** (today’s session card, sessions this week, your programme line). Small, visible wins.
2. **Next week:** Tier 1 items **4, 5** (identity row, “what this means for you”).
3. **Then:** Tier 2 (progress chart real data, session/debrief feeding fatigue, fatigue in prescription).
4. **Then:** Pick 2–3 Tier 3 items that match your vision (e.g. weekly brief + rest timer + calendar).

Use **DASHBOARD_AUDIT.md** for the exact “next step” per component and **IMPLEMENTATION_ROADMAP.md** for Phase 2/3 engine details. This doc is the “what order to do it in” to take the app to the next level.
