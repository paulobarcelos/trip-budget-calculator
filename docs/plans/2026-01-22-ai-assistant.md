# Implementation Plan - AI Assistant (Gemini)

## Objective
Add an AI assistant that turns natural language into structured trip actions using `gemini-3-flash-preview`, via a Vercel API route, with preview/confirm before applying changes.

## Constraints
- No DB for rate limiting or auth.
- Light security only (origin check + input size caps).
- Strict action schema with validation.

## User Requirements
1.  Use Gemini via a Vercel API route; keep key server-side.
2.  Return structured actions + short explanation.
3.  Client shows preview and only applies after confirmation.

## Implementation Steps

### 1. Inspect state + CRUD flow
-   Map current trip state shape.
-   Identify existing create/update paths for expenses, travelers, and usage.
-   Decide the minimal action set to cover common user intents.

### 2. Define action schema + validation
-   Create a Zod schema for actions (allowlist only).
-   Build an action applier that maps validated actions to existing state updates.
-   Add a preview model for UI (human-readable summary).

### 3. Vercel API route
-   Add `POST /api/ai/interpret`.
-   Use `gemini-3-flash-preview` with a strict system prompt and JSON-only output.
-   Enforce:
    -   Origin allowlist check.
    -   Input size caps (prompt + context).

### 4. Client UI
-   Add an “AI Assistant” dialog.
-   Include prompt input + context (current trip state).
-   Show proposed actions + explanation.
-   Apply only after user confirmation.

### 5. Tests + verification
-   Unit tests: action validation + apply behavior.
-   API tests: schema enforcement + error paths.
-   Run lint, unit, build, e2e.

## Deliverables
-   API route + Gemini integration.
-   Action schema + applier + preview.
-   UI entry point and flow.
-   Tests updated and passing.
