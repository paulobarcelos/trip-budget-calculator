# Trip Budget Calculator Specification

## Problem Statement
Plan a trip budget before you travel, simulate different cost assumptions, and see whether a trip is feasible for each traveler. The app makes it fast to:
- Sketch a draft itinerary (dates, travelers) and estimate shared/personal costs.
- Adjust assumptions (rates, participants, durations) and instantly see per-person totals.
- Share a snapshot link with the group so everyone can review the plan.
- When the trip happens, flip the same data into “usage” to track real participation and final splitting.

## Core Concepts

### Travelers
- Each traveler has:
  - Unique identifier
  - Name
  - Start date (when they join the trip)
  - End date (when they leave the trip)

### Expenses
Four distinct types of expenses:

1. **Daily Shared Expenses**
   - Have a name, total cost, start date, and end date
   - Cost is split between participating users for each day
   - Example: Hotel room, rental car

2. **Daily Personal Expenses**
   - Have a name and daily cost
   - Cost applies each day to users who opt in
   - Example: Food allowance, daily transport pass

3. **One-Time Shared Expenses**
   - Have a name and total cost
   - Cost is split once between participating users
   - Example: Museum group tickets, shared taxi ride

4. **One-Time Personal Expenses**
   - Have a name and total cost
   - Full cost applies to each user who opts in
   - Example: Souvenir, personal item

### Days
- Trip is divided into individual days
- Each day tracks which travelers are using which expenses
- Days are generated based on trip start/end dates

### Usage Costs
Tracks who is using which expense on which day:
- For daily expenses: per day tracking
- For one-time expenses: single usage record
- Users can be marked as using/not using any expense

## User Stories

### Planning Stories

#### US0: Plan Trip Budget
As a trip organizer, I want to model the full trip budget before booking
**Acceptance Criteria:**
- Enter dates, travelers, and expenses quickly to see per-person and total costs.
- Editing any cost, participant list, or date range updates all totals instantly.
- Can tweak shared vs personal, daily vs one-time expenses to test different scenarios.
- Share a snapshot link so others can review the exact plan without importing files.

### Trip Setup Stories

#### US1: Set Trip Dates
As a trip organizer, I want to set the trip's start and end dates
**Acceptance Criteria:**
- Can input start and end date
- End date must be after start date
- Changing dates regenerates the days array
- Invalid date combinations show error message

#### US2: Choose Display Currency
As a viewer, I want to choose the currency used for summaries without changing the raw expense inputs
**Acceptance Criteria:**
- Can select from predefined currency options on the budget views
- Preference is persisted within the trip data and reloads automatically when revisiting or sharing the trip
- Converted amounts always show the "~" prefix to indicate approximation
- Switching currencies updates all totals immediately without editing the underlying expenses
- Currency controls remain available when opening shared snapshot links

#### US3: Manage Travelers
As a trip organizer, I want to add and manage travelers
**Acceptance Criteria:**
- Can add new travelers with name and dates
- Can edit traveler names and dates
- Can remove travelers
- Travelers are sorted alphabetically
- Removing a traveler cleans up their usage data
- Each traveler must have valid start/end dates

### Expense Management Stories

#### US4: Manage Daily Shared Expenses
As a trip organizer, I want to manage daily shared expenses
**Acceptance Criteria:**
- Can add new expense with name, total cost, start date, end date
- Can edit all expense details
- Can remove expenses
- Shows daily cost calculation
- Validates date ranges

#### US5: Manage Daily Personal Expenses
As a trip organizer, I want to manage daily personal expenses
**Acceptance Criteria:**
- Can add new expense with name and daily cost
- Can edit all expense details
- Can remove expenses
- Shows total for all personal expenses

#### US6: Manage One-Time Shared Expenses
As a trip organizer, I want to manage one-time shared expenses
**Acceptance Criteria:**
- Can add new expense with name and total cost
- Can edit all expense details
- Can remove expenses
- Shows total for all one-time shared expenses

#### US7: Manage One-Time Personal Expenses
As a trip organizer, I want to manage one-time personal expenses
**Acceptance Criteria:**
- Can add new expense with name and total cost
- Can edit all expense details
- Can remove expenses
- Shows total for all one-time personal expenses

