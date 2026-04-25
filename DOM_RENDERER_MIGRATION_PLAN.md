# DOM Renderer Migration Plan

## Purpose

This document ends the renderer design discussion and records the agreed direction with enough precision to implement later without reopening the same decisions.

The core goal is native mobile text selection for the main body text while preserving export parity. The current canvas body preview cannot provide native iOS/Android text selection handles because canvas pixels are not selectable text. The target architecture makes the visible body page a real DOM editing surface and exports the same DOM rendering.

This is a design record only. It does not represent an implementation.

## Current Problem

Mobile mode currently does not handle main body text selection well because the body text preview is canvas-rendered.

Current behavior:

- Main body text is held in app state as a plain string.
- A hidden textarea receives keyboard input and owns app selection state.
- `CanvasPreview` draws body text on a canvas.
- `CanvasPreview` implements custom hit-testing and custom selection overlays.
- Text boxes are separate DOM objects handled by `TextField`.
- Export uses a custom canvas renderer through `renderPageToCanvas`.
- Both preview and export share `UnifiedPagePainter`, which prevents preview/export drift today.

The problem is not simply "canvas is slow." The important constraint is that canvas text is not native selectable text. Mobile long-press, selection handles, native selection menus, and native editing behavior belong to DOM text controls/contenteditable surfaces, not canvas.

## Reference Site Analysis

Reference site:

- `https://texttohandwriting.in/`
- `https://texttohandwriting.in/js/text-to-handwriting-converter.min.js`
- `https://texttohandwriting.in/css/text-to-handwriting-converter.min.css`
- `https://texttohandwriting.in/js/text-to-handwriting.js`

Observed architecture:

- The source input is a normal textarea: `#tof-user-input`.
- The preview body is real DOM text inside `.tof-preview-text-content`.
- Page styling is CSS-driven: font family, font size, line height, letter spacing, word spacing, margins, width, height, color, and background.
- Additional page objects are absolutely-positioned DOM nodes: `.tof-preview-overlay-element`.
- Overlay text objects become `contenteditable="true"` when clicked.
- Formatting for overlay objects uses `window.getSelection()` and `document.execCommand(...)`.
- Export captures `.tof-preview-page` with `html2canvas(outputElem[0], { scale: 2 })`.
- PDF export sends captured page images to a worker (`js/text-to-handwriting.js`) that uses `jsPDF`.
- Multi-page export loops through pages, swaps the visible page DOM content, captures each page, then creates a PDF or zip/images.

Important interpretation:

- The reference site does not have a separate custom canvas text layout engine for export.
- Its export canvas is a rasterization of the DOM preview.
- That is why preview/export text positions stay aligned: the DOM is the single visual source of truth.

## Agreed Decisions

1. Main body text must use native DOM selection.

2. The main body page should become a `contenteditable` editing surface, not only a read-only DOM preview.

3. The body editor should be plain text only.

4. Text boxes should remain separate editable page objects.

5. The app should use the same body renderer on desktop and mobile.

6. Export should capture the same DOM rendering used for preview/editing.

7. "Canvas for export" means DOM-to-canvas capture, such as `html2canvas`, not the current custom canvas text renderer.

8. Native selection across multiple pages is not required for the first migration.

9. The app can continue showing one page at a time.

10. Edits can immediately reflow text across pages.

11. Randomness should be completely removed from the codebase, not hidden behind a disabled UI.

## Explicit Non-Goals

These are out of scope for the agreed migration:

- Per-character random spacing, baseline jitter, or rotation.
- Custom mobile selection handles.
- Native selection across page boundaries.
- Rich text formatting for main body text.
- Keeping the custom canvas text renderer as the body export source.
- Maintaining two independent body layout engines.

## Terminology

Source text:

The canonical plain string for the main body document.

Page slice:

A contiguous range of source text assigned to one page, represented by a start offset and end offset in the source text.

Current page body editor:

The visible `contenteditable` DOM element for the currently selected page slice.

Overlay text field:

A separate positioned editable object stored in `pageSettings.textFields`.

DOM export canvas:

A canvas produced by rasterizing the rendered page DOM. This canvas is used to create PNG/JPG/PDF output.

Custom canvas renderer:

The current rendering path based on `CanvasRenderingContext2D` and `UnifiedPagePainter`. This should not remain the source for body text export after the DOM migration.

## Target Architecture

### Runtime Editing Flow

Target flow:

