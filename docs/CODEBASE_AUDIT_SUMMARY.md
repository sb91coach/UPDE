# Codebase Audit Summary

**Generated:** 2025  
**Scope:** Full repository scan (app, lib, engine, types, hooks, data, api, supabase, docs, scripts).

---

## 1. Project Structure

### Root
```
upde-app/
├── app/                    # Next.js App Router
├── engine/                 # Business logic (prescription, risk, capacity, etc.)
├── lib/                    # Shared utilities, Supabase, stores, adapters
├── types/                  # TypeScript type definitions
├── data/                   # Static data (programmes)
├── hooks/                  # React hooks (usePerformanceForecast)
├── scripts/               # One-off scripts (migrations)
├── supabase/migrations/    # SQL migrations
├── public/                 # Static assets
├── docs/                   # Documentation (roadmaps, exports, architecture)
├── package.json
├── next.config.ts          # Next.js config (see duplicate note below)
├── next.config.js          # Duplicate legacy config
├── tailwind.config.js      # Tailwind v3-style (see Tailwind section)
├── postcss.config.mjs      # PostCSS (Tailwind v4)
├── postcss.config.js       # Duplicate PostCSS config
├── tsconfig.json
├── eslint.config.mjs
└── .gitignore
```

### app/
```
app/
├── layout.tsx
├── page.tsx                # Landing
├── globals.css
├── api/                    # Route handlers
│   ├── behaviour-drift/route.ts
│   ├── decision-log/route.ts
│   ├── garmin/connect/route.ts
│   ├── garmin/disconnect/route.ts
│   ├── injuries/route.ts
│   ├── injuries/[id]/route.ts
│   ├── profile/route.ts
│   ├── settings/route.ts
│   ├── stripe-portal/route.ts
│   └── today-session/route.ts
├── components/             # Shared UI components
│   ├── AIContainer.tsx
│   ├── AthleteHomeDashboard.tsx
│   ├── BodyCompositionModal.tsx
│   ├── CapacityRadarSix.tsx
│   ├── ForecastSummary.tsx
│   ├── FuelStrategyTool.tsx
│   ├── GoalCategoryDetails.tsx
│   ├── GoalInputCard.tsx
│   ├── GoalProjectionChart.tsx
│   ├── InjuryStatusPanel.tsx
│   ├── LogMacrosModal.tsx
│   ├── MacroSummaryCards.tsx
│   ├── MilestoneUpdateModal.tsx
│   ├── MobileBottomNav.tsx
│   ├── NutritionMacroChart.tsx
│   ├── OSLayer.tsx
│   ├── RoadmapTimeline.tsx
│   ├── SettingsView.tsx
│   ├── StrategyAdjustmentsPanel.tsx
│   ├── StrategyKPIPanel.tsx
│   ├── UPDEDashboard.tsx
│   ├── Untitled              # ⚠️ Not a component – stray file (see §9)
│   └── programme/
│       ├── DayAccordion.tsx
│       ├── ExerciseCard.tsx
│       ├── ProgrammeWeekView.tsx
│       ├── RestTimer.tsx
│       ├── SessionBlock.tsx
│       ├── SessionOverview.tsx
│       ├── SessionProgress.tsx
│       ├── SessionSummary.tsx
│       ├── SetTracker.tsx
│       ├── WeekCalendarView.tsx
│       ├── WeekSelector.tsx
│       ├── WorkoutExerciseCard.tsx
│       └── WorkoutSessionView.tsx
├── ui/                    # Presentational / layout UI
│   ├── BenchmarkManager.tsx
│   ├── BodyReportChart.tsx
│   ├── DailyAdvisories.tsx
│   ├── DecisionLog.tsx
│   ├── ProgrammeCard.tsx
│   ├── RemakerProgressBlock.tsx
│   ├── RiskBadge.tsx
│   └── WeeklyBrief.tsx
├── benchmark/page.tsx
├── coach/page.tsx
├── dashboard/page.tsx
├── intake/page.tsx
├── login/page.tsx
├── nutrition/page.tsx
├── profile/page.tsx
├── programme/page.tsx
├── settings/page.tsx
├── signup/page.tsx
├── strategy/page.tsx
├── tactical/page.tsx
├── tactical/command/page.tsx
├── tactical/input/page.tsx
├── tactical/map/page.tsx
├── tactical/radar/page.tsx
└── u/[id]/page.tsx
```

