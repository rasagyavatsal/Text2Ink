## Validation

After every task completion where code is changed, do these steps:
1. Run the root checks for the Next.js app and root project:
   - `npm run build`
   - `npm run lint`
   - `npm run type-check`
   - `npm run test`
2. Run e2e checks when changes affect routes, browser behavior, editor flows, forms, or other user-facing paths:
   - `npm run test:e2e`
   - `npm run test:e2e:emulator` for Firebase Functions or Firestore-backed flows
3. If code in `functions/` changed, also run the function-specific checks. The root build and type-check scripts do not validate the Firebase Functions TypeScript project.
   - `npm --prefix functions run build`
   - `npm --prefix functions run lint`
   - `npm --prefix functions run test`
4. If the changes are related to UI, open the localhost site and validate changes by taking screenshots using Playwright.

## Write Less Code

Reduce clutter by building only what is strictly necessary.

- Reuse existing libraries, APIs, framework helpers, and built-in language features before writing custom solutions; use web search when it helps find those options, and mention when you do.
- Keep implementations DRY: extract shared logic into small reusable helpers or components when duplication appears.
- Prefer clear higher-order functions such as `map`, `filter`, and `reduce` when they make code shorter and easier to read.
- Delete unused code, stale variables, abandoned scripts, and outdated feature paths instead of preserving dead weight.
- Avoid clever one-liners when a small, readable helper communicates the intent better.

## Prefer Deep Modules

Design modules with small, simple interfaces that hide meaningful implementation complexity.

- Encapsulate sequencing, validation, state handling, and edge cases inside the module instead of forcing callers to coordinate them.
- Keep public methods, parameters, and configuration minimal; expose only what callers need to use the capability correctly.
- Avoid shallow pass-through modules that add names, files, or methods without reducing caller complexity.
- Use the deletion test: if deleting a module only removes indirection, it is probably too shallow; if deleting it spreads complexity across multiple callers, it is likely earning its place.
- Prefer deeper, clearer abstractions over excessive decomposition, but do not hide important domain semantics just to make an API smaller.
