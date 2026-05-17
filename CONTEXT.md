# Text2Ink Editor

Text2Ink lets users turn typed text into handwritten-looking pages. This context defines the product terms that matter when changing the editor experience without confusing the UI around the page with the page itself.

## Language

**Editor Chrome**:
All interface outside the handwritten output surface, including headers, panels, dialogs, sheets, and controls.
_Avoid_: site, app shell, sidebar UI

**Handwritten Page**:
The paper-like output surface that previews and exports the user's handwritten content.
_Avoid_: canvas UI, dark-mode surface, site background

**Theme Preference**:
The user's saved light, dark, or system choice for the **Editor Chrome** across the site.
_Avoid_: editor state, paper setting, canvas mode

**Theme Picker**:
A compact header control that lets the user set the **Theme Preference** from any page.
_Avoid_: settings-only switch, page-local toggle, binary theme switch

**Design Tokens**:
Named semantic values used to style the **Editor Chrome** consistently across light, dark, and system themes.
_Avoid_: raw hex values, direct palette literals, one-off theme colors

## Relationships

- The **Editor Chrome** surrounds and controls the **Handwritten Page**
- Visual theming of the **Editor Chrome** does not require changing the **Handwritten Page**
- The **Theme Preference** changes the **Editor Chrome** without changing the **Handwritten Page**
- On first visit, the **Theme Preference** follows the system color scheme until the user makes an explicit choice
- The **Theme Picker** lives in the global header so the **Theme Preference** can be changed from any page
- When the **Theme Preference** is system, the **Editor Chrome** follows the operating system color scheme
- The current **Theme Preference** is reflected on first paint without a visible theme flash
- On mobile, the **Theme Picker** stays within a single-row header so it does not reduce editor workspace
- **Design Tokens** define the visual styling of the **Editor Chrome** for each **Theme Preference**
- Theme-sensitive visual values in the **Editor Chrome** come from **Design Tokens**
- Layout values such as spacing, heights, and breakpoints are not part of **Design Tokens** for this change
- Document-color swatches inside the **Editor Chrome** display **Handwritten Page** data rather than theme token values
- On mobile, secondary header actions stay compact so the **Theme Picker** can fit without wrapping

## Example dialogue

> **Dev:** "When we add dark mode to Text2Ink, should the **Handwritten Page** become dark too?"
> **Domain expert:** "No. Dark mode changes the **Editor Chrome** only; the **Handwritten Page** keeps its own paper settings."
>
> **Dev:** "If a user switches to dark, does that belong to the editor document?"
> **Domain expert:** "No. That's a **Theme Preference** for the site chrome, not for the **Handwritten Page**."
>
> **Dev:** "Should the theme switch live inside editor settings?"
> **Domain expert:** "No. The **Theme Picker** belongs in the header on every route."
>
> **Dev:** "What does system mean in the theme control?"
> **Domain expert:** "System means the **Editor Chrome** follows the operating system color scheme until the user picks light or dark."
>
> **Dev:** "Can the mobile header wrap to fit the theme control?"
> **Domain expert:** "No. The **Theme Picker** stays single-row on mobile to preserve editor space."
>
> **Dev:** "Should component colors be written directly in classes?"
> **Domain expert:** "No. **Design Tokens** should define theme visuals for the **Editor Chrome**."
>
> **Dev:** "Do spacing and breakpoint values also need to move into tokens now?"
> **Domain expert:** "No. For this change, **Design Tokens** cover theme-sensitive chrome visuals, not layout values."
>
> **Dev:** "Should color swatches in settings switch to theme token colors in dark mode?"
> **Domain expert:** "No. The chrome around them uses **Design Tokens**, but the swatch fills still show **Handwritten Page** colors."
>
> **Dev:** "Can we keep full-size header actions on mobile once the theme picker is added?"
> **Domain expert:** "No. Secondary header actions should stay compact so the header remains single-row."
>
> **Dev:** "Should the site briefly render in the wrong theme before the app hydrates?"
> **Domain expert:** "No. The active **Theme Preference** should be visible on first paint."

## Flagged ambiguities

- "entire site" was used to include the **Editor Chrome** but exclude the **Handwritten Page** — resolved: dark mode applies to **Editor Chrome**, not to the **Handwritten Page**
- "default theme" was ambiguous between saved choice and system choice — resolved: first visit uses system color scheme, later visits use the saved **Theme Preference**
- "toggle" was ambiguous between a binary switch and a multi-mode control — resolved: the header control sets a three-state **Theme Preference** of light, dark, or system
- "no hardcoded values" was too broad — resolved: all theme-sensitive visual values in the **Editor Chrome** come from **Design Tokens**; layout values stay component-local for now
