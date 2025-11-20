# Foundational Upgrades Implementation Plan

_Completed on 2025-11-20 (Tasks 1–6 implemented; Task 7 covered by regression checks as needed)_

**Goal:** Stabilize trip state handling by fixing currency display behavior, date math, usage cleanup, sorting, and adding import/export plus shareable links.

**Architecture:** Keep the existing localStorage-backed `TripState`, but extend it with `version` metadata, persisted `displayCurrency`, and helper utilities for encoding/decoding state. Touch only the relevant client components and utilities so we can later migrate to a richer store without regressions.

**Tech Stack:** Next.js App Router, React 19 client components, TypeScript, built-in browser APIs (localStorage, `URL`), Node `Buffer`/`TextEncoder` polyfills when needed, `zlib` via `pako` for optional compression (added dependency).

### Task 1: Persist Display Currency & Support Link Overrides

**Files:**
- Modify: `src/constants/initialState.ts:1-17`
- Modify: `src/types/index.ts`
- Modify: `src/hooks/useLocalStorage.ts`
- Modify: `src/app/budget/page.tsx`
- Modify: `src/app/layout.tsx` (inject URL currency handling via context/provider)
- Create: `src/providers/DisplayCurrencyProvider.tsx`
- Modify: `src/components/Header.tsx` (optional indicator)

**Steps:**
1. Update `TripState` and `initialTripState` to include `displayCurrency` + `version: 1`.
2. Extend `useLocalStorage` to accept an optional migration function that can upgrade older records (noop for now).
3. Build `DisplayCurrencyProvider` (client) that reads `displayCurrency` from trip state and exposes `displayCurrency` + setter + `isApproximate(fromCurrency)` helper via React context.
4. Wrap `children` with this provider inside `layout.tsx`.
5. Refactor `src/app/budget/page.tsx` to consume the provider instead of calling `useLocalStorage` for `displayCurrency`, ensuring manual selections persist back into trip state.
6. Ensure `formatCurrency` calls receive `isApproximation=true` whenever `expense.currency !== displayCurrency` (update call sites in budget/usage summaries).
7. Manually verify by running `npm run dev`, entering mixed-currency expenses, switching the currency via the select, refreshing, and confirming the selection persists and approximate indicators render correctly.

### Task 2: Fix Exclusive Date Math & Per-Day Calculations

**Files:**
- Modify: `src/utils/tripStateUpdates.ts`
- Modify: `src/app/setup/page.tsx`
- Modify: `src/app/travelers/page.tsx`
- Modify: `src/app/expenses/page.tsx`
- Modify: `src/app/usage/page.tsx`
- Modify: `src/app/budget/page.tsx`
- Create: `src/utils/__tests__/tripStateUpdates.test.ts`

**Steps:**
1. Introduce helper `getDayCount(start, end)` that treats end dates as exclusive (so staying Jan 1–5 charges four days). Update `generateDaysForDateRange` to stop before `endDate` and document the behavior.
2. Clamp traveler/expense dates using the exclusive logic (i.e., a traveler ending on the 5th is removed from any day with date >= end date).
3. Update expense forms to validate that `endDate` is strictly greater than `startDate`, and fix the per-day preview to use the new helper so entering daily price keeps totals correct.
4. Adjust usage rendering filters to rely on the exclusive range (traveler active when `date >= startDate && date < endDate`).
5. Update budget calculations (`calculateDailyCost`) to divide by the exclusive day count.
6. Manual QA: create a trip from 2025-01-01 to 2025-01-05, add a shared expense for £100 total, confirm the UI shows 4 days and £25/day, and ensure marking usage on the last day is impossible.

### Task 3: Clean Up Usage When Editing Expenses

**Files:**
- Modify: `src/utils/tripStateUpdates.ts`
- Modify: `src/app/expenses/page.tsx`
- Modify: `src/app/usage/page.tsx`

