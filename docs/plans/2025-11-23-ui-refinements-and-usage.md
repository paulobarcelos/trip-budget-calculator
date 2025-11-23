# Implementation Plan: UI Refinements & Usage Page Revamp

## Objective
Address user feedback regarding UI placement, instructions, and the start page, and proceed with the major revamp of the Usage page to support the new expense-driven date system.

## Phase 1: UI Refinements & Navigation (Immediate)

### 1. Global Currency Selector
- **Move:** Remove the Currency Selector from `TravelersPage`.
- **Place:** Add the Currency Selector to the `Header` component (and `MobileNav` if space permits or as a secondary item).
- **Context:** Ensure it uses `DisplayCurrencyProvider` correctly.

### 2. Start Page Restoration
- **Revert:** Restore `src/app/page.tsx` (remove the redirect).
- **Content:** Create a welcoming landing page.
  - **Title:** "Trip Budget Calculator"
  - **Description:** "Plan your trip expenses, track usage, and calculate individual costs effortlessly."
  - **How it Works:** Brief 3-step guide:
    1. **Add Expenses:** Log shared and personal costs.
    2. **Add Travelers:** List who is coming.
    3. **Track Usage:** Mark who was present for each day or expense.
  - **CTA:** "Get Started" button linking to `/expenses`.

### 3. Instructions Overhaul
- **Strategy:** Remove the collapsible `Instructions` component from individual pages.
- **Implementation:**
  - **Expenses Page:** Update the page subtitle to concisely explain the action (e.g., "Log all your trip expenses here. Dates are automatically inferred.").
  - **Travelers Page:** Update subtitle (e.g., "Manage your travel group. Total costs are calculated automatically.").
  - **Usage Page:** Update subtitle (e.g., "Assign expenses to travelers based on their presence.").

### 4. Contextual Info System (Split Mode)
- **Component:** Create a reusable `InfoTooltip` or `FieldInfo` component (using Shadcn `Tooltip` or `Popover`).
- **Apply:** Restore the "Split Mode" explanation in `ExpensesPage` using this new component.
  - *Even Split:* "Cost is divided equally among all selected travelers."
  - *By Time:* "Cost is divided based on the number of days each traveler was present."

## Phase 2: Usage Page Revamp (Core)

### 1. Data Preparation
- **Derive Dates:** Use `getTripDateRange` to determine the full trip duration.
- **Status Tracking:** Determine the status of each day (Fully Allocated, Partially Allocated, Empty) based on expenses and traveler assignments.

### 2. Calendar View Implementation
- **Component:** Build a custom Calendar view (or adapt `react-day-picker` / Shadcn `Calendar`).
- **Visuals:**
  - Display months relevant to the trip.
  - Highlight days with active expenses.
  - Indicators for "Missing Usage" (e.g., a shared expense exists on this day, but no one is assigned).

### 3. Usage Assignment Dialog
- **Interaction:** Clicking a date opens a `Sheet` or `Dialog`.
- **Content:**
  - List **Shared Expenses** active on that date.
  - List **Personal Expenses** active on that date.
  - **Traveler Selection:** For each expense, allow toggling travelers.
  - **Bulk Actions:** "Select All", "Copy from Previous Day".

### 4. One-Time Expenses Tab
- **View:** Separate tab for One-Time expenses (as they aren't tied to a specific calendar date in the same way).
- **Interaction:** List expenses and allow traveler assignment.

## Phase 3: Validation & Polish
- **Tests:** Update/Add tests for the new Usage flow.
- **Review:** Ensure no "startDate/endDate" errors persist (as seen in previous build).
