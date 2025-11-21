# Testing Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish a complete testing system (unit, component, integration, and light e2e) and retrofit critical coverage so future work is TDD-first.

**Architecture:** Use Vitest for unit/component tests with React Testing Library, msw for network mocking, and Playwright for a few happy-path e2e flows. Keep `tsc --noEmit` in lint. Add utilities and fixtures to make TDD fast and consistent across pages and state helpers.

**Tech Stack:** Vitest, React Testing Library, @testing-library/user-event, msw, Playwright, TypeScript, Next.js App Router, Tailwind.

---

### Task 1: Install/Configure Test Tooling

**Files:**
- Modify: `package.json`, `package-lock.json`
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/test/msw/handlers.ts`
- Create: `src/test/msw/server.ts`

**Steps:**
1. Add deps: `vitest`, `@vitest/ui` (optional), `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `msw`, `whatwg-fetch`, `@testing-library/dom` (if needed), `@testing-library/react-hooks` (if needed), `@types/testing-library__jest-dom` (if TS types separate), `@playwright/test` (for e2e). Ensure `ts-node` not required.
2. Add scripts: `test`, `test:watch`, `lint` already runs `tsc`; keep `npm run lint` as is.
3. Create `vitest.config.ts` with jsdom environment, setup file, alias matching `@/*`, and coverage config (c8) for branches/statements (initial target 70% lines to avoid flakiness).
4. Add `src/test/setup.ts` to install `@testing-library/jest-dom`, set up `fetch` polyfill, and start/stop `msw` server in `beforeAll/afterAll` hooks.
5. Add `src/test/msw/server.ts` with `setupServer` from `msw/node`; export `server`.
6. Add `src/test/msw/handlers.ts` placeholder for `/api/exchange-rates` handler returning a stable fixture.
7. Verify by running `npm run test -- --list` (or `vitest ls`) to ensure config loads.

### Task 2: Unit Tests for Core Utilities (Date & Currency)

**Files:**
- Create: `src/utils/__tests__/tripStateUpdates.test.ts`
- Create: `src/utils/__tests__/currencyConversion.test.ts`
- Modify: `src/utils/tripStateUpdates.ts` (only if minor hooks/exports needed for testing helpers)

**Steps:**
1. Write tests for `getDayCount` (exclusive end), `calculateDailyCost`, `generateDaysForDateRange`, ensuring clamping and zero/negative cases.
2. Add tests for split-mode cost helpers once exposed (see Task 4) to cover zero-person-night edge.
3. Write tests for `convertCurrency` with mock rates; confirm approximate flag usage via `formatCurrency` can be checked indirectly (or separate test).
4. Run `npm run test src/utils/__tests__/tripStateUpdates.test.ts src/utils/__tests__/currencyConversion.test.ts` and expect pass.

### Task 3: LocalStorage & Migration Tests

**Files:**
- Create: `src/hooks/__tests__/useLocalStorage.test.tsx`

**Steps:**
1. Mock `localStorage` and `window.location` to verify `useLocalStorage` loads, migrates, decodes shared links, and strips URL param after hydration.
2. Test that `displayCurrency`, `splitMode`, and `version` defaults are set via `migrateState` when missing.
3. Run `npm run test src/hooks/__tests__/useLocalStorage.test.tsx` and expect pass.

### Task 4: Daily Shared Split-Mode Calculation Tests

**Files:**
- Create: `src/utils/__tests__/dailySharedSplit.test.ts`
- Modify: `src/app/budget/page.tsx` or factor out calculation into `src/utils/budget.ts` (preferred) to make it testable without rendering.

**Steps:**
1. Extract daily shared allocation logic into a pure helper (e.g., `calculateDailySharedAllocations(expense, usageByDay, travelers)`), returning per-traveler totals for both modes.
2. Write tests covering: (a) daily occupancy with varying occupants per day; (b) person-night rate with uneven stays; (c) zero person-nights returns zero without crash; (d) mixed currencies handled via provided rate stub.
3. Run `npm run test src/utils/__tests__/dailySharedSplit.test.ts` and expect pass.

### Task 5: Component Tests (Expenses & Usage Flows)

**Files:**
- Create: `src/app/expenses/__tests__/expenses-form.test.tsx`
- Create: `src/app/usage/__tests__/usage-daily-shared.test.tsx`
- Helpers: `src/test/renderWithProviders.tsx`

**Steps:**
1. Add `renderWithProviders` to wrap components with needed contexts (DisplayCurrencyProvider, mocked LocalStorage provider).
2. Tests for Expenses page: create daily shared expense with split mode selection, verify per-day preview updates when changing total/per-day, and that split mode value is persisted in state (inspect LocalStorage mock or component state snapshot).
3. Tests for Usage page: toggling travelers for a daily shared expense shows selected split mode label; copy/clear usage respects modes; deleting expense removes toggles.
4. Run `npm run test src/app/expenses/__tests__/expenses-form.test.tsx src/app/usage/__tests__/usage-daily-shared.test.tsx` and expect pass.

### Task 6: Budget Page Integration Test (jsdom)

**Files:**
- Create: `src/app/budget/__tests__/budget-summary.test.tsx`

**Steps:**
1. Render budget page with seeded tripState (daily shared + personal + one-time) for both split modes; assert per-traveler totals and grand total match expected numbers; verify `~` prefix appears when approximate.
2. Mock `/api/exchange-rates` via msw handler.
3. Run `npm run test src/app/budget/__tests__/budget-summary.test.tsx` and expect pass.

### Task 7: Playwright Smoketests (happy paths)

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/happy-path.spec.ts`
- Fixtures: may reuse msw or static mock server; if heavy, keep to 1–2 flows.

**Flows to cover (minimal):**
1. Create trip, add traveler, add daily shared expense (both modes), mark usage, open budget and see totals render.
2. Export JSON and re-import; verify data shows in budget.

**Steps:**
1. Configure Playwright to hit dev server (document manual start `npm run dev` for now) with baseURL `http://localhost:3000`.
2. Keep tests minimal/time-boxed (<2m).
3. Run locally: `npx playwright test tests/e2e/happy-path.spec.ts` (optional gate in CI later).

### Task 8: Documentation & CI Hooks

**Files:**
- Modify: `README.md` (Testing section)
- Modify: `package.json` scripts (ensure `test`/`test:watch` documented)
- Optional: Add GitHub Actions workflow stub (if desired) `/.github/workflows/test.yml` (can be deferred).

**Steps:**
1. Document how to run lint, unit, component, and e2e tests; note msw and dev server requirement for Playwright.
2. If adding CI stub: run `npm run lint` and `npm run test -- --runInBand` (or default) and optional Playwright as a separate job.

### Task 9: Retrofit High-Value Regression Cases (if time)

**Files:**
- Create: `src/components/__tests__/DataTransferControls.test.tsx`
- Create: `src/app/travelers/__tests__/travelers-sort.test.tsx`

**Steps:**
1. DataTransferControls: ensure export triggers download, import hydrates state, share link copy writes expected URL.
2. Travelers sorting: add/edit/remove keeps alphabetical order; delete cleans usage.
3. Run the subset: `npm run test src/components/__tests__/DataTransferControls.test.tsx src/app/travelers/__tests__/travelers-sort.test.tsx`.

---

## Execution Options
- Subagent-driven in this session: dispatch per-task with superpowers:executing-plans + subagent-driven-development.
- Parallel session: run `~/.codex/superpowers/skills/async-task-runner/scripts/async-task start testing-foundation ...` with this plan.
