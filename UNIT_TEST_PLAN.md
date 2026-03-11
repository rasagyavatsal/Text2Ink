# Unit Test Plan

## Goal

Create maintainable unit test coverage for the full codebase, with the highest effort spent on business logic and boundary behavior rather than static markup.

## Current State

- There is no existing unit test framework or test directory in the repository.
- The codebase has two execution targets:
  - Next.js app code in `src/`
  - Firebase Cloud Functions in `functions/`
- The most testable logic already exists in:
  - `src/lib/`
  - `src/workers/paginationWorker.ts`
  - `src/app/api/feedback/route.ts`
  - `functions/src/index.ts`
- The highest-risk UI files are:
  - `src/components/HandwritingEditor.tsx`
  - `src/components/SettingsPanel.tsx`
  - `src/components/ExportPanel.tsx`

## Recommended Test Stack

### App (`src/`)

- `vitest`
- `@testing-library/react`
- `@testing-library/user-event`
- `jsdom`
- `@testing-library/jest-dom`

### Functions (`functions/`)

- `vitest`
- `node-mocks-http` or `supertest`

### Shared Notes

- Use `vi.mock(...)` for `nodemailer`, Firebase SDK calls, `next/image`, and browser APIs.
- Keep tests close to code with `__tests__` folders or `*.test.ts(x)` files.
- Add coverage reporting, but do not enforce aggressive thresholds until the first pass is stable.

## Suggested File Layout

```text
vitest.config.ts
src/test/setup.ts
src/test/mocks/
src/test/fixtures/
src/lib/**/*.test.ts
src/components/**/*.test.tsx
src/app/**/*.test.tsx
src/app/api/**/*.test.ts

functions/vitest.config.ts
functions/src/**/*.test.ts
```

## Work Plan

### Test Harness

1. Add Vitest configs for the root app and `functions/`.
2. Add a shared app test setup file for `jest-dom`, `URL.createObjectURL`, `matchMedia`, `ResizeObserver`, `OffscreenCanvas`, and `requestAnimationFrame` mocks.
3. Add simple mocks for `next/image`, `next/link`, and font imports where needed.
4. Add `test` and `test:coverage` scripts in both `package.json` files.

### Pure Logic Coverage

- `src/lib/utils.ts`
  - `cn()` merges classes correctly.
- `src/lib/types.ts`
  - `defaultPageSettingsFromHandwritingSettings()` maps all expected fields.
  - Default constants remain internally consistent.
- `src/lib/editorPersistence.ts`
  - Loads valid state.
  - Rejects malformed payloads.
  - Returns `null` when `window` is unavailable.
  - Handles `localStorage` read/write/remove failures without throwing.
- `src/lib/firebase.ts`
  - Reuses existing app when present.
  - Initializes app when needed.
  - Returns `null` outside the browser.
  - Returns `null` when analytics is unsupported.

### Worker and Algorithm Coverage

- `src/workers/paginationWorker.ts`
  - Empty text returns one empty page.
  - Newline handling preserves blank lines.
  - Long lines wrap at whitespace when possible.
  - Long words fall back to character-based breaking.
  - `renderAllPagesForExport` changes page limit behavior correctly.
  - Ruled paper margin offset affects available line width.
  - Background line spacing changes lines per page.
  - Total page count is correct when only partial pages are returned.

Recommended refactor before broad test coverage:

- Export `paginate`, `nextLineFrom`, and `createMeasure` from a small helper module such as `src/lib/pagination.ts`.
- Keep the worker file focused on message passing.

- `src/lib/lineDetection.ts`
  - Returns `null` outside the browser.
  - Returns `null` when no canvas context exists.
  - Detects consistent horizontal lines from mocked image data.
  - Rejects noisy or insufficient peaks.
  - Respects margins and expected line height filtering.

Recommended refactor before deep coverage:

- Extract row-scanning and peak clustering into pure helpers so most tests do not depend on DOM canvas mocks.

### Server and Request Handler Coverage

- `src/app/api/feedback/route.ts`
  - Successful POST returns `200`.
  - Missing `EMAIL_PASS` returns `200` with the fallback message.
  - Transporter send failure returns `500`.
  - Email payload includes rating and improvement text.

Note:

- The Next.js route currently does not validate `rating`, while `functions/src/index.ts` does. Tests should expose that mismatch so behavior can be aligned instead of cementing inconsistent rules.

- `functions/src/index.ts`
  - Non-`POST` request returns `405`.
  - Invalid ratings return `400`.
  - String body JSON is parsed correctly.
  - Missing `EMAIL_PASS` returns fallback `200`.
  - Mail transport success returns `200`.
  - Mail transport failure returns `500`.