**Steps:**
1. Export the existing `removeExpense` helper and ensure it scrubs references for both daily and one-time expenses (already present but unused); add unit tests if you extended functionality.
2. In each delete handler inside `ExpensesPage`, replace the manual array filter with a call to `removeExpense`, updating `tripState` via `setTripState(removeExpense(...))`.
3. Fix the “Clear” button for daily shared expenses (`UsagePage` around lines 200-220) so it actually empties `dailyShared[expense.id]` instead of `dailyPersonal`.
4. When copying from previous day, ensure new arrays are cloned (not reused references) to avoid accidental shared state.
5. Manual QA: add travelers + expenses, toggle usage, delete the expense, and confirm toggles disappear immediately and budget totals drop to zero.

### Task 4: Alphabetize Travelers Consistently

**Files:**
- Modify: `src/app/travelers/page.tsx`
- Modify: `src/utils/tripStateUpdates.ts` (optional helper `sortTravelers`)

**Steps:**
1. After any mutation to `tripState.travelers` (add/update/remove), sort by `name.localeCompare` (case-insensitive) before persisting.
2. Ensure `updateTravelerDates` also returns travelers sorted to keep reducers consistent.
3. Manual QA: add travelers A, C, B in random order and verify the list and usage tables render alphabetically after each change.

### Task 5: JSON Export/Import with Versioning

**Files:**
- Modify: `src/types/index.ts`
- Modify: `src/constants/initialState.ts`
- Modify: `src/hooks/useLocalStorage.ts`
- Create: `src/utils/stateMigrations.ts`
- Create: `src/components/DataTransferControls.tsx`
- Modify: `src/components/Header.tsx` (inject button) or add to `/` page

**Steps:**
1. Define `TripStateVersion = 1` constant and add `version` to the type and initial state.
2. Create `stateMigrations.ts` exporting `migrateState(raw: unknown): TripState` that validates shape, fills defaults, and increments versions (initially just ensures version exists).
3. Update `useLocalStorage` to run `migrateState` whenever data is loaded (both from localStorage and from imported JSON).
4. Build `DataTransferControls` component with two buttons: “Export JSON” (creates blob download named `trip-budget-YYYYMMDD.json`) and “Import JSON” (file input, parse + migrate + persist). Include inline error states for invalid files.
5. Render this component on the Instructions homepage or Header dropdown so it’s globally accessible.
6. QA: export a populated trip, refresh the browser to ensure it reloads automatically, then clear localStorage, import the JSON, and confirm all screens show the restored data.

### Task 6: Shareable Data Links

**Files:**
- Add dependency: `pako` (for gzip) via `npm install pako`
- Create: `src/utils/stateEncoding.ts`
- Modify: `src/components/DataTransferControls.tsx` (or new Share panel)
- Modify: `src/hooks/useLocalStorage.ts` (initial load from URL hash/query)
- Modify: `src/app/page.tsx` (surface the share instructions)

**Steps:**
1. Implement `encodeState(state: TripState): string` that JSON.stringify’s the state, compresses with `pako.deflate`, Base64-url-safe encodes, and prefixes with `t=`.
2. Implement `decodeState(encoded: string): TripState` that reverses the process and runs `migrateState` for safety.
3. Extend `useLocalStorage` (or a bootstrap effect) to detect `window.location.hash` or `?data=` during first load; if present, decode state, hydrate localStorage, and strip the param to avoid rehydrating every navigation.
4. In `DataTransferControls`, add “Copy Shareable Link” button that generates `window.location.origin + '/?data=' + encodeState(tripState)` (or hash) and writes it to the clipboard, showing a toast/status message.
5. Manual QA: create a trip, click “Copy link”, open in an incognito window, confirm the app hydrates with the shared data, and that changing data locally doesn’t affect the original sharer.

### Task 7: Verification & Regression Pass

**Files:**
- N/A (commands/documentation)

**Steps:**
1. Run `npm run lint` to ensure new code passes ESLint.
2. Manual smoke test through the full flow: setup dates, add travelers, add multi-currency expenses, assign usage, view budget, delete expenses, export/import JSON, and open shareable link.
3. Capture any new environment variables/dependencies (`pako`) in `README.md` and outline how to use the data transfer features.
4. Prepare a summary for the PR describing key fixes and QA steps.
