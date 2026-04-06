# Ubiquitous Language

## Viewing & Navigation

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Preview Scale** | The scaling factor (0.4 to 2.0) applied to the editor canvas for display | Zoom level, view size |
| **Auto-fit** | The process of automatically calculating **Preview Scale** to match the device width | Auto-zoom, fit-to-width |
| **Manual Zoom** | A state where the user has overridden **Auto-fit** via explicit controls | Custom zoom, user scale |
| **Page Navigation** | The process of switching between different pages in the editor | Paging, flipping |

## Content & Layout

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Handwriting Settings** | Global visual configurations like ink color and font family | Global settings, style |
| **Page Settings** | Layout configurations specific to a single page, such as margins and font size | Page config, layout overrides |
| **Pagination** | The distribution of text across multiple pages based on **Page Settings** | Reflow, text splitting |
| **Line Data** | The geometric and text data for a single rendered line of handwriting | Row, text line |
| **Text Field** | A draggable, independent text box placed on a page | Floating text, overlay |

## Export & Persistence

| Term | Definition | Aliases to avoid |
|------|-----------|-----------------|
| **Exporting** | The generation of high-resolution images or PDFs from the editor | Downloading, saving output |
| **Editor State** | The complete set of text, settings, and UI state saved to storage | Session, draft |

## Relationships

- **Auto-fit** determines the initial **Preview Scale** on mobile devices.
- **Manual Zoom** prevents **Auto-fit** from re-calculating during a session.
- **Pagination** generates **Line Data** for each page based on both **Handwriting Settings** and **Page Settings**.
- A **Page** contains **Line Data** and zero or more **Text Fields**.

## Example dialogue

> **Dev:** "If the user changes the **Ink Color** in **Handwriting Settings**, does it update all **Line Data** immediately?"
> **Domain expert:** "Yes, global settings affect all pages. However, if they change the **Font Size** in **Page Settings**, it triggers **Pagination** to reflow the text across the document."
> **Dev:** "Does **Auto-fit** run after **Pagination**?"
> **Domain expert:** "No, **Auto-fit** only cares about the physical width of the device and the **Preview Scale**; the content of the **Line Data** doesn't change the scale."

## Flagged ambiguities

- "Zoom" was used in the UI and by users to mean **Preview Scale**. While "Zoom" is a good UI label, we use **Preview Scale** in the domain logic to distinguish the internal multiplier from the visual behavior.
- "Saving" could mean **Exporting** (to PDF) or persisting the **Editor State** (to local storage). We should use **Exporting** for final output and "Persistence" for session saving.
