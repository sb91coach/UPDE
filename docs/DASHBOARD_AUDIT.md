# Dashboard audit — what’s active and what’s next

Use this to make sure everything works and all dashboard components are backed by real data and behaviour.

---

## 1. Component status

| Component | Status | Data / behaviour | Next step |
|-----------|--------|------------------|-----------|
| **Nav** (Profile, Programme, Check-in, Benchmarks) | ✅ Active | Links + pathname | None |
| **Performance Readiness dial** | ✅ Active | `profile.readiness_score` from Supabase | None |
| **Your programme** | ⚠️ Static | Hardcoded “Strength–Endurance Hybrid · Phase 2” | Derive from profile/phase or programme meta |
| **Headline** | ✅ Active | Based on `readiness_score` bands | None |
| **Meta row** (What’s holding you back, How you’re trending, Sessions this week) | ⚠️ Partial | `primary_limiter`, `momentum` from profile; “Sessions this week” is static “3 of 4 done” | Compute real sessions completed from `session_logs` (or profile) and show “X of Y done” |
| **Load / recovery bar** | ✅ Active | Derived from `aerobic_score`, `strength_*`, `sleep_score`, `mobility_score` | Optional: persist load/recovery in profile if needed elsewhere |
| **Daily check-in button** | ✅ Active | Opens modal; submit writes `checkin_*` to profile and refetches | None |
| **Today’s session card** | ⚠️ Static | Title/detail hardcoded “Lower Body Aerobic”, etc. Link goes to `/programme` | Drive from prescription: today’s session name, duration, intensity from programme engine |
| **Today’s advisories** | ✅ Active | `getAdvisories()` from engine using profile + check-in; updates after check-in submit | None |
| **Performance analysis grid** | ✅ Active | Domain values from profile (aerobic, sleep, mobility, strength, work capacity) | None |
| **Progress overview (chart)** | ⚠️ Mock | RemakerProgressBlock uses mock trend data (RPS, Weight, Velocity, Consistency) | Wire to real time-series (e.g. from `session_logs`, benchmarks, or a `metrics` table) |
| **Benchmarks** | ✅ Active | Top 4 from `profile.performance_benchmarks`; card links to `/benchmarks` | None |
| **Performance identity** | ⚠️ Partial | `identityLabel(profile)` is real; “Training focus”, “Capacity”, “Phase”, “Recovery style” are static | Derive from profile/engine or add profile columns |
| **Why this changed (Decision log)** | ✅ Active | Fetches `/api/decision-log`; shows entries from `decision_logs` | Ensure programme page logs decisions when adapting |
| **What this means for you (Signals)** | ⚠️ Static | Three hardcoded Signal cards | Generate from engine (e.g. brief, risk, limiter) or remove until wired |
| **Check-in modal** | ✅ Active | Form → profile update + refetch; advisories update | None |

**Legend:** ✅ Active = real data or real behaviour. ⚠️ Partial / Static = hardcoded or only partly wired. Mock = fake data for UI only.

---

## 2. Make “everything work” — priority order

1. **Today’s session card**  
   - Pass “today’s session” from programme/prescription (name, duration, intensity) into the dashboard (e.g. from an API or shared state) and render it instead of “Lower Body Aerobic” and “60 min · 4 exercises · Low–Mod intensity”.  
   - Keep the whole card linking to `/programme`.

2. **Sessions this week**  
   - Query `session_logs` (or use a profile field) for the current week and count completed sessions vs planned (e.g. 4).  
   - Replace “3 of 4 done” with “X of Y done”.

3. **Your programme**  
   - Replace “Strength–Endurance Hybrid · Phase 2” with a value from profile or programme (e.g. `profile.programme_name`, `profile.phase`, or first line of weekly brief).

4. **Progress overview chart**  
   - Add a simple time-series source (e.g. weekly readiness, volume, or benchmark history) and feed it into RemakerProgressBlock so the four lines (RPS, Weight, Velocity, Consistency) use real or derived metrics over time.

5. **Performance identity row**  
   - Replace static “Training focus”, “Capacity”, “Phase”, “Recovery style” with values from `identityModel` or profile (e.g. `systemBias`, capacity from benchmarks, phase from programme).

6. **What this means for you**  
   - Either generate 1–3 bullets from `weeklyBriefGenerator` / risk / advisories and render them as Signals, or hide this block until that’s implemented.

---

## 3. Animations added (this pass)

- **Readiness dial:** Gradient stroke (blue → teal), fade-in + scale on load, subtle glow pulse.  
- **Bridge:** Fade-in + slight translateY.  
- **Session card:** Fade-in with short delay.  
- **Section blocks:** Staggered fade-in + translateY (delay1–delay7).  
- **Load / recovery bars:** Width transition (1s) when values change.

---

## 4. Quick checks

- [ ] Log in → dashboard loads with your profile.  
- [ ] Daily check-in: submit → modal closes, “Today’s advisories” updates without reload.  
- [ ] “View programme”: whole session card navigates to `/programme`.  
- [ ] Benchmarks card links to `/benchmarks`.  
- [ ] Decision log shows entries if any exist in `decision_logs`.  
- [ ] Programme page: complete a session and/or log a decision → dashboard “Why this changed” and (when implemented) “Sessions this week” reflect it.

Once the items in §2 are done, all dashboard components will be active and consistent with the rest of the app.