### engine/
```
engine/
├── adaptiveGuardrails.ts
├── advisoriesEngine.ts
├── behaviourDriftModel.ts
├── benchmarkEngine.ts
├── capacityEngine.ts
├── capacityWeighting.ts
├── constraintModel.ts        # ⚠️ Not imported by app/lib (see §3)
├── decisionLog.ts
├── fatigueModel.ts
├── identityClassifier.ts     # ⚠️ Not imported by app/lib (see §3)
├── injuryMemoryEngine.ts
├── injuryModifier.ts         # ⚠️ Not imported by app/lib (see §3)
├── momentumEngine.ts
├── nutritionModel.ts         # ⚠️ Not imported (see §3)
├── prescriptionEngine.ts
├── riskIndex.ts
├── systemBias.ts
└── weeklyBriefGenerator.ts
```

### lib/
```
lib/
├── adaptive/
│   ├── adaptiveController.ts
│   ├── athleteState.ts
│   ├── exerciseSubstitution.ts
│   ├── readinessAnalysis.ts
│   ├── sessionFeedbackParser.ts
│   └── trainingAdjustment.ts
├── profile/
│   ├── benchmarkExerciseOptions.ts
│   ├── benchmarkSchema.ts
│   ├── identityModel.ts
│   ├── identitySchema.ts
│   └── identityModel.ts
├── athleteState.ts
├── exerciseVideos.ts
├── feedbackInterpreter.ts
├── forecastEngine.ts
├── fuelingEngine.ts
├── getUserProfileData.ts      # ⚠️ Not imported anywhere (see §3)
├── goalEngine.ts
├── nutritionStore.ts
├── performanceDataEngine.ts
├── performanceEngine.ts
├── performanceEvents.ts
├── readinessAlgorithm.ts
├── requireAuth.tsx
├── session.ts
├── strategyAdjustmentsEngine.ts
├── strategyStore.ts
├── supabaseClient.ts
├── supabaseServer.ts
├── tacticalMapData.ts
├── tacticalReadinessStorage.ts
├── timeFormatter.ts
├── timeInputParser.ts
├── todaySessionSummary.ts
├── trajectoryEngine.ts
├── trainingTargets.ts
└── trajactoryEngine.ts       # (if present: typo duplicate of trajectoryEngine)
```

### types/
```
types/
├── capacity.ts
├── coachingData.ts
├── coachingRoles.ts      # Not imported by app
├── equipment.ts         # Not imported by app
├── exerciseIntelligence.ts
├── forecast.ts
├── programmeGeneration.ts
├── readinessModel.ts
├── session.ts           # Not imported by app
└── ...
```

---

## 2. Total Number of Components

| Category | Count |
|----------|--------|
| **Page components** (app/**/page.tsx) | 18 |
| **app/components** (including programme/) | 35 |
| **app/ui** | 8 |
| **Total React components (TSX)** | **62** |
| **Lib TSX** (e.g. requireAuth.tsx) | 1 |

*Counts exclude the stray file `app/components/Untitled`.*

---

## 3. Duplicate or Unused Files

### Duplicate / redundant config
- **next.config.js** and **next.config.ts** – Same intent; Next 16 typically uses `next.config.ts`. Consider removing `next.config.js`.
- **postcss.config.js** and **postcss.config.mjs** – Both configure `@tailwindcss/postcss`. One is enough (e.g. keep `postcss.config.mjs`).

### Unused in application code
- **lib/getUserProfileData.ts** – Not imported anywhere (only referenced in docs). Safe to remove or wire into profile/settings if needed.
- **engine/identityClassifier.ts** – Only mentioned in a comment in `lib/profile/identitySchema.ts`; no imports.
- **engine/constraintModel.ts** – Not imported by app or lib.
- **engine/injuryModifier.ts** – Not imported by app or lib.
- **engine/nutritionModel.ts** – Not imported.

### Types not imported by app
- **types/coachingRoles.ts**, **types/equipment.ts**, **types/session.ts** – No `from "@/types/..."` imports found in app. May be used only by lib/engine or not at all.

### Stray / junk file
- **app/components/Untitled** – Contains git commands (`git add`, `commit`, `push`), not component code. Should be removed or renamed; does not belong in `components/`.

---

## 4. Heavy Dependencies (package.json)

