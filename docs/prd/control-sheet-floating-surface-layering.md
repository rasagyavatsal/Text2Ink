## Problem Statement

On mobile, opening page layout controls inside the **Control Sheet** can appear to do nothing because the resulting **Floating Surface** renders behind the **Control Sheet** instead of above it. This currently blocks changes such as page format and orientation, and it exposes a broader layering bug for any shared portalled surface opened from the **Control Sheet**.

## Solution

Introduce an explicit editor surface layering contract so the **Control Sheet**, **Floating Surface**, and **Modal Dialog** always render in a predictable order. The **Control Sheet** should use its own layer, any shared **Floating Surface** opened from it should render above that layer, and any **Modal Dialog** should render above both. The fix should live in shared primitives and shared chrome tokens so the behavior is consistent across settings, export, popovers, and dialogs.

## User Stories

1. As a mobile writer, I want the Page Format options to open visibly above the **Control Sheet**, so that I can change the page format without the menu appearing broken.
2. As a mobile writer, I want the Orientation options to open visibly above the **Control Sheet**, so that I can switch between portrait and landscape.
3. As a mobile writer, I want export format choices to open visibly above the **Control Sheet**, so that export settings work the same way as page layout settings.
4. As a mobile writer, I want any **Floating Surface** opened from the **Control Sheet** to appear above it, so that controls remain usable wherever they are placed.
5. As a mobile writer, I want taps on items inside a **Floating Surface** to register normally, so that I can make a selection on the first try.
6. As a mobile writer, I do not want a menu to look closed when it is actually open behind the **Control Sheet**, so that the editor feels reliable.
7. As a mobile writer, I want the same layering behavior in both the Settings and Export views, so that the **Control Sheet** feels consistent.
8. As a mobile writer, I want the layering fix to work no matter whether the **Control Sheet** is at peek, default, or expanded height, so that the controls stay usable in every mobile sheet state.
9. As a mobile writer, I want the **Preview** behavior to stay unchanged while opening these controls, so that fixing menus does not disturb page editing.
10. As a mobile writer, I want existing mobile keyboard rules to stay the same, so that this fix does not reopen **Control Sheet** interactions during **Preview Editing**.
11. As a mobile writer, I want text field popovers and similar transient controls to follow the same layering rule, so that floating interactions behave consistently across the editor.
12. As a mobile writer, I want a **Modal Dialog** to appear above both the **Control Sheet** and any **Floating Surface**, so that blocking flows still take visual priority.
13. As a mobile writer, I want dismissing a **Floating Surface** to return me to the same **Control Sheet** state I was in before, so that the interaction feels stable.
14. As a desktop writer, I want the desktop editor behavior to remain unchanged, so that a mobile layering fix does not affect the sidebar workflow.
15. As a writer using light or dark chrome, I want surface layering to work the same way in either theme, so that theme choice does not change control usability.
16. As a maintainer, I want one semantic layer contract for editor surfaces, so that future controls do not need one-off z-index fixes.
17. As a maintainer, I want shared primitives to consume the layer contract directly, so that new dropdowns, popovers, and dialogs inherit the correct behavior automatically.
18. As a maintainer, I want a regression test around **Floating Surface** behavior inside the **Control Sheet**, so that this bug does not silently return.

## Implementation Decisions

- Introduce a shared semantic layer contract with the ordered stack: **Control Sheet** < **Floating Surface** < **Modal Dialog**.
- Represent that contract as global chrome-layer tokens so shared UI primitives can consume one source of truth.
- Override the **Control Sheet** wrapper to use the explicit **Control Sheet** layer instead of relying on the bottom-sheet library default.
- Update shared select and popover primitives to render on the **Floating Surface** layer.
- Update the shared dialog primitive so both its blocking backdrop and dialog content render on the **Modal Dialog** layer.
- Apply the fix at the shared primitive level rather than patching only the Page Format and Orientation controls.
- Keep the current **Preview**, **Preview Scroll Inset**, and mobile keyboard interaction rules unchanged.
- Keep the layer token values theme-independent; the semantic order should not vary between light and dark chrome.
- No schema, persistence, export-format, or network API changes are required.

## Testing Decisions

- Good tests should verify externally meaningful behavior: shared editor surfaces render with the correct visual priority in real compositions, while avoiding assertions about unrelated internal implementation details.
- Add a regression test for a mobile editor-shell composition that opens a shared **Floating Surface** from the **Control Sheet** and verifies it uses the layer contract above the **Control Sheet**.
- Add or extend focused shared-primitive tests only where needed to prove that select, popover, and dialog surfaces consume the semantic layer contract.
- Reuse the existing testing style already used for mobile editor-shell behavior and shared dialog behavior as prior art.
- Keep tests targeted at the shared layer contract and visible interaction results, not at incidental DOM structure.

## Out of Scope

- Redesigning the **Control Sheet** interaction model.
- Changing **Preview Scroll Inset** or mobile keyboard behavior.
- Altering desktop sidebar behavior.
- Reworking non-portalled controls that are not part of the shared surface layering problem.
- Introducing theme-specific layer orders.
- Broader refactors of the bottom-sheet library beyond explicitly assigning the **Control Sheet** layer.

## Further Notes

- The current bug is visible in page layout controls, but the fix should protect all shared **Floating Surface** usage inside the **Control Sheet**.
- No ADR is proposed at this stage because this is a local UI contract, the chosen stack order is unsurprising once named, and the decision remains reasonably reversible.
