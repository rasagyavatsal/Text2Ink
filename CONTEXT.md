# Text2Ink Editor

The Text2Ink Editor lets a writer compose handwritten-looking pages while adjusting page appearance and export controls across desktop and mobile layouts.

## Language

**Preview**:
The visible page canvas the writer reads and scrolls while editing.
_Avoid_: Canvas area, page viewport

**Control Sheet**:
The mobile panel that exposes settings and export controls without replacing the Preview.
_Avoid_: Drawer, toolbar

**Bottom Obstruction**:
Any mobile surface that covers the lower part of the Preview and therefore requires extra scroll space.
_Avoid_: Overlay, blocker

**Preview Scroll Inset**:
Extra scrollable space added beneath the Preview so content can be moved above a Bottom Obstruction.
_Avoid_: Keyboard fix, auto-zoom

**Control Sheet Inset**:
The Preview Scroll Inset caused by the visible height of the Control Sheet.
_Avoid_: Sheet spacer, drawer padding

**Keyboard Scroll Inset**:
The Preview Scroll Inset caused by the visible height of the mobile keyboard.
_Avoid_: Keyboard fix, keyboard padding

**Obstruction Height**:
The real visible height of a Bottom Obstruction that determines how much Preview Scroll Inset the Preview needs.
_Avoid_: Guessed spacer, fixed keyboard height

**Preview Editing**:
A typing interaction that happens directly on the Preview rather than inside the Control Sheet.
_Avoid_: Sheet editing, sidebar typing

## Relationships

- A **Control Sheet** is a **Bottom Obstruction**
- A **Bottom Obstruction** requires a **Preview Scroll Inset** beneath the **Preview**
- A **Control Sheet Inset** and a **Keyboard Scroll Inset** are both kinds of **Preview Scroll Inset**
- A **Preview Scroll Inset** is sized from the current **Obstruction Height**
- **Preview Editing** activates the **Keyboard Scroll Inset** when the mobile keyboard is open
- While the mobile keyboard is open, the **Keyboard Scroll Inset** replaces the **Control Sheet Inset**
- While the mobile keyboard is open, only the visible keyboard obstruction contributes to the **Keyboard Scroll Inset**; the hidden **Control Sheet** does not

## Example dialogue

> **Dev:** "When the mobile keyboard opens over the **Preview**, should we shrink the page?"
> **Domain expert:** "No — keep the **Preview** scale stable and add a **Keyboard Scroll Inset** so the writer can move content above the obstruction."

## Flagged ambiguities

- "preview scroll" was ambiguous between auto-scrolling and adding extra scroll space — resolved: use **Keyboard Scroll Inset** for the extra scrollable space beneath the **Preview**.
- "where typing happens" was ambiguous between the **Control Sheet** and the **Preview** — resolved: mobile keyboard-driven typing is **Preview Editing**.
- "sheet interaction while typing" was ambiguous — resolved: when the mobile keyboard is open, the **Control Sheet** is not accessible until the keyboard closes.