| Package | Role | Notes |
|---------|------|--------|
| **next** 16.1.6 | Framework | Core; reasonable. |
| **react** / **react-dom** 19.2.3 | UI | Core. |
| **@supabase/supabase-js** ^2.97 | Backend / auth | Main data layer; substantial. |
| **@supabase/ssr** ^0.8.0 | Server-side Supabase | Small. |
| **openai** ^6.22.0 | AI / coach | Can be heavy; ensure tree-shaking or lazy use. |
| **react-markdown** ^10.1.0 | Markdown | Moderate; only load where needed. |
| **stripe** ^20.4.0 | Payments | Server-only; acceptable. |

**Dev:** Tailwind v4, PostCSS, TypeScript, ESLint, patch-package. No chart/UI libraries; custom SVG/components used.

**Overall:** Dependency set is moderate. Heaviest runtime cost is likely Supabase + OpenAI usage and how they are loaded (e.g. avoid pulling OpenAI into client bundles).

---

## 5. Pages with Large Code Size

| File | Lines | Note |
|------|--------|------|
| **app/components/UPDEDashboard.tsx** | **2,190** | Very large; many concerns in one file. Prime candidate for splitting (e.g. panels, sections, hooks). |
| **app/programme/page.tsx** | **1,893** | Single page holds week/session build, modals, checkin, debrief, nav. Should be split into hooks + subcomponents. |
| **app/tactical/page.tsx** | 804 | Large; consider extracting sections. |
| **app/components/SettingsView.tsx** | 642 | Large settings UI; could be split by section. |
| **app/strategy/page.tsx** | 620 | Strategy logic + UI; extract strategy-specific components/hooks. |
| **app/tactical/input/page.tsx** | 552 | Large form; consider step components or sub-views. |
| **app/tactical/radar/page.tsx** | 474 | |
| **app/tactical/map/page.tsx** | 433 | |
| **app/tactical/command/page.tsx** | 415 | |
| **app/benchmarks/page.tsx** | 415 | |

**Recommendation:** Prioritise extracting logic and UI from **UPDEDashboard.tsx** and **programme/page.tsx** (e.g. custom hooks, 200–400 line components, shared programme/session types).

---

## 6. Unused Imports / Variables (ESLint)

Summary of **unused imports/vars** and **no-unused-vars**-style issues (from `npm run lint` / ESLint):

- **app/programme/page.tsx:** `getExerciseVideos`, `ProgrammeCard`, `ProgrammeInjuryAdjustment`, `expanded`, `setExpanded`, `router`, `formatIntensityPct`, `sessions` (unused).
- **app/components/UPDEDashboard.tsx:** `advisories`, `hasCheckinToday`, `getBenchmarkKg`, `Signal`, `SessionCard` (unused).
- **app/components/programme/DayAccordion.tsx:** `ExerciseData` (unused type import).
- **app/components/programme/WorkoutExerciseCard.tsx:** `index`, `tempo` (unused).
- **app/components/GoalProjectionChart.tsx:** `isTime` (unused).
- **app/components/NutritionMacroChart.tsx:** `toX`, `toY` (unused).
- **app/strategy/page.tsx:** `loadStrategyGoals`, `addStrategyGoal`, `removeStrategyGoal`, `updateStrategyGoal`, `MilestoneProgressEntry` (unused).
- **app/api/injuries/route.ts:** `updateInjury` (unused).
- **app/api/garmin/connect/route.ts:** `req` (unused param).
- **app/api/garmin/disconnect/route.ts:** `_` (unused).

**Recommendation:** Run lint with autofix where possible and remove or use the listed symbols to reduce noise and bundle size.

---

## 7. Components That Re-render Excessively (or At Risk)

Findings from ESLint **react-hooks** and patterns in the codebase:

### setState in effects (cascading / extra renders)
- **BodyCompositionModal.tsx** – `setState` in effect to sync from `getBodyComposition()`.
- **GoalCategoryDetails.tsx** – `setState` in effect for `targetTimeDisplay` / `currentTimeDisplay`.
- **GoalProjectionChart.tsx** – `setMounted(true)` in effect; useMemo deps mismatch with `isTime`.
- **InjuryStatusPanel.tsx** – Syncing props to local state in effect.
- **LogMacrosModal.tsx** – Resetting form state in effect when `isOpen` changes.
- **SetTracker.tsx** – `setRows` in effect when `sets` count changes.
- **nutrition/page.tsx** – `refreshMacroLogs` / `refreshBodyComposition` and `setStrategicInsights` in effects.
- **strategy/page.tsx** – setState in effect.

**Recommendation:** Prefer initial state from props or lazy init; for sync-from-external use effects that only subscribe and call setState in callbacks, or derive state where possible.