```text
global source text
  -> paginate into page slices
  -> render current page slice into contenteditable DOM
  -> user edits/selects with native browser behavior
  -> read edited plain text from contenteditable
  -> replace the edited page slice in global source text
  -> repaginate
  -> restore selection/caret where possible
```

Key property:

The visible body page is the editor. The hidden textarea should not remain the primary selection/editing surface for body text after the migration.

### Export Flow

Target flow:

```text
ensure all pages are paginated
for each page:
  render that page's DOM exactly as preview/export should look
  wait for fonts and images
  capture page DOM into canvas
  save PNG/JPG or send image to PDF worker
```

Export must include:

- Page background.
- Paper lines/grid/ruled margin if rendered in DOM/SVG/CSS.
- Body text.
- Overlay text fields.
- Overlay images if added later.
- Export-only visual effects if any are still desired.

Export must not redraw body text using a separate canvas text algorithm.

## Body Text Editor Requirements

The body text editor should be a DOM contenteditable region with a plain-text data contract.

Recommended attributes and behavior:

- Use `contenteditable="plaintext-only"` where supported.
- Treat browser support for `plaintext-only` as progressive enhancement.
- Add a paste handler that inserts only `text/plain`.
- Prevent rich HTML from entering the document model.
- Use `spellcheck={false}` unless explicitly changed later.
- Use CSS for all visual text styling.
- Preserve newlines in the source text.
- Normalize line endings to `\n`.
- Do not use per-character wrappers in the editable body text.

Recommended CSS behavior:

- Use the selected handwriting font.
- Use the selected font size.
- Use the selected ink color.
- Use the selected line height.
- Use the page content box derived from margins.
- Use a whitespace rule that preserves newlines and spaces consistently.
- Candidate: `white-space: break-spaces`.
- If `break-spaces` creates browser issues, use `white-space: pre-wrap` and document the tradeoff.

Plain text extraction must be centralized in a helper and covered by tests.

The helper must define:

- How `<div>`, `<br>`, and text nodes become `\n`.
- Whether trailing browser-inserted newlines are stripped.
- How non-breaking spaces are normalized.
- How tabs are preserved or normalized.
- How pasted HTML is converted to text.

## State Model

The global source text remains the source of truth for main body text.

For the currently visible page:

- `pageStartOffset` identifies the first source-text character on the page.
- `pageEndOffset` identifies the exclusive end offset.
- The contenteditable DOM displays `sourceText.slice(pageStartOffset, pageEndOffset)`.

On body editor input:

1. Read the edited page-local plain text.
2. Replace the current page slice:

```text
nextText =
  oldText.slice(0, pageStartOffset)
  + editedPageText
  + oldText.slice(pageEndOffset)
```

3. Save `nextText` into state.
4. Repaginate after a small debounce.
5. Restore caret/selection.

This avoids per-page text divergence.

## Selection Restoration

Native browser selection is the primary user-facing selection.

The app still needs to map selection to global document offsets for state restoration and keyboard/editing behavior.

Required helper functions:

- Convert current DOM selection to page-local plain-text offsets.
- Convert page-local offsets to global source-text offsets.
- Restore a DOM selection from page-local offsets.
- Find the page containing a global offset after repagination.

Important cases:

- Collapsed caret.
- Forward selection.
- Backward selection.
- Selection ending at a line break.
- Selection ending at the end of the page.
- Selection during composition/IME input.
- Selection after paste.
- Selection after text moves to a different page.

Open decision:

When an edit on page 2 causes the caret text to reflow onto page 1 or page 3, the app needs a page-restoration rule.

Recommended rule:

- Track the global focus offset.
- After repagination, navigate to the page containing that focus offset.
- If that causes visual jumps that feel bad, keep the current page unless the focus offset is no longer inside it.

This should be decided before implementation.

## IME And Mobile Keyboard Requirements

Contenteditable implementation must handle composition correctly.

Required behavior:

- During `compositionstart` to `compositionend`, do not aggressively repaginate on every intermediate input.
- Do not replace DOM content while composition is active.
- On `compositionend`, read the final text, update state, and repaginate.
- Ensure iOS Safari and Android Chrome can open the keyboard by tapping body text.
- Ensure native selection handles appear on long press.
- Ensure selected text can be replaced by typing.
- Ensure paste uses plain text only.

This must be manually tested on real mobile browsers or reliable device emulators.

## Pagination Requirements

The current pagination uses canvas/OffscreenCanvas text measurement. That is not ideal for a DOM-source renderer because DOM and canvas text measurement can differ.

Target pagination should be DOM-measured.

Recommended algorithm:

