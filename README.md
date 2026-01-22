# Trip Budget Calculator

Model a trip budget before you book. Add expenses and travelers, then track usage to see per-person totals. Share a snapshot link with your group and keep everything saved locally.

## Features
- Scenario planning: adjust costs, participants, and dates to recalc per-traveler totals
- Four expense types (time-bound/one-off, shared/individual) with per-expense currency
- Time-bound shared split modes: daily occupancy or person-day rate
- Exclusive end-date logic (leaving on the 5th means you do not pay for the 5th)
- Usage calendar with per-day assignments and copy-previous-day
- Display currency selection with `~` prefix for converted amounts
- LocalStorage persistence plus JSON export/import and shareable snapshot links (Header -> Data Transfer)
- Optional AI assistant (Gemini) to suggest structured actions from plain language

## Getting Started
```bash
npm install
npm run dev
```
Open http://localhost:3000 and step through:
1) Add expenses, 2) Add travelers, 3) (Optional) Mark usage, 4) View totals on Travelers.

## Testing & Quality
- `npm run lint` — ESLint + `tsc --noEmit`
- `npm run test` — Vitest unit/component/integration (jsdom); uses in-memory localStorage (`NODE_OPTIONS=--localstorage-file=:memory:`) and msw handlers in `src/test/msw`
- `npx playwright test` — Playwright smoke/e2e; requires dev server running separately. Override target with `PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test`

## CI
- `.github/workflows/ci.yml` — lint + vitest
- `.github/workflows/e2e.yml` — build, start Next.js, run Playwright (triggered on PR paths or manually)

## Project Structure
- `src/app` – Next.js App Router pages (setup, travelers, expenses, usage, budget)
- `src/providers` – cross-cutting React providers (display currency)
- `src/utils` – state utilities and date math
- `src/constants` – initial state
- `docs/APP_SPECIFICATION.md` – product spec
- `docs/plans/` – implementation plans and design notes

## Tech Stack
Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, shadcn UI.

## State, Sharing & Currency
- Trip data lives in `tripState` in localStorage (versioned and migrated on load).
- Export/Import: use the Header “Data Transfer” controls to download or re-import a `trip-budget-YYYYMMDD.json` snapshot (validation is structural).
- Shareable links: copy a URL with `?data=t=...` payload (hash also supported on ingest). Opening the link hydrates trip state once and strips the param/hash.
- Display currency preference is stored in trip data (per viewer).

## Development Notes
- Exclusive date math: end dates are treated as exclusive across days, usage, and pricing

## AI Assistant
- Set `GEMINI_API_KEY` to enable the `/api/ai/interpret` route.
- The assistant suggests actions; nothing is applied until you confirm.
