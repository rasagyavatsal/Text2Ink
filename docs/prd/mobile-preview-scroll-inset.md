## Problem Statement

On mobile, the **Preview** already gains extra scrollable space when the **Control Sheet** is opened, but it does not gain matching scrollable space during **Preview Editing** when the mobile keyboard opens. As a result, a writer cannot scroll the **Preview** upward the same way they can when the **Control Sheet** is visible, and lower content becomes harder to work with.

## Solution

Add a generalized **Preview Scroll Inset** model for the mobile editor. The **Preview** should continue using a **Control Sheet Inset** when the **Control Sheet** is the active **Bottom Obstruction**. During **Preview Editing**, once the browser reports a real mobile keyboard overlap, the **Preview** should switch to a **Keyboard Scroll Inset** that replaces the **Control Sheet Inset**. The **Preview** scale must remain stable, the editor must not auto-scroll the caret into view, and the inset must update live as the reported keyboard overlap changes.

## User Stories

1. As a mobile writer, I want the **Preview** to gain extra scrollable space when the **Control Sheet** opens, so that I can scroll handwritten content above the visible controls.
2. As a mobile writer, I want the same kind of scrollable space when the mobile keyboard opens during **Preview Editing**, so that the experience matches the existing **Control Sheet** behavior.
3. As a mobile writer, I want the **Preview** scale to stay unchanged when the keyboard opens, so that the page does not suddenly zoom or shrink.
4. As a mobile writer, I want to scroll the **Preview** manually while the keyboard is open, so that I can position the current writing area above the keyboard myself.
5. As a mobile writer, I do not want the editor to auto-scroll the caret into view, so that the page position remains predictable.
6. As a mobile writer, I want **Preview Editing** in the body text area to activate the **Keyboard Scroll Inset**, so that long-form writing behaves correctly.
7. As a mobile writer, I want **Preview Editing** in page text boxes to activate the **Keyboard Scroll Inset**, so that text boxes behave the same way as body text.
8. As a mobile writer, I want the **Control Sheet** to collapse to **peek** when typing starts, so that the **Preview** keeps as much visible space as possible.
9. As a mobile writer, I want the **Control Sheet** to stay at **peek** after typing ends, so that the layout does not jump back unexpectedly.
10. As a mobile writer, I want the **Keyboard Scroll Inset** to appear only when the browser reports a real keyboard overlap, so that no fake space appears from simple focus events or hardware keyboards.
11. As a mobile writer, I want the **Keyboard Scroll Inset** to disappear when the keyboard closes, so that the **Preview** returns to its non-keyboard layout immediately.
12. As a mobile writer, I want the **Keyboard Scroll Inset** to replace the **Control Sheet Inset** while the keyboard is open, so that the hidden **Control Sheet** does not add extra unused space.
13. As a mobile writer, I want the **Keyboard Scroll Inset** to track live keyboard size changes, so that orientation changes and browser chrome changes do not leave the **Preview** misaligned.
14. As a mobile writer, I want the **Preview** to behave consistently across phones and tablets, so that the editor remains usable on different mobile viewports.
15. As a mobile writer, I want the **Preview Scroll Inset** to use real **Obstruction Height** values, so that different browsers and keyboard layouts are handled accurately.
16. As a mobile writer, I want the **Control Sheet** to remain inaccessible while the keyboard is open, so that the interface does not present competing bottom interactions.
17. As a mobile writer, I want the **Preview** to continue working when the keyboard never opens, so that focus alone does not disturb the layout.
18. As a mobile writer, I want the **Preview** scroll behavior to remain stable while switching between body text and text boxes, so that mixed editing flows feel consistent.
19. As a mobile writer, I want returning mobile sessions to preserve the current preview scale rules, so that keyboard behavior does not interfere with saved zoom preferences.
20. As a maintainer of the editor, I want the mobile obstruction rules expressed in one place, so that future changes to **Control Sheet Inset** and **Keyboard Scroll Inset** remain testable and predictable.

## Implementation Decisions

- Introduce a deep module that owns mobile **Preview Scroll Inset** decisions. It should encapsulate the rules for choosing between **Control Sheet Inset** and **Keyboard Scroll Inset**, replacing one with the other when appropriate, and returning a single effective inset for the **Preview**.
- Keep the existing mobile **Control Sheet** flow where starting **Preview Editing** collapses the sheet to **peek**.
- Track **Preview Editing** focus centrally in the editor shell so both body text editing and page text box editing participate in the same inset rules.
- Add keyboard overlap detection based on real browser-reported overlap rather than guessed heights. Focus alone must not enable the **Keyboard Scroll Inset**.
- Apply the effective **Preview Scroll Inset** to the **Preview** scroller only; do not change preview scaling logic when the keyboard opens.
- Update the inset live whenever the reported keyboard overlap changes.
- Preserve the current product behavior that the **Control Sheet** is effectively unavailable while the mobile keyboard is open.
- Keep the implementation localized to mobile editor shell behavior; desktop sidebar behavior remains unchanged.
- Prefer naming and comments that use the glossary terms **Preview Scroll Inset**, **Control Sheet Inset**, **Keyboard Scroll Inset**, and **Obstruction Height**.
- No schema changes, persistence format changes, network API changes, or export format changes are required.

## Testing Decisions

- Good tests should verify externally visible behavior: the **Preview** scroll space changes correctly, preview scale stays stable, keyboard-driven insets appear only with real overlap, and body text plus text box editing both participate in the same mobile behavior. Tests should avoid coupling to internal state variables or implementation-specific hooks.
- Test the deep **Preview Scroll Inset** decision module with focused unit tests covering sheet-only, keyboard-only, replacement behavior, no-overlap focus, and live overlap updates.
- Extend editor-shell integration tests to verify that mobile typing collapses the **Control Sheet** to **peek**, that keyboard-driven inset logic does not change preview scale, and that keyboard-driven inset logic replaces the **Control Sheet Inset**.
- Extend **Preview Editing** component tests so both body text editing and text box editing prove they signal focus/blur correctly to the shell-level mobile behavior.
- Reuse the existing testing style already present for mobile sheet metrics, editor route behavior, body text editing behavior, and text box behavior as prior art.

## Out of Scope

- Auto-scrolling the caret or active line into view.
- Changing preview zoom behavior in response to keyboard visibility.
- Redesigning the **Control Sheet** interaction model beyond the existing collapse-to-**peek** behavior.
- Making the **Control Sheet** interactive while the keyboard is open.
- Desktop editor layout changes.
- Export, pagination, or rendering changes unrelated to mobile **Preview Scroll Inset** behavior.
- Broader refactors of the bottom sheet library beyond what is needed to integrate the **Preview** behavior.

## Further Notes

- The current code already has strong prior art for stable preview scale during **Control Sheet** changes and for mobile sheet metric calculation; the new work should extend that pattern rather than replacing it.
- No ADR is proposed at this stage because the change is a local interaction rule, already grounded in the project glossary, and remains reasonably reversible.