1. Create a hidden measurement container.
2. Apply the exact same CSS as the body text content box.
3. Set width, font family, font size, line height, whitespace handling, word wrapping, and margins exactly as the rendered page.
4. For each page, find the largest source-text prefix that fits the page content height.
5. Prefer breaking at explicit newlines or whitespace.
6. Guarantee progress for long unbroken words by allowing character-level breaks.
7. Produce page slices with start and end offsets.
8. Reuse per-page settings when pages have different margins, font sizes, line spacing, or backgrounds.

This likely needs to run on the main thread because DOM layout is unavailable in a Web Worker.

Performance requirements:

- Debounce pagination while typing.
- Avoid full repagination if a narrow incremental path is practical later.
- Initially favor correctness over worker isolation.
- Avoid measuring one character at a time for large documents unless necessary.
- Use binary search to find fitting slice boundaries.
- Cache repeated style/layout inputs where possible.

Important detail:

DOM pagination and DOM export must use the same CSS. If they do not, page breaks and export output will drift.

## Page Rendering Requirements

Each page should be a DOM composition with stable layers:

```text
page frame
  background layer
  paper lines/grid layer
  body text contenteditable layer
  overlay object layer
```

Body text layer:

- Owns native text editing and selection.
- Uses transparent or visible text depending on implementation.
- Since randomness is removed, visible text can be the actual contenteditable text.

Overlay object layer:

- Contains text boxes from `pageSettings.textFields`.
- Text boxes remain independent from body text.
- Text boxes are page-anchored, not part of body pagination.
- Text boxes can stay textarea-based or become contenteditable later.

Layering requirements:

- Body text must receive pointer/touch events for editing.
- Overlay controls must stop events from reaching body text when interacting with a text box.
- Export should hide editor-only handles, buttons, outlines, resize affordances, and selection UI.
- Export should include visible text box contents.

## Text Boxes

Agreed decision:

Text boxes remain separate editable objects.

Current text box behavior:

- `TextField` is positioned with `x`, `y`, `width`, and `height`.
- It has its own textarea for editing.
- It supports drag, resize, font size, color, delete, and focus behavior.

After randomness removal:

- Text boxes should not render per-character randomized spans.
- Text boxes should render deterministic text only.
- The `randomness` prop should be removed from `TextField`.
- Text field export should capture the same DOM representation seen in preview.

If text boxes remain textarea-backed:

- Confirm DOM capture includes textarea contents reliably.
- If `html2canvas` does not capture textarea text consistently across browsers, render a visible text layer and make the textarea transparent while focused.

## Randomness Removal Scope

"Completely remove randomness" means remove the feature from the public app and code model, not merely disable it.

Required removals:

- Remove `randomness` from `HandwritingSettings`.
- Remove `randomness` from `DEFAULT_SETTINGS`.
- Remove randomness UI from `SettingsPanel`.
- Remove the "Realism Effects" section if randomness was its only control.
- Remove unused `Switch` import if no longer needed.
- Remove `seededRandom`, `RandomStyle`, and `calculateRandomStyle` if no other feature uses them.
- Remove randomness imports from components.
- Remove randomness prop from `TextField`.
- Remove randomness rendering from `UnifiedPagePainter`.
- Remove randomness from text field DOM rendering.
- Remove randomness tests.
- Update tests that construct `HandwritingSettings`.

Persistence requirement:

Old saved editor state may contain `settings.randomness`.

If the field is truly removed:

- Load should normalize persisted settings.
- Unknown legacy fields should be stripped before they are re-saved.
- Missing fields should be filled from current defaults.
- This should be covered by persistence tests.

Suggested helper:

```text
normalizeHandwritingSettings(persistedUnknown): HandwritingSettings
```

This helper should:

- Accept unknown persisted data.
- Copy only supported setting keys.
- Fill missing values from `DEFAULT_SETTINGS`.
- Validate primitive types where practical.
- Drop `randomness`.

## Current Code Areas Affected Later

Likely body renderer migration files:

- `src/components/HandwritingEditor.tsx`
- `src/components/CanvasPreview.tsx`
- `src/components/TextField/TextField.tsx`
- `src/components/ExportPanel.tsx`
- `src/lib/canvasRenderer.ts`
- `src/lib/renderer/UnifiedPagePainter.ts`
- `src/lib/pagination.ts`
- `src/workers/paginationWorker.ts`
- `src/workers/pdfWorker.ts`
- `src/lib/types.ts`
- `src/lib/editorHelpers.ts`
- `src/lib/editorPersistence.ts`
- `src/lib/settingsHelpers.ts`
- Tests under `src/components/__tests__`
- Tests under `src/lib/__tests__`

