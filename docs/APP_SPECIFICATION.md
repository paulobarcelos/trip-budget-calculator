# Trip Budget Calculator Specification

## Problem Statement
Plan a trip budget fast, with flexible expenses, usage-based splitting, and shareable snapshots. Core goals:
- Model shared vs individual costs across time-bound and one-off expenses.
- Assign usage to travelers and see per-person totals.
- Persist locally, export/import JSON, and share a snapshot link.
- Convert totals to a chosen display currency.

## Core Concepts

### Travelers
- Fields: id, name.
- Sorted alphabetically.
- No per-traveler date ranges.

### Expenses
Four types:
1) **Time-bound Shared**
   - Fields: name, totalCost, startDate, endDate, currency, splitMode.
   - splitMode: `dailyOccupancy` (daily split) or `stayWeighted` (person-day rate).

2) **Time-bound Personal**
   - Fields: name, dailyCost, startDate, endDate, currency.

3) **One-off Shared**
   - Fields: name, totalCost, currency.

4) **One-off Personal**
   - Fields: name, totalCost, currency.

### Usage
- Time-bound usage is recorded per day (`yyyy-MM-dd`) per expense.
- One-off usage is recorded once per expense.
- Usage drives cost allocation. No usage => no allocation.

### Trip Timeline
- No explicit trip start/end.
- Trip date range = earliest startDate to latest endDate among time-bound expenses.
- End dates are exclusive in calculations and calendar availability.

### Currency
- Each expense has its own currency.
- Display currency is a viewer preference stored in tripState.
- Converted amounts show `~` prefix.
- Rates fetched from `/api/exchange-rates` (exchangerate-api.com). Fallback rates on error.

### Data Management
- State stored in localStorage, versioned migrations on load.
- Export/import full state as JSON.
- Share link uses compressed payload:
  - `?data=t=...` (primary)
  - `#data=...` or `#t=...` (also supported)
- Opening a share link hydrates localStorage once and strips the param/hash. Not read-only.

## User Stories (Current)

### US1: Manage Expenses
- Add/edit/remove time-bound and one-off expenses.
- Time-bound expenses require start/end dates.
- Shared time-bound expenses choose split mode.

### US2: Manage Travelers
- Add/edit/remove travelers.
- Sorted alphabetically.
- Removing a traveler cleans usage assignments.

### US3: Track Usage
- Calendar view for time-bound expenses.
- Toggle travelers per expense for a chosen day.
- Copy previous day usage.
- One-off expenses have per-expense traveler toggles.

### US4: View Totals
- Per-traveler totals and grand total shown in Travelers view.
- Totals update immediately with changes.

### US5: Share and Transfer Data
- Export/import JSON.
- Copy shareable snapshot link.

### US6: Choose Display Currency
- Global selector in header.
- Does not modify raw expense amounts.

## Business Rules

### Cost Splitting
1) Time-bound Shared
   - `dailyOccupancy`: totalCost / dayCount = dailyCost. Each day split among that day’s participants.
   - `stayWeighted`: totalCost / totalPersonDays. Each traveler pays per-person-day rate * their person-days.

2) Time-bound Personal
   - Each assigned day adds dailyCost to that traveler.

3) One-off Shared
   - Total cost split equally among selected travelers.

4) One-off Personal
   - Total cost applied to each selected traveler.

### Date Rules
- End date is exclusive.
- Usage is only counted within an expense’s date range.
- No traveler-specific date constraints.

## UI Organization

### Navigation
- Header: Expenses, Usage, Travelers.
- Header also includes display currency selector and data transfer controls.

### Pages
- `/`: Landing + CTA to Expenses.
- `/expenses`: Time-bound + one-off tabs. Add/edit/remove expenses. Includes guided expense creation.
- `/usage`: Calendar for time-bound usage; tab for one-off usage.
- `/travelers`: Traveler list with per-person total and grand total.

## Technical Implementation

### Stack
- Next.js 16 (App Router), React 19, TypeScript.
- Tailwind CSS + shadcn UI (and HeroUI provider).

### State Shape (simplified)
```ts
interface TripState {
  version: number;
  travelers: Traveler[];
  dailySharedExpenses: DailySharedExpense[];
  dailyPersonalExpenses: DailyPersonalExpense[];
  oneTimeSharedExpenses: OneTimeSharedExpense[];
  oneTimePersonalExpenses: OneTimePersonalExpense[];
  days: Day[]; // kept for compatibility
  usageCosts: {
    oneTimeShared: Record<string, string[]>;
    oneTimePersonal: Record<string, string[]>;
    days: Record<string, { dailyShared: Record<string, string[]>; dailyPersonal: Record<string, string[]> }>;
  };
  displayCurrency: string;
}
```

### Currency Conversion
- Client fetches `/api/exchange-rates` and converts totals on the fly.
- `~` prefix marks converted values.
