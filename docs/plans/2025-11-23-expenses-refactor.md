# Implementation Plan - Expenses Page Refactor

## Objective
Refactor the Expenses page to simplify navigation and improve layout. Consolidate the 4 tabs into 2 (Daily vs One-Time), with Shared and Personal sections within each. Implement a responsive grid layout for expense cards.

## User Requirements
1.  **Tabs**: Reduce from 4 to 2: "Daily" and "One-Time".
2.  **Sections**: Within each tab, display "Shared" and "Personal" sections.
3.  **Add Buttons**: "Add Expense" button for each section (4 total buttons on the page, 2 per tab).
4.  **Descriptions**: Add helper text for each section explaining the expense type.
5.  **Layout**: Expense cards in a grid (1 column mobile, 3 columns desktop).

## Implementation Steps

### 1. Refactor `src/app/expenses/page.tsx`
-   Update `Tabs` component to have `defaultValue="daily"` and triggers for `daily` and `onetime`.
-   **Daily Tab Content**:
    -   **Shared Section**:
        -   Title: "Shared Daily Expenses"
        -   Description: "Recurring costs split among the group (e.g., Hotels, Car Rental)."
        -   Button: "Add Shared Expense" (opens dialog with type `dailyShared`)
        -   List: Grid of `dailySharedExpenses`.
    -   **Personal Section**:
        -   Title: "Personal Daily Expenses"
        -   Description: "Recurring costs for individuals (e.g., Daily Food Allowance)."
        -   Button: "Add Personal Expense" (opens dialog with type `dailyPersonal`)
        -   List: Grid of `dailyPersonalExpenses`.
-   **One-Time Tab Content**:
    -   **Shared Section**:
        -   Title: "Shared One-Time Expenses"
        -   Description: "Single costs split among the group (e.g., Group Dinner, Tickets)."
        -   Button: "Add Shared Expense" (opens dialog with type `oneTimeShared`)
        -   List: Grid of `oneTimeSharedExpenses`.
    -   **Personal Section**:
        -   Title: "Personal One-Time Expenses"
        -   Description: "Single costs for individuals (e.g., Souvenirs, Personal Shopping)."
        -   Button: "Add Personal Expense" (opens dialog with type `oneTimePersonal`)
        -   List: Grid of `oneTimePersonalExpenses`.

### 2. Styling
-   Use `grid grid-cols-1 md:grid-cols-3 gap-4` for the expense lists.
-   Ensure consistent spacing between sections.

### 3. Logic Updates
-   Ensure `handleAddExpense` or the dialog opening logic correctly sets the `expenseType` based on which button is clicked, since we are no longer relying on a single "active tab" to determine the type for a generic button.

## Verification
-   Check that all 4 types of expenses can be added.
-   Verify the grid layout on mobile and desktop.
-   Verify that descriptions are present and helpful.