Potential future new modules:

- `src/lib/domText.ts`
- `src/lib/domPagination.ts`
- `src/lib/domSelection.ts`
- `src/lib/domExport.ts`
- `src/components/DomPagePreview.tsx`
- `src/components/BodyTextEditor.tsx`

Naming can change, but the boundaries should stay clear:

- Text normalization.
- DOM selection mapping.
- DOM pagination.
- DOM export capture.
- Page rendering.

## Export Quality

Current export uses a high canvas scale around 300 DPI.

The reference site uses `html2canvas(..., { scale: 2 })`.

Open decision:

Choose the export scale target.

Options:

- `scale: 2`: faster and closer to reference site.
- `scale: window.devicePixelRatio`: natural screen-based scale, inconsistent across devices.
- `scale: 4.1667`: closer to current 300 DPI export quality, heavier memory and slower.
- User-selectable export quality: best UX later, more scope now.

Recommended first implementation:

- Use a constant high-quality default.
- Start with `scale: 2` only if performance or memory is a blocker.
- Test PDF file size and text sharpness.

## html2canvas Considerations

The DOM capture library becomes part of the rendering contract.

Risks:

- Font loading must complete before capture.
- External images can taint canvas unless CORS is handled.
- Data URL backgrounds should be safe.
- CSS filters and blend modes may not capture exactly.
- Textareas may not always capture exactly as expected.
- Selection highlights and carets must be hidden during export.
- Editor controls must be hidden during export.
- Transform-heavy layouts can capture differently across browsers.

Required export preparation:

- Wait for `document.fonts.ready`.
- Explicitly load selected font before capture.
- Wait for background images to decode.
- Add an export mode class to hide controls.
- Ensure page scale/zoom is reset or accounted for.
- Capture the logical page DOM, not the screen-scaled page if possible.

## Line Tilt

Current app supports `lineTilt`.

Important risk:

Applying CSS transforms to a contenteditable body may affect native selection handles, hit testing, and mobile editing behavior.

Options:

1. Keep line tilt for body text using CSS transform and test mobile behavior.
2. Disable line tilt for the body editor during editing and apply it only during export.
3. Remove line tilt with randomness if native selection quality is the top priority.

Recommended decision before implementation:

Test native selection handles on a transformed contenteditable element in iOS Safari and Android Chrome. If handles behave poorly, line tilt should be deferred or export-only.

## Paper Rendering

Paper can be rendered with DOM/CSS/SVG instead of canvas.

Options:

- CSS repeating linear gradients for lined/grid paper.
- SVG layer for ruled lines and margin lines.
- DOM absolutely-positioned line elements.
- Background image for custom pages.

Recommendation:

- Use CSS/SVG layers for deterministic export.
- Keep custom background images as image layers.
- Do not draw paper lines with a separate canvas if export captures DOM.

## Data Compatibility

Existing user data may include:

- Global source text.
- Page settings.
- Text fields.
- Custom fonts.
- Custom background images.
- Old randomness settings.

Migration requirements:

- Old data should load without crashing.
- Old randomness data should be ignored and removed on next save.
- Existing text fields should preserve position, text, color, and font size.
- Existing custom background images should remain usable.
- Existing page settings should remain usable.

## Recommended Migration Phases

### Phase 1: Remove Randomness

Goal:

Remove randomness cleanly before changing renderer architecture.

Tasks:

- Remove type/default fields.
- Remove settings UI.
- Remove helper functions.
- Simplify body/text field renderer behavior.
- Update tests.
- Add persisted settings normalization if needed.

Verification:

- Unit tests pass.
- Type check passes.
- Lint passes.
- Build passes.
- Manual preview confirms text still renders deterministically.

### Phase 2: Introduce DOM Page Body Editor

Goal:

Replace canvas body interaction with a contenteditable body page for both desktop and mobile.

Tasks:

- Add body text contenteditable component.
- Add plain text normalization helpers.
- Add selection offset mapping helpers.
- Replace hidden textarea as the body editing source.
- Keep global text as source of truth.
- Replace page slice on input.
- Add composition event handling.

Verification:

- Typing works.
- Tap caret placement works.
- Long-press native selection works on mobile.
- Selected text replacement works.
- Paste strips formatting.
- Undo/redo remains acceptable.

### Phase 3: Move Pagination To DOM Measurement

