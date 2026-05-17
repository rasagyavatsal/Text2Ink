# Text2Ink Editor

The Text2Ink Editor lets a writer compose handwritten-looking pages while adjusting page appearance and export controls across desktop and mobile layouts.

## Language

**Preview**:
The visible page canvas the writer reads and scrolls while editing.
_Avoid_: Canvas area, page viewport

**Control Sheet**:
The mobile panel that exposes settings and export controls without replacing the Preview.
_Avoid_: Bottom sheet, drawer, toolbar

**Floating Surface**:
A transient anchored surface such as a dropdown or popover that opens above the current editor controls.
_Avoid_: Overlay, popup

**Modal Dialog**:
A blocking surface that takes priority over the rest of the editor until dismissed.
_Avoid_: Popup, overlay

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

**Text Box**:
A positioned editable text region placed on a page outside the main body flow.
_Avoid_: Text field, input, note widget

**Document Content**:
The exportable page content made of paper/background, main body text, Text Box text, page breaks, and Text Box placement.
_Avoid_: Editor UI, controls, chrome

**Editing Chrome**:
Authoring-only controls shown while editing that help manipulate Document Content but are not themselves exported.
_Avoid_: Content, document UI, export UI

**Caret**:
The insertion indicator shown during Preview Editing to mark where typed content will appear.
_Avoid_: Cursor, typing bar

**Selection Highlight**:
The visual range marker shown during Preview Editing to indicate selected content.
_Avoid_: Selected text color, native selection

**Composition Text**:
The in-progress text shown during Preview Editing before an input method commits it.
_Avoid_: Draft glyphs, native composing text

**System Candidate Window**:
The operating-system chooser shown during input-method composition outside the Preview.
_Avoid_: Preview popup, export UI

**Reopened Editor State**:
Previously saved local editor state loaded back into the Text2Ink Editor.
_Avoid_: Draft, legacy snapshot, cached page

**Plain-Text Document**:
Document Content made from plain text with line breaks, without rich-text styling inside the text itself.
_Avoid_: Rich text, formatted document, styled spans

**Current Page**:
The single page in the Preview that accepts direct editing while neighboring pages remain read-only.
_Avoid_: Active canvas, focused sheet, multi-page editor

**Preview Zoom**:
Display-only magnification of the Preview that does not change Document Content layout.
_Avoid_: Reflow zoom, layout scale, export scale

**Render Density**:
The pixel resolution used to draw the same Document Content model for a given output surface.
_Avoid_: Layout mode, page model, zoom level

**Preview Export Parity**:
The exported page matches the Document Content visible in the Preview at all times, including during Preview Editing.
_Avoid_: Close-enough export, approximate export, screenshot parity

## Relationships

- A **Control Sheet** is a **Bottom Obstruction**
- A **Floating Surface** may open from the **Control Sheet**
- A **Modal Dialog** takes visual priority over a **Floating Surface** and the **Control Sheet**
- A **Bottom Obstruction** requires a **Preview Scroll Inset** beneath the **Preview**
- A **Control Sheet Inset** and a **Keyboard Scroll Inset** are both kinds of **Preview Scroll Inset**
- A **Preview Scroll Inset** is sized from the current **Obstruction Height**
- **Preview Editing** activates the **Keyboard Scroll Inset** when the mobile keyboard is open
- While the mobile keyboard is open, the **Keyboard Scroll Inset** replaces the **Control Sheet Inset**
- While the mobile keyboard is open, only the visible keyboard obstruction contributes to the **Keyboard Scroll Inset**; the hidden **Control Sheet** does not
- A **Text Box** belongs to one page in the **Preview**
- **Editing Chrome** may appear over the **Preview** without becoming **Document Content**
- **Preview Export Parity** requires the exported page to preserve the **Document Content** the writer saw in the **Preview**
- **Preview Export Parity** still applies during **Preview Editing**
- A **Caret** and **Selection Highlight** are kinds of **Editing Chrome**
- **Composition Text** is part of **Document Content** during **Preview Editing**
- A **System Candidate Window** is outside the **Preview** and outside **Preview Export Parity**
- A **Reopened Editor State** may reflow when the layout engine changes
- The current parity rewrite keeps the **Plain-Text Document** model
- **Preview Editing** happens on the **Current Page** only
- **Preview Zoom** does not change line breaks, page breaks, or **Text Box** geometry
- **Preview Export Parity** allows different **Render Density** for Preview and export as long as the same **Document Content** model is used

## Example dialogue

> **Dev:** "When the mobile keyboard opens over the **Preview**, should we shrink the page?"
> **Domain expert:** "No — keep the **Preview** scale stable and add a **Keyboard Scroll Inset** so the writer can move content above the obstruction."

## Flagged ambiguities

- "preview scroll" was ambiguous between auto-scrolling and adding extra scroll space — resolved: use **Keyboard Scroll Inset** for the extra scrollable space beneath the **Preview**.
- "where typing happens" was ambiguous between the **Control Sheet** and the **Preview** — resolved: mobile keyboard-driven typing is **Preview Editing**.
- "sheet interaction while typing" was ambiguous — resolved: when the mobile keyboard is open, the **Control Sheet** is not accessible until the keyboard closes.
- "bottom sheet" was used to mean the **Control Sheet** — resolved: use **Control Sheet**.
- "overlay" was ambiguous between a **Floating Surface**, a **Modal Dialog**, and a **Bottom Obstruction** — resolved: use the specific surface name.
- "canvas" was ambiguous between the **Preview** and the rendering technology — resolved: use **Preview** for the user-facing surface and **Preview Export Parity** for the matching export requirement.
- "editing parity" was ambiguous about whether focused editing may temporarily diverge from export — resolved: **Preview Export Parity** also applies during **Preview Editing**.
- "text field" was used for the same concept the UI calls a **Text Box** — resolved: use **Text Box** for the positioned page element.
- "everything visible in the Preview" was ambiguous between **Document Content** and **Editing Chrome** — resolved: **Preview Export Parity** covers **Document Content** only.
- **Text Box** overflow behavior was raised during the parity discussion but is out of scope for this change — resolved: preserve current behavior for now and defer overflow policy.
- "cursor" and "selection" were used loosely during parity discussion — resolved: use **Caret** and **Selection Highlight** as **Editing Chrome** terms.
- "IME UI" was ambiguous between in-progress page content and OS-owned chooser UI — resolved: use **Composition Text** for the page content and **System Candidate Window** for the OS chooser.
- "drafts" was used loosely for persisted local data — resolved: use **Reopened Editor State** for previously saved local editor state, and it may reflow under the new layout engine.
- "text support" was ambiguous between the current content model and a broader text engine — resolved: this parity rewrite stays within the **Plain-Text Document** model.
- "current model" was ambiguous about whether editing spans multiple visible pages — resolved: preserve a single **Current Page** editing surface.
- "zoom" was raised during the parity discussion but is not a redesign target here — resolved: preserve current **Preview Zoom** behavior as display-only.
- "same output" was ambiguous between identical pixels and identical layout — resolved: **Preview Export Parity** requires the same **Document Content** model, not the same **Render Density**.