### Usage Tracking Stories

#### US8: Track Daily Expense Usage
As a trip organizer, I want to track who uses which expense each day
**Acceptance Criteria:**
- Can toggle usage per traveler per expense per day
- Only shows travelers active on each day
- Can toggle all travelers for an expense
- Can copy settings from previous day
- Changes update cost calculations immediately

#### US9: Track One-Time Expense Usage
As a trip organizer, I want to track who participates in one-time expenses
**Acceptance Criteria:**
- Can toggle participation per traveler per expense
- Shows all travelers regardless of dates
- Can toggle all travelers for an expense
- Changes update cost calculations immediately

### Budget Summary Stories

#### US10: View Budget Summary
As a trip organizer, I want to see a summary of all costs
**Acceptance Criteria:**
- Shows total cost per traveler
- Breaks down into personal and shared costs
- Shows grand total for trip
- Uses the viewer's selected display currency by default
- Converted amounts show the "~" prefix
- Currency conversion selector (when rates are available)
- Direct links preserve the chosen currency override
- Updates automatically when data changes

#### US11: View Budget Summary in Different Currencies
As a trip organizer, I want to view the budget summary converted to different currencies
**Acceptance Criteria:**
- Can select from available display currencies in budget summary
- Converted amounts are shown with "~" prefix to indicate approximation
- Currency selection updates the URL query so the view can be shared
- Conversion rates are updated at least daily
- Clear indication that amounts are converted from their original expense currency

#### US12: Handle Currency Conversion Issues
As a trip organizer, I want graceful handling of currency conversion issues
**Acceptance Criteria:**
- Display currency selector only appears when conversion rates are available
- Clear error message when conversion rates are unavailable
- Invalid currency codes in URL return 404 page
- Stale conversion rates (>24h) are still usable but marked as potentially outdated


### Data Management Stories

#### US13: Export Trip Data
As a trip organizer, I want to export all trip data
**Acceptance Criteria:**
- Can export all data to JSON file
- Can choose file name and location
- Export includes all trip settings and usage data

#### US14: Import Trip Data
As a trip organizer, I want to import trip data
**Acceptance Criteria:**
- Can import data from JSON file
- Validates data structure before import
- Shows error for invalid files
- Updates all screens after successful import

#### US15: Auto-Save Data
As a trip organizer, I want my changes saved automatically
**Acceptance Criteria:**
- All changes save to localStorage
- Data persists between page reloads
- Loads last state when returning to app

#### US16: Share Trip Snapshot via Link
As a trip organizer, I want to share the current trip data through a single URL
**Acceptance Criteria:**
- Can generate a URL that encodes the full trip state (dates, travelers, expenses, usage, preferences)
- Recipients opening the link see the shared snapshot immediately without importing files
- Snapshot links include the saved display currency but recipients can still change their personal display currency afterward
- Links are read-only by default; edits made by recipients do not modify the original sharer's data

## Business Rules

### Cost Splitting
1. Daily Shared Expenses
   - Total cost is divided by number of days to get daily cost
   - Daily cost is split between users marked as using the expense that day
   - Users only pay for days they're marked as using the expense

2. Daily Personal Expenses
   - Full daily cost applies to each user marked as using the expense that day
   - Users only pay for days they're marked as using the expense

3. One-Time Shared Expenses
   - Total cost is split equally between all users marked as using the expense
   - Date of expense is not relevant

4. One-Time Personal Expenses
   - Full cost applies to each user marked as using the expense
   - Date of expense is not relevant

