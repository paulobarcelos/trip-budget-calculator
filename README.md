# Trip Budget Planner

Model a trip budget before you book. Add dates, travelers, and rough costs, then tweak assumptions to see how totals shift per person. Share a snapshot link with your group so everyone can review the plan, and (optionally) use the same data to track actual usage during the trip.

## Features
- Scenario planning: adjust rates, participants, and dates to instantly recalc per-traveler costs
- Supports mixed traveler dates and four expense types (daily/one-time, shared/personal)
- Exclusive end-date logic (leaving on the 5th means you don’t pay for the 5th)
- Display currency selection with `~` prefix for converted amounts
- LocalStorage persistence plus JSON export/import and shareable snapshot links (Header ➜ Data Transfer)

## Getting Started
```bash
npm install
npm run dev
```
Open http://localhost:3000 and step through:
1) Setup dates, 2) Add travelers, 3) Add expenses, 4) (Optional) Mark usage, 5) View budget.

## Project Structure
- `src/app` – Next.js App Router pages (setup, travelers, expenses, usage, budget)
- `src/providers` – cross-cutting React providers (display currency)
- `src/utils` – state utilities and date math
- `src/constants` – initial state
- `docs/APP_SPECIFICATION.md` – product spec
- `docs/plans/` – implementation plans and design notes

## Tech Stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind, Headless UI.

## State, Sharing & Currency
- Trip data lives in `tripState` in localStorage (versioned and migrated on load).
- Export/Import: use the Header “Data Transfer” controls to download or re-import a `trip-budget-YYYYMMDD.json` snapshot (validation is structural).
- Shareable links: copy a URL with `?data=t=...` payload (hash also supported on ingest). Opening the link hydrates trip state once and strips the param.
- Display currency preference is stored in trip data and can still be overridden via `?currency=`.

## Development Notes
- Lint: `npm run lint`
- Tests: currently manual + lint; date-math/unit coverage planned
- Exclusive date math: end dates are treated as exclusive across days, usage, and pricing
