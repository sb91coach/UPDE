# Codebase Cleanup Summary

**Date:** 2025  
**Build:** `npm run build` passes.

---

## 1. Files Removed

### Duplicate configuration
- **next.config.js** — Kept `next.config.ts` as the single Next.js config.
- **postcss.config.js** — Kept `postcss.config.mjs` as the single PostCSS config.

### Stray / junk
- **app/components/Untitled** — Contained git commands, not component code.

### Unused application code
- **lib/getUserProfileData.ts** — Not imported anywhere.

### Unused engine modules
- **engine/identityClassifier.ts** — Not imported by app or lib.
- **engine/constraintModel.ts** — Not imported by app or lib.
- **engine/injuryModifier.ts** — Not imported by app or lib.
- **engine/nutritionModel.ts** — Not imported by app or lib.

**Comment update:** `lib/profile/identitySchema.ts` — Comment now references `lib/profile/identityModel` instead of removed `engine/identityClassifier`.

---

## 2. Imports and Variables Cleaned

### app/programme/page.tsx
- Removed: `getExerciseVideos`, `ProgrammeCard`, `ProgrammeInjuryAdjustment`, `expanded` / `setExpanded`, `router` (useRouter), `formatIntensityPct`, `sessions`, duplicate `usePathname()`.
- Added: `pathname = usePathname()` at top level (before any return) to satisfy React hook order.
- Removed: `Link` import (no longer used after nav extraction).

### app/components/UPDEDashboard.tsx
- Removed: `getAdvisories` import and `advisories`, `hasCheckinToday` variables.
- Removed: unused helpers `getBenchmarkKg`, `Signal`, `SessionCard`.
- `usePerformanceForecast` moved to top level and called unconditionally with `useMemo`-derived inputs so hooks are not conditional.

### app/strategy/page.tsx
- Removed from import: `loadStrategyGoals`, `addStrategyGoal`, `removeStrategyGoal`, `updateStrategyGoal`, `MilestoneProgressEntry` (kept `StrategyGoal`, `InjuryStatus`).

### app/api/injuries/route.ts
- Removed: `updateInjury` from static import (still used via dynamic import in the same file).

### app/api/garmin/connect/route.ts
- Parameter renamed: `req` → `_req` to mark unused.

### app/api/garmin/disconnect/route.ts
- Replaced unused destructured variable with `delete (rest as Record<string, unknown>).garmin_user_id` to avoid unused `_`.

### app/components/programme/DayAccordion.tsx
- Removed: `ExerciseData` from SessionBlock import (unused type).

### app/components/programme/WorkoutExerciseCard.tsx
- Prop `index` kept in interface but destructured as `_index` and voided to satisfy unused-variable lint; `tempo` removed from destructuring.

### app/components/NutritionMacroChart.tsx
- Removed: `toX`, `toY` from useMemo return and destructuring (only `paths`, `areas`, `minY`, `maxY` used).

### app/components/GoalProjectionChart.tsx
- Added: `isTime` to `useMemo` dependency array for `milestonePoints` to fix React hook / memoization warning.

---

## 3. React Hook Fixes

- **programme/page.tsx:** `usePathname()` moved to top of component (before `if (!profile) return null`) so hooks are not conditional.
- **UPDEDashboard.tsx:** `usePerformanceForecast` called unconditionally at top with `historicalPpsForForecast`, `adherenceForForecast`, `consistencyScoreForForecast` from `useMemo`/profile so hook order is stable.
- **SessionBlock.tsx:** `useState(blockIndex === 0)` for `mobileOpen` moved to top of component, before any early returns (performanceNotes / empty exercises).
- **DayAccordion.tsx:** Ref no longer read/updated during render; completion logic moved into `useEffect` that updates `completionRecordedRef` and `setCompletionTime` when `totalSets` / `completedSets` change.
- **GoalProjectionChart.tsx:** `useMemo` for `milestonePoints` dependency array updated to include `isTime`.

---

## 4. Components Refactored / Added

- **ProgrammeNavBar** (new): `app/components/programme/ProgrammeNavBar.tsx` — Extracted programme top nav (brand + tabs) and internal `NavTab` from `programme/page.tsx`. Programme page now renders `<ProgrammeNavBar pathname={pathname} />` and no longer defines `NavTab` or the nav markup inline.
- **programme/page.tsx** — Reduced by extraction of nav (~35 lines) and removal of unused code; behavior unchanged.

UPDEDashboard was not split further (e.g. DashboardPanels) to avoid risk; hook and import cleanups were done only.

---

## 5. Tailwind and Inline Styles

- No project-wide replacement of `style={{ }}` with Tailwind was done to avoid layout/visual regressions.
- Existing Tailwind usage and `globals.css` were left as-is.

---

## 6. Bundle Size

- No dedicated before/after bundle comparison was run. Removing dead code (unused engine modules, unused lib, duplicate configs) and unused imports can slightly reduce bundle size; impact was not measured.

---

## 7. Final Verification

- **TypeScript:** `next build` runs TypeScript; no type errors.
- **Build:** `npm run build` completes successfully.
- **Routes:** All listed app and API routes build and are present in the build output.

---

## Summary Table

| Category            | Action |
|---------------------|--------|
| Config files removed | 2 (next.config.js, postcss.config.js) |
| Stray files removed  | 1 (Untitled) |
| Unused lib removed   | 1 (getUserProfileData.ts) |
| Unused engine removed| 4 (identityClassifier, constraintModel, injuryModifier, nutritionModel) |
| Imports/vars cleaned | programme, UPDEDashboard, strategy, API routes, DayAccordion, WorkoutExerciseCard, NutritionMacroChart, GoalProjectionChart |
| Hook fixes           | programme (usePathname), UPDEDashboard (usePerformanceForecast), SessionBlock (useState), DayAccordion (ref in useEffect), GoalProjectionChart (useMemo deps) |
| New component        | ProgrammeNavBar (programme nav extracted from programme page) |
| Build                | Passes |