Goal:

Ensure page breaks match the DOM renderer.

Tasks:

- Add hidden DOM measurement container.
- Paginate by fitting measured DOM text into page content boxes.
- Support per-page settings.
- Support custom line spacing.
- Support long words.
- Remove or bypass worker/canvas pagination for body text.

Verification:

- Page breaks match visible DOM.
- Reflow after edits is stable.
- Large text remains responsive enough.

### Phase 4: Move Export To DOM Capture

Goal:

Export the same DOM the user sees.

Tasks:

- Add DOM capture dependency if not already present.
- Render export page DOM at logical page size.
- Wait for fonts/images.
- Hide editor controls.
- Capture to canvas.
- Feed captured image to PNG/JPG/PDF paths.
- Keep PDF worker if useful.

Verification:

- Exported output matches preview.
- Text fields appear correctly.
- Backgrounds appear correctly.
- Multi-page export is stable.
- Export quality is acceptable.

### Phase 5: Remove Obsolete Canvas Body Renderer

Goal:

Remove dead architecture after DOM export is working.

Tasks:

- Remove or narrow `CanvasPreview`.
- Remove or narrow `UnifiedPagePainter`.
- Remove `canvasRenderer` body text path.
- Keep any canvas/image utilities only if still needed.
- Delete obsolete tests.
- Add replacement tests.

Verification:

- No code path exports body text through custom canvas drawing.
- No duplicate body layout engine remains.

## Test Plan

Unit tests:

- Plain text normalization.
- Paste sanitization.
- DOM selection offset mapping using mocked/simple DOM.
- Source text slice replacement.
- Persisted settings normalization.
- Randomness removal from defaults and saved data.
- Text field deterministic rendering props.

Integration tests:

- Body editor input updates global text.
- Page edit replaces only the current page slice.
- Page reflow updates page count.
- Page navigation swaps body text content.
- Text boxes remain independent.
- Export mode hides controls.

Browser/manual tests:

- iOS Safari native selection.
- Android Chrome native selection.
- Desktop Chrome selection.
- Desktop Safari selection.
- Paste plain text on mobile.
- IME/composition input.
- Custom font loading.
- Custom background image export.
- Multi-page PDF export.
- Long document pagination.
- Long unbroken word pagination.
- Newline-heavy text.
- Empty document.
- Text fields while body editor is focused.

Important limitation:

JSDOM does not perform real layout. DOM pagination and DOM capture need browser-level verification. If automated coverage is required, add Playwright or another browser test runner.

## Security And Reliability Notes

Contenteditable introduces HTML injection risk if treated casually.

Security requirements:

- Body text is plain text only.
- Do not store arbitrary body HTML.
- On paste, use `text/plain`.
- Render body text through text nodes, not `dangerouslySetInnerHTML`.
- If any HTML is ever accepted for rich text, it must be sanitized. Rich body text is currently a non-goal.

Reliability requirements:

- Handle missing fonts by falling back safely.
- Handle failed image decode during export.
- Handle `html2canvas` failure with a user-visible export error.
- Avoid corrupting source text during composition.
- Avoid saving unsupported legacy settings back into local storage.

## Remaining Open Questions

These still need explicit answers before implementation:

1. What export scale should replace the current 300 DPI canvas scale?

2. What should happen when editing page 2 causes the caret text to reflow onto another page?

3. Should `lineTilt` remain editable for body text if transformed contenteditable selection handles behave poorly?

4. Should paper lines be CSS gradients or SVG layers?

5. Should text boxes remain textarea-based or move to contenteditable too?

6. Should the first DOM migration include `html2canvas`, or should export temporarily remain blocked until DOM export is implemented?

Recommended answers:

1. Start with a high-quality constant and tune after testing memory/file size.

2. Navigate to the page containing the restored global focus offset.

3. Keep only if mobile native selection remains reliable.

4. Prefer SVG for precise paper lines and export consistency.

5. Keep textarea-based initially; change only if export capture requires it.

6. Include DOM export in the same migration before removing the canvas body renderer.

## Final Architecture Summary

The desired architecture is:

```text
plain source text
  -> DOM-measured pagination
  -> one visible contenteditable page body
  -> native browser selection/editing
  -> separate DOM overlay text fields
  -> DOM-to-canvas export
  -> PNG/JPG/PDF
```

The architecture to avoid is:

```text
DOM body editor
  -> native selection
  -> separate custom canvas text export
```

That avoided architecture creates exactly the discrepancy risk this migration is meant to remove.