### UI Component Coverage

- `src/components/FeedbackDialog.tsx`
  - Submit button disabled until a rating is selected.
  - Rating click updates UI state.
  - Successful submit shows thank-you state and calls `onClose` after timeout.
  - Failed submit shows error path.

- `src/components/SamplePreviewGallery.tsx`
  - Renders both preview images.
  - First image is eager/high priority.
  - `srcSet` is applied when mobile image is present.

- `src/app/firebase-analytics.tsx`
  - Calls `getFirebaseAnalytics()` once on mount.

- `src/app/page.tsx`
  - Smoke test for main CTA links and sample gallery presence.

- `src/app/contact/page.tsx`
  - Smoke test for contact email and navigation links.

### Large Component Refactors Before Testing

These files should not be attacked with full rendering tests immediately. They need light refactoring first so the tests target behavior instead of DOM trivia.

- `src/components/SettingsPanel.tsx`
  - Extract file parsing helpers for custom font uploads.
  - Extract line-detection request shaping into a pure helper.
  - Then test:
    - font selection updates settings
    - invalid font upload shows validation error
    - successful line detection updates page settings
    - failed line detection shows error state

- `src/components/ExportPanel.tsx`
  - Extract helper functions into a module such as `src/lib/exportHelpers.ts`:
    - `shouldNormalizeColor`
    - `normalizeCanvasColor`
    - export wait helpers if feasible
  - Then test:
    - format and quality state changes
    - export callback state transitions
    - clone sanitization helpers with DOM mocks

- `src/components/HandwritingEditor.tsx`
  - First split testable logic into hooks/helpers:
    - debounced text propagation
    - randomness utilities
    - page settings normalization
    - toolbar drag calculations
    - text field positioning math
  - Then add targeted tests for:
    - local text debouncing into `onTextChange`
    - pagination worker result handling
    - mode switching between writing and text field modes
    - current page changes
    - text field add/update/remove flows

## Priority Order

1. Harness and scripts
2. `src/lib/editorPersistence.ts`
3. `src/workers/paginationWorker.ts`
4. `functions/src/index.ts`
5. `src/app/api/feedback/route.ts`
6. `src/lib/firebase.ts`
7. `src/lib/lineDetection.ts`
8. `src/components/FeedbackDialog.tsx`
9. `src/components/SettingsPanel.tsx`
10. `src/components/ExportPanel.tsx`
11. `src/components/HandwritingEditor.tsx`
12. Landing/contact smoke tests

## Coverage Targets

Initial target after first pass:

- `src/lib/*`: 90%+ statements
- `src/workers/*`: 85%+ statements
- `src/app/api/*`: 90%+ statements
- `functions/src/*`: 90%+ statements
- `src/components/*`: focus on critical behavior, not blanket percentage

Later target after refactors:

- overall repo coverage gate at 75% statements

## Refactors That Should Happen Before Heavy Test Writing

- Move pagination logic out of the worker transport wrapper.
- Move line-detection math out of DOM-heavy code paths.
- Move export sanitization helpers out of `ExportPanel`.
- Move small state/math helpers out of `HandwritingEditor`.
- Align feedback validation rules between the Next.js route and Firebase function.

## Definition of Done

The unit test effort is complete when:

1. Root app and `functions/` both have repeatable `test` and `test:coverage` commands.
2. All pure logic and request handlers listed above are covered.
3. Critical user flows in `FeedbackDialog`, `SettingsPanel`, `ExportPanel`, and `HandwritingEditor` have focused behavioral tests.
4. Coverage reporting runs locally and in CI.
5. Flaky browser-API-dependent tests are minimized by moving logic into pure modules.

## Execution Sequence

1. Add the root and `functions/` test harness.
2. Cover `src/lib/utils.ts`, `src/lib/types.ts`, `src/lib/editorPersistence.ts`, and `src/lib/firebase.ts`.
3. Refactor pagination logic out of `src/workers/paginationWorker.ts` and cover it.
4. Refactor `src/lib/lineDetection.ts` into more testable helpers and cover it.
5. Cover `functions/src/index.ts` and `src/app/api/feedback/route.ts`.
6. Add tests for `src/components/FeedbackDialog.tsx`, `src/components/SamplePreviewGallery.tsx`, `src/app/firebase-analytics.tsx`, `src/app/page.tsx`, and `src/app/contact/page.tsx`.
7. Extract helpers from `src/components/SettingsPanel.tsx` and add targeted tests.
8. Extract helpers from `src/components/ExportPanel.tsx` and add targeted tests.
9. Extract testable logic from `src/components/HandwritingEditor.tsx` and add focused behavioral tests.
10. Add coverage gates and wire tests into CI.
