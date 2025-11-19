# Display Currency Provider Design (2025-11-19)

## Context Review
- Trip data persists in `tripState` via `useLocalStorage`, but the display currency currently uses a separate `displayCurrency` key.
- Budget calculations rely on exchange rates fetched client-side, and only the budget page reads/sets display currency.
- Task 1 requires a global provider so every page can inspect both the persisted currency and any temporary overrides from the query string.

## Self Q&A
1. **Where should the authoritative display currency live?**
   - A. Separate `localStorage` key.
   - B. Inside `TripState` alongside trip metadata.
   - C. Derived dynamically from browser locale each render.
   - **Answer:** B keeps all trip-specific configuration in one persistable blob so future export/import flows stay coherent.
2. **How should query overrides be reconciled with persistence?**
   - A. Immediately write the override into `tripState`.
   - B. Treat overrides as read-only until the user manually picks a currency.
   - C. Rewrite the URL without storing anything.
   - **Answer:** B matches the requirement that URL parameters do not mutate stored state unless the user explicitly confirms via the UI.

## Approaches Considered
1. **Context Provider (Recommended):** Hydrate `tripState` once inside a `DisplayCurrencyProvider`, compute an "effective" currency combining persistent settings and query overrides, and expose helpers. Pros: single source of truth, simple consumer API. Cons: Provider re-renders when trip state changes.
2. **Per-page Hook:** Each page calls a custom hook that wraps `useLocalStorage`, `useSearchParams`, and format helpers. Pros: no extra provider. Cons: repeated logic across every page, harder to ensure a single override policy.
3. **URL-driven state:** Always read currency from the URL and push updates via router replacements. Pros: shareable by default. Cons: requires more router churn, creates friction when offline, and risks extra renders.

Given the need for global access and centralized override rules, the provider approach is the most maintainable path.

## Detailed Design
### 1. TripState + Local Storage (≈230 words)
`TripState` already contains `displayCurrency`, but it is not versioned. I will add a new `version: 1` field to the type and `initialTripState`. This ensures future migrations can introspect the stored schema. The `useLocalStorage` hook currently has no way to transform legacy payloads, so it must grow an optional `migrate` callback. The callback should receive the parsed JSON payload (`unknown`) and return the typed result. When provided, we run `migrate(parsed)` before calling `setStoredValue`; otherwise we cast directly to `T`. Error handling will remain the same (log and fall back to the React state initializer). `useLocalStorageSelector` will proxy the new option so selectors benefit from migrations automatically. No migrations are required in Task 1, but the hook wiring must allow the upcoming `migrateState` helper to plug in during Task 5. Persisting display currency now simply means every `setTripState` call must preserve `version`, which is already satisfied because all callers spread `tripState` or derive from helpers that do so.

### 2. DisplayCurrencyProvider (≈240 words)
Create `src/providers/DisplayCurrencyProvider.tsx` as a client component exporting both the provider and a `useDisplayCurrency` hook. Inside, hydrate `[tripState, setTripState]` via `useLocalStorage('tripState', initialTripState)` (optionally passing a no-op migrate placeholder until Task 5). Read the `currency` search param with `useSearchParams`, normalize it to uppercase, and validate it against the existing `currencies` dataset via a memoized `Set`. Maintain a local `manualCurrency` state that becomes `null` whenever the query parameter changes. Compute `effectiveCurrency = manualCurrency ?? queryCurrency ?? tripState.displayCurrency ?? initialTripState.displayCurrency`. The exposed `setDisplayCurrency` should uppercase inputs, update `tripState.displayCurrency`, and assign `manualCurrency` so that explicit selections override URL params for the remainder of the session. The helper `isApproximate(sourceCurrency)` simply compares the normalized source currency with `effectiveCurrency`. Memoize the context value to avoid unnecessary re-renders. Consumers will read `displayCurrency` for rendering but call `setDisplayCurrency` whenever a user intentionally changes the select. Since the provider owns the only copy of the setter, we no longer need a standalone `displayCurrency` entry in localStorage, ensuring export/import features remain a single blob.

### 3. Integration & UI Updates (≈200 words)
Wrap `RootLayout`’s body content with `DisplayCurrencyProvider` so every route gains access. In `budget/page.tsx`, remove the standalone `useLocalStorage('displayCurrency', ...)` hook and instead pull `{ displayCurrency, setDisplayCurrency, isApproximate }` from the provider hook. The `<select>` should display the effective currency, while the `onChange` handler calls `setDisplayCurrency(e.target.value)` to persist the new preference. All formatting helpers (`formatAmount`, totals, traveler sections) should pass `isApproximate(originalCurrency)` into `formatCurrency`. That means `calculateTotalCost`, `calculateDailyCost`, and the per-expense conversions must return both the converted amount and a flag describing whether the source currency differed. Because the rest of the app does not render converted values yet, only the budget summary requires updates. Finally, manual QA will verify multi-currency trips both with and without `?currency=` overrides, ensuring `~` prefixes appear whenever conversions occur. This design keeps persistence centralized, respects query overrides, and lays the groundwork for future import/export migrations without duplicating state.

## Testing & QA
- `npm run dev` for manual verification.
- Smoke the `/budget` page with and without `?currency=EUR`.
- Confirm selecting a currency updates persistence even when the query override was present.