### Hooks used conditionally (rules-of-hooks)
- **app/programme/page.tsx** – `usePathname` called after early `if (!profile) return null` (conditional hook).
- **app/components/UPDEDashboard.tsx** – `usePerformanceForecast` called conditionally.
- **app/components/programme/SessionBlock.tsx** – `useState` called conditionally (after early return).

**Recommendation:** Move all hook calls to the top level so they run in the same order every render; no hooks after early returns.

### Ref access during render
- **app/components/programme/DayAccordion.tsx** – `completionRecorded.current` read and updated during render. Should be moved to effect or event handler.

### Inline objects/functions as props
- Widespread use of `style={{ ... }}` and inline callbacks (e.g. `onClick={() => setX(...)}`) in programme and tactical pages. Not necessarily wrong but can cause child re-renders; consider `useCallback` / stable refs for hot paths and list items.

**Summary:** The main re-render and correctness risks are: conditional hooks (programme, UPDEDashboard, SessionBlock), setState-in-effect patterns (multiple components), and ref-in-render in DayAccordion. Fixing these will improve stability and performance.

---

## 8. Tailwind Configuration and Potential CSS Bloat

### Current setup
- **Tailwind v4** is used via `@tailwindcss/postcss` in **postcss.config.mjs** (and duplicated in postcss.config.js).
- **app/globals.css** uses `@import "tailwindcss"` (v4 style).
- **tailwind.config.js** exists with v3-style `content`, `theme`, `plugins`. With Tailwind v4 + PostCSS, this file may be ignored; content is typically scanned from source.

### Potential bloat
- **content paths:** If both v3 config and v4 are in use, ensure only one content scan is active. v4 usually scans from the same app/components paths; avoid scanning `node_modules` or build artifacts.
- **Inline styles:** Many components use inline `style={{ }}` (e.g. programme, OSLayer, tactical). That doesn’t increase Tailwind bundle but does mix concerns; consider moving to Tailwind classes where possible for consistency and smaller JS.
- **Custom CSS in components:** Large components (e.g. UPDEDashboard, programme page, DecisionLog) contain `<style jsx>` or inline `<style>` blocks. This is valid but scatters CSS; consider centralising in globals or CSS modules if it grows.
- **No purge/safelist issues reported:** With correct content paths, Tailwind v4 should only ship classes used in the scanned files.

**Recommendation:** Rely on a single Tailwind/PostCSS config (e.g. postcss.config.mjs + v4); remove or clearly deprecate tailwind.config.js and the duplicate postcss.config.js. Audit that no build step still depends on the old config.

---

## 9. Unnecessary or Suspicious Files in the Repo

| File | Issue |
|------|--------|
| **app/components/Untitled** | Not a component; contains git commands. Remove or move out of app. |
| **next.config.js** | Redundant if next.config.ts is used. Remove to avoid confusion. |
| **postcss.config.js** | Duplicate of postcss.config.mjs. Keep one. |
| **lib/getUserProfileData.ts** | Unused; remove or integrate. |
| **engine/identityClassifier.ts** | Unused; remove or wire (e.g. identity row). |
| **engine/constraintModel.ts** | Unused; remove or wire. |
| **engine/injuryModifier.ts** | Unused; remove or wire. |
| **engine/nutritionModel.ts** | Unused; remove or wire. |

**docs/** and **scripts/** are appropriate for a repo; no need to remove unless they are obsolete.

---

## Summary Table

| Area | Finding |
|------|--------|
| **Structure** | Clear app / engine / lib / types separation; some duplicate configs. |
| **Components** | 62 TSX components; 2 very large (UPDEDashboard, programme page). |
| **Duplicates / unused** | 2 config duplicates; 1 stray file; 5+ unused engine/lib modules; 3 types not used by app. |
| **Dependencies** | Moderate; Supabase + OpenAI are the heaviest; no unnecessary UI libs. |
| **Large pages** | UPDEDashboard (2190), programme (1893), tactical (804), strategy (620), others 400–650. |
| **Unused imports** | Multiple across programme, UPDEDashboard, strategy, api routes, programme components. |
| **Re-renders / hooks** | setState-in-effect in 8+ places; conditional hooks in 3 files; ref-in-render in DayAccordion. |
| **Tailwind** | v4 + PostCSS; second config and duplicate PostCSS may cause confusion; inline styles widespread. |
| **Unnecessary files** | Untitled, duplicate configs, 4–5 unused engine files, 1 unused lib file. |

---

*End of audit.*