### Date Rules
- Travelers can only be assigned expenses during their active dates
- Daily expenses must have valid start/end dates within trip duration
- End dates are exclusive (a person leaving on the 5th doesn't pay for the 5th)
- Trip must have valid start/end dates

### Data Persistence
- All data should be automatically saved
- Data should be exportable/importable
- Users should be able to resume their session

## User Interface Organization

### Navigation Structure
Five main sections:
1. Setup
2. Travelers
3. Expenses
4. Usage
5. Budget Summary

### Screen Details

#### Setup Screen
- Set trip start/end dates
- Changes affect entire trip calculation

#### Travelers Screen
- Add/edit/remove travelers
- Set individual start/end dates
- Sort travelers alphabetically

#### Expenses Screen
Four subsections:
1. Daily Shared Expenses
2. Daily Personal Expenses
3. One-Time Shared Expenses
4. One-Time Personal Expenses
Each with add/edit/remove functionality

#### Usage Screen
Two main sections:
1. One-Time Expenses
   - Matrix of all one-time expenses vs all travelers
   - Checkbox toggles for usage

2. Daily Expenses
   - Grouped by day
   - Shows only applicable travelers per day
   - Matrix of expenses vs travelers
   - Checkbox toggles for usage
   - Option to copy settings from previous day

#### Budget Summary Screen
- Shows total cost per traveler
- Breaks down costs into personal and shared
- Shows grand total for trip
- All amounts in base currency by default
- Option to view in different display currencies
- Converted amounts shown with "~" prefix
- Currency conversion selector (when available)

## Assumptions & Constraints
1. No time-of-day tracking (only full days)
2. No category management (free-form expense names)
3. No receipt tracking
4. No multi-trip management
5. No user accounts/authentication
6. No offline functionality requirements
7. No multi-language support
8. No mobile-specific features
9.  No payment tracking
10. No real-time collaboration

## Technical Implementation

### Framework
The application is built using:
- Next.js 15+ with App Router
- React Server Components by default
- Client Components when needed for interactivity
- TypeScript for type safety
- Tailwind CSS for styling

### State Management
All client-side state lives inside a single `tripState` object stored in localStorage. The system provides:

1. **Versioned Trip State**
   - `tripState` includes a `version` flag, top-level dates, traveler/expense arrays, usage matrices, and viewer preferences (e.g., `displayCurrency`).
   - Future migrations upgrade the blob before components consume it.

2. **Client Components + Hooks**
   - A custom `useLocalStorage` hook hydrates React state from localStorage, supports migrations, and syncs updates across tabs using a custom event.
   - Selector helpers or context providers (e.g., `DisplayCurrencyProvider`) expose scoped slices so most components avoid re-reading the entire object.

3. **Display Currency Context**
   - The provider reads `tripState.displayCurrency` and surfaces helpers (`setDisplayCurrency`, `isApproximate`) to every page.
   - Updating the selector persists immediately so future sessions and shared snapshots reflect the viewer’s choice.

4. **State Structure (simplified)**
   ```typescript
   interface TripState {
     version: number;
     startDate: string;
     endDate: string;
     travelers: Traveler[];
     dailySharedExpenses: DailySharedExpense[];
     dailyPersonalExpenses: DailyPersonalExpense[];
     oneTimeSharedExpenses: OneTimeSharedExpense[];
     oneTimePersonalExpenses: OneTimePersonalExpense[];
     days: Day[];
     usageCosts: UsageCosts;
     displayCurrency: string;
   }
   ```

### Next.js App Router Structure
```
app/
├── layout.tsx            # Root layout with navigation
├── error.tsx            # Global error handling
├── loading.tsx          # Global loading UI
├── page.tsx             # Instructions page
├── setup/
│   ├── page.tsx         # Dates & Currency setup
│   └── loading.tsx      # Setup loading UI
├── travelers/
│   ├── page.tsx         # Travelers management
│   └── error.tsx        # Travelers error handling
├── expenses/
│   ├── page.tsx         # Expenses management
│   └── loading.tsx      # Expenses loading UI
├── usage/
│   ├── page.tsx         # Usage tracking
│   └── error.tsx        # Usage error handling
└── budget/
    ├── page.tsx         # Budget summary with display currency selector
    └── loading.tsx      # Budget loading UI
```

### Currency Conversion
- `/budget` fetches hourly exchange rates through our `/api/exchange-rates` proxy (Open Exchange Rates backend) and renders totals in the active display currency.
- The display currency selector is powered by `DisplayCurrencyProvider`; it writes the viewer’s preference directly into `tripState`.
- Any converted amount shows a leading `~` to indicate approximation.
- Since the full trip state is shareable, recipients opening a link see the provider respect the encoded snapshot but can still change their own preference afterward.
