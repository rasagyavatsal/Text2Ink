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
A compact top-level control that lets the user set the **Theme Preference** from any page.
_Avoid_: settings-only switch, page-local toggle, binary theme switch

**Page-Level Top Controls**:
Fixed standalone controls anchored near the top edge of a page for navigation and editor actions.
_Avoid_: global header, toolbar row, sidebar actions

**Persistent Settings Panel**:
A fixed-width editor settings surface that remains visible on desktop while the **Handwritten Page** is in use.
_Avoid_: collapsible sidebar, temporary drawer, export tab

**Controls Sheet**:
A mobile bottom sheet that exposes editor settings without permanently shrinking the **Handwritten Page**.
_Avoid_: mobile sidebar, export sheet, always-open mobile panel

**Export Modal**:
A centered dialog that contains export settings and export progress for the current handwritten document.
_Avoid_: export sidebar, export tab, bottom sheet export panel

**Inquiry Form**:
A contact form that collects a user message and a required inquiry topic for follow-up outside the editor.
_Avoid_: feedback modal, star rating, mailto-only contact page

**Inquiry Split Layout**:
A contact-page layout that pairs fallback contact details with the inquiry form in separate side-by-side sections.
_Avoid_: single-column desktop slab, centered mailto-only card, decorative filler blocks

**Inquiry Rate Limit**:
A server-side abuse-control rule that counts inquiry submissions by HMAC-hashed client identifiers within a time window.
_Avoid_: raw IP storage, plain email storage, client-only throttling

**Component Library**:
A centralized set of reusable individual UI elements with defined code usage and supported states.
_Avoid_: page sections, full interaction flows, one-off controls

**Pattern Library**:
Reusable multi-component UX solutions that serve more than one real surface and preserve the same interaction structure across those surfaces.
_Avoid_: single primitive controls, speculative shells, page-specific wrappers, one-off page markup

**Page-Local Layout**:
A route-specific or feature-specific layout that can reuse shared components and **Design Tokens** without becoming a **Pattern Library** abstraction.
_Avoid_: speculative shell abstraction, false shared layout, token-less one-off structure

**Landing Page**:
A marketing surface at `/` that introduces Text2Ink to first-time visitors with a hero section and handwriting preview images.
_Avoid_: editor homepage, direct editor access, feature documentation

**Editor Route**:
The `/editor` path where the handwriting editor application lives after the route restructuring.
_Avoid_: root route, landing page, marketing surface

**Legal Pages**:
The Terms of Service and Privacy Policy pages linked from the site footer.
_Avoid_: hidden compliance copy, missing footer navigation, contact-only legal fallback

**Design Tokens**:
Named semantic values used to style layout and visuals consistently across the product.
_Avoid_: raw hex values, one-off spacing, direct palette literals, hardcoded component dimensions

## Relationships

- The **Editor Chrome** surrounds and controls the **Handwritten Page**
- Visual theming of the **Editor Chrome** does not require changing the **Handwritten Page**
- The **Theme Preference** changes the **Editor Chrome** without changing the **Handwritten Page**
- On first visit, the **Theme Preference** follows the system color scheme until the user makes an explicit choice
- The **Theme Picker** stays in the **Page-Level Top Controls** of each page so the **Theme Preference** can be changed from any page
- When the **Theme Preference** is system, the **Editor Chrome** follows the operating system color scheme
- The current **Theme Preference** is reflected on first paint without a visible theme flash
- Shared controls within one header use the same semantic **Design Tokens** for size unless a difference is intentional
- On the editor page, the **Page-Level Top Controls** are fixed instead of using a full-width header
- The editor page uses a **Page-Local Layout** tailored to the handwriting workflow rather than a shared shell abstraction
- The contact page keeps its standard in-flow header instead of switching to fixed **Page-Level Top Controls**
- The contact page uses a **Page-Local Layout** rather than the editor's task-focused layout
- The **Landing Page** uses its own **Page-Local Layout** instead of inheriting a shared standard shell
- The **Landing Page** and the contact page may share header and footer components and **Design Tokens** without sharing one page-shell abstraction
- The **Landing Page** lives at `/` and the editor lives at the **Editor Route** (`/editor`)
- The **Landing Page** header CTA links to the **Editor Route** instead of showing "Back to Editor"
- The contact page header "Back to Editor" link points to the **Editor Route** instead of `/`
- The site footer includes links to the **Legal Pages**
- On desktop, the editor uses a **Persistent Settings Panel** instead of a collapsible sidebar
- On desktop, the editor's home link lives at the top of the **Persistent Settings Panel** instead of the **Page-Level Top Controls**
- Export on the editor page happens through the **Export Modal** instead of a sidebar tab
- The contact page uses the **Inquiry Form** instead of a feedback flow or mailto-only contact pattern
- The **Inquiry Form** requires a topic so incoming messages are categorized before follow-up
- The **Inquiry Form** requires name, email, topic, and message so each inquiry can be answered directly
- After a successful inquiry submission, the contact page replaces the **Inquiry Form** with an inline success state
- The inline success state includes a `Send another inquiry` action so the contact flow can restart without leaving the page
- The inline success state uses generic confirmation copy instead of echoing submitted details
- The contact page keeps a direct email fallback below the **Inquiry Form**, using `rasagyavatsal16@gmail.com`
- On desktop, the contact page uses an **Inquiry Split Layout** with fallback email content on the left and the **Inquiry Form** on the right
- On mobile, the contact page shows "Email me" content first, then the **Inquiry Form**, then the fallback email address
- The **Pattern Library** contains only reusable multi-component solutions with real cross-surface reuse
- Route-specific page layouts stay local even when they share gutters, widths, or spacing scales
- The **Pattern Library** is not a bucket for page-specific wrappers or speculative shells
- The **Inquiry Rate Limit** tracks inquiry submissions by HMAC-hashed IP and HMAC-hashed normalized email
- The inquiry endpoint accepts requests only from allowed origins for production, preview, and local development
- The inquiry endpoint silently drops honeypot submissions while returning a success-shaped response
- Accepted inquiries send only an internal email, using the submitted email address as the reply-to address
- Rejected inquiry submissions show inline errors and preserve the entered values instead of using browser alerts
- Rate-limited inquiry submissions use the copy "Too many inquiries. Please try again later."
- While export is running, the **Export Modal** stays open until export finishes or the user cancels it
- On mobile, settings live in the **Controls Sheet** instead of a persistent panel
- On mobile, the **Controls Sheet** is settings-only and does not contain export controls
- On mobile, the **Controls Sheet** starts in its minimized state on first load
- On mobile, the editor's home link stays in the **Page-Level Top Controls** so navigation remains visible while the **Controls Sheet** is minimized
- On mobile, the **Page-Level Top Controls** stay visible while the **Controls Sheet** is minimized and hide once the sheet is opened
- **Design Tokens** define both layout and visual styling across the entire codebase
- The codebase uses a two-layer **Design Tokens** system with primitive tokens and semantic tokens
- Primitive **Design Tokens** use reusable scale-based names, and semantic **Design Tokens** use intent-based names mapped on top of them
- Semantic **Design Tokens** default to shared purpose-based names instead of page-specific or shell-specific names
- Tailwind utilities are the primary way shared components and pages consume **Design Tokens**
- Raw CSS custom properties are reserved for edge cases such as dynamic measurements and layout calculations that Tailwind cannot express cleanly
- Shared gutters, widths, spacing scales, and same-role control sizing come from **Design Tokens** rather than speculative shell abstractions
- Theme-sensitive visual values in the **Editor Chrome** come from **Design Tokens**
- Shared layout values such as spacing, radii, panel widths, breakpoints, and related component dimensions also come from **Design Tokens**
- Shared components, the **Pattern Library**, layout patterns, and page surfaces across the codebase derive both layout and theme-sensitive styling from **Design Tokens**
- The site-wide token migration updates shared primitives, the **Component Library**, and any genuine **Pattern Library** components before migrating page surfaces
- The **Component Library** and the **Pattern Library** stay as separate layers rather than collapsing into one shared bucket
- Document-color swatches inside the **Editor Chrome** display **Handwritten Page** data rather than theme token values
- On mobile, secondary top-level actions stay compact so the **Theme Picker** can fit without wrapping

## Example dialogue

> **Dev:** "When we add dark mode to Text2Ink, should the **Handwritten Page** become dark too?"
> **Domain expert:** "No. Dark mode changes the **Editor Chrome** only; the **Handwritten Page** keeps its own paper settings."
>
> **Dev:** "If a user switches to dark, does that belong to the editor document?"
> **Domain expert:** "No. That's a **Theme Preference** for the site chrome, not for the **Handwritten Page**."
>
> **Dev:** "Should the theme switch live inside editor settings?"
> **Domain expert:** "No. The **Theme Picker** belongs in the **Page-Level Top Controls** on every route."
>
> **Dev:** "What does system mean in the theme control?"
> **Domain expert:** "System means the **Editor Chrome** follows the operating system color scheme until the user picks light or dark."
>
> **Dev:** "Should the editor keep a full-width header on mobile?"
> **Domain expert:** "No. The editor uses fixed **Page-Level Top Controls**, and they hide while the sheet is open to preserve page space."
>
> **Dev:** "Should export stay in the sidebar on desktop?"
> **Domain expert:** "No. Desktop keeps a **Persistent Settings Panel**, and export moves into the centered **Export Modal**."
>
> **Dev:** "Should the fixed page controls hide as soon as the mobile sheet appears?"
> **Domain expert:** "No. They stay visible while the sheet is minimized and hide only once the sheet is opened."
>
> **Dev:** "Should mobile still have an export tab in the bottom sheet?"
> **Domain expert:** "No. Mobile settings stay in the **Controls Sheet**, and export is triggered only from the fixed **Export Modal** button."
>
> **Dev:** "Should the mobile sheet start open when the editor first loads?"
> **Domain expert:** "No. The **Controls Sheet** starts minimized so the **Page-Level Top Controls** remain available on entry."
>
> **Dev:** "Where should the editor home link live in the page layout?"
> **Domain expert:** "On desktop it lives at the top of the **Persistent Settings Panel**, but on mobile it stays in the **Page-Level Top Controls** so navigation stays visible while the sheet is minimized."
>
> **Dev:** "Can the **Export Modal** be dismissed while export is running?"
> **Domain expert:** "No. It stays open until export finishes or the user explicitly cancels export."
>
> **Dev:** "Should the contact page still collect star ratings after export?"
> **Domain expert:** "No. Ratings and feedback are removed, and the contact page uses a single **Inquiry Form** with a required topic."
>
> **Dev:** "What information must every inquiry include?"
> **Domain expert:** "Each **Inquiry Form** submission must include name, email, topic, and message so follow-up is possible."
>
> **Dev:** "What should happen after a successful inquiry submission?"
> **Domain expert:** "Keep the user on the contact page and replace the **Inquiry Form** with an inline success state."
>
> **Dev:** "Should the inquiry rate limiter store raw IP addresses or emails?"
> **Domain expert:** "No. The **Inquiry Rate Limit** uses HMAC-hashed client identifiers so abuse can be controlled without storing raw IPs or plain emails."
>
> **Dev:** "Should the inquiry endpoint accept requests from any origin?"
> **Domain expert:** "No. It accepts requests only from allowed production, preview, and local development origins."
>
> **Dev:** "What should happen when the honeypot field is filled?"
> **Domain expert:** "Treat it as spam, drop it silently, and still return a success-shaped response."
>
> **Dev:** "Should accepted inquiries send an auto-reply to the user?"
> **Domain expert:** "No. Send only the internal email for now, and use the submitted address as reply-to."
>
> **Dev:** "How should the contact page handle inquiry failures?"
> **Domain expert:** "Show inline errors, keep the entered values, use specific copy for rate limits, and do not use browser alerts."
>
> **Dev:** "Should the contact page still expose a direct email address?"
> **Domain expert:** "Yes. Keep the **Inquiry Form** primary and show `rasagyavatsal16@gmail.com` as a secondary fallback below it."
>
> **Dev:** "Should the success state trap the user after one inquiry?"
> **Domain expert:** "No. The inline success state should include a `Send another inquiry` action."
>
> **Dev:** "Should the inquiry success state repeat the submitted topic or email?"
> **Domain expert:** "No. Keep the confirmation generic and concise."
>
> **Dev:** "How should the contact page balance form and fallback contact details on desktop?"
> **Domain expert:** "Use an **Inquiry Split Layout** with the fallback email content on the left and the **Inquiry Form** on the right."
>
> **Dev:** "What is the contact-page content order on mobile?"
> **Domain expert:** "Show the 'Email me' copy first, then the **Inquiry Form**, then the fallback email address."
>
> **Dev:** "Do layout values still stay component-local for this change?"
> **Domain expert:** "No. **Design Tokens** now cover shared layout values as well as theme-sensitive visual values."
>
> **Dev:** "Does this token change apply only to the editor and contact page?"
> **Domain expert:** "No. The token refactor is site-wide and applies across the entire codebase."
>
> **Dev:** "Should the token system stay flat or use layers?"
> **Domain expert:** "Use two layers: primitive tokens for base scales and semantic tokens for component and layout intent."
>
> **Dev:** "How should those two token layers be named?"
> **Domain expert:** "Primitive tokens use scale-based names like `--space-*` and `--radius-*`, while semantic tokens use intent-based names like `--layout-*`, `--surface-*`, and `--control-*`."
>
> **Dev:** "Should semantic tokens be page-specific by default?"
> **Domain expert:** "No. Semantic tokens should default to shared purpose-based names and only become page-specific when reuse clearly breaks down."
>
> **Dev:** "Should components consume tokens directly in CSS by default?"
> **Domain expert:** "No. Tailwind remains the primary consumption layer, and raw CSS variables are reserved for edge cases like dynamic measurements."
>
> **Dev:** "What sits between low-level UI primitives and page-specific layouts?"
> **Domain expert:** "A **Pattern Library** of shared composed solutions built from a separate **Component Library** should be tokenized before page surfaces."
>
> **Dev:** "Should the component and pattern layers be treated as one library?"
> **Domain expert:** "No. The **Component Library** and the **Pattern Library** stay separate so reusable elements do not get mixed with multi-component solutions."
>
> **Dev:** "Can the **Pattern Library** include page-shell structures too?"
> **Domain expert:** "Only when the same multi-component structure is demonstrably reused across more than one real surface. Page-local layouts and speculative shells stay out."
>
> **Dev:** "Do we wait for literal duplication before promoting a pattern?"
> **Domain expert:** "No. But there should be real recurring UX structure or a concrete second consumer, not just similar gutters or spacing."
>
> **Dev:** "Should the site force one universal page shell?"
> **Domain expert:** "No. Page-specific layouts can stay local; shared headers, footers, components, and **Design Tokens** are enough when the layouts are otherwise different."
>
> **Dev:** "Should the contact page also switch to fixed top controls like the editor?"
> **Domain expert:** "No. The contact page keeps its standard header; the fixed top-controls treatment is specific to the editor workspace."
>
> **Dev:** "Should component colors be written directly in classes?"
> **Domain expert:** "No. **Design Tokens** should define theme visuals for the **Editor Chrome**."
>
> **Dev:** "Do spacing and breakpoint values also need to move into tokens now?"
> **Domain expert:** "Yes. Shared spacing, breakpoints, and related layout values should move into **Design Tokens** for this change."
>
> **Dev:** "Should color swatches in settings switch to theme token colors in dark mode?"
> **Domain expert:** "No. The chrome around them uses **Design Tokens**, but the swatch fills still show **Handwritten Page** colors."
>
> **Dev:** "Can we keep full-size top controls on mobile once the theme picker is added?"
> **Domain expert:** "No. Secondary top-level actions should stay compact so the controls fit without stealing workspace."
>
> **Dev:** "Should the site briefly render in the wrong theme before the app hydrates?"
> **Domain expert:** "No. The active **Theme Preference** should be visible on first paint."
>
> **Dev:** "Should the theme picker use a different control size than neighboring header actions?"
> **Domain expert:** "No. Same-role header controls should share semantic size tokens unless a difference is intentional."
>
> **Dev:** "Should the **Landing Page** and contact page share one standard shell?"
> **Domain expert:** "No shared shell is required. They can share header and footer components and **Design Tokens** while keeping different page-local layouts."
>
> **Dev:** "Should the **Landing Page** header say 'Back to Editor' like the contact page?"
> **Domain expert:** "No. The **Landing Page** header CTA says 'Open Editor' and links to the **Editor Route**, since visitors haven't been to the editor yet."
>
> **Dev:** "Should the editor stay at `/` after the **Landing Page** is added?"
> **Domain expert:** "No. The editor moves to the **Editor Route** (`/editor`), and the **Landing Page** takes `/`."
>
> **Dev:** "Should the contact page 'Back to Editor' link still point to `/`?"
> **Domain expert:** "No. It should point to the **Editor Route** (`/editor`) since the editor no longer lives at `/`."
>
> **Dev:** "Should the site footer include legal navigation?"
> **Domain expert:** "Yes. It should link to the **Legal Pages**."

## Flagged ambiguities

- "entire site" was used to include the **Editor Chrome** but exclude the **Handwritten Page** — resolved: dark mode applies to **Editor Chrome**, not to the **Handwritten Page**
- "default theme" was ambiguous between saved choice and system choice — resolved: first visit uses system color scheme, later visits use the saved **Theme Preference**
- "toggle" was ambiguous between a binary switch and a multi-mode control — resolved: the **Theme Picker** sets a three-state **Theme Preference** of light, dark, or system
- "sidebar" was used for both settings and export — resolved: desktop uses a **Persistent Settings Panel** for settings, and export lives in the **Export Modal**
- "bottom sheet is opened" was ambiguous — resolved: mobile top controls stay visible in the minimized state and hide only in the opened states
- "mobile controls" was used for both settings and export — resolved: mobile settings live in the **Controls Sheet**, while export lives only in the **Export Modal**
- "mobile default state" was ambiguous — resolved: the **Controls Sheet** starts minimized on first load
- "export modal dismissal" was ambiguous — resolved: the **Export Modal** stays open while export is running and closes only after completion or cancellation
- "feedback" was used for both post-export ratings and contact messages — resolved: feedback is removed, and the contact page uses an **Inquiry Form**
- "contact form" was underspecified — resolved: the **Inquiry Form** requires name, email, topic, and message
- "contact form success" was ambiguous — resolved: successful inquiry submission shows an inline success state on the contact page
- "stored identifiers" was ambiguous — resolved: the **Inquiry Rate Limit** stores HMAC-hashed identifiers instead of raw IPs or plain emails
- "allowed clients" was ambiguous — resolved: the inquiry endpoint accepts only production, preview, and local development origins
- "honeypot handling" was ambiguous — resolved: honeypot hits are silently dropped and receive a success-shaped response
- "inquiry email delivery" was ambiguous — resolved: accepted inquiries send only an internal email and use the submitted address as reply-to
- "inquiry failure UX" was ambiguous — resolved: failures stay inline, preserve values, and use specific copy for rate limits instead of alerts
- "contact fallback email" was ambiguous — resolved: the direct fallback address is `rasagyavatsal16@gmail.com`, not the previous Outlook address
- "post-success recovery" was ambiguous — resolved: the inline success state includes a `Send another inquiry` action
- "inquiry success detail level" was ambiguous — resolved: the success state stays generic and does not echo submitted details
- "contact page structure" was ambiguous — resolved: desktop uses an **Inquiry Split Layout** with fallback content left and form right
- "mobile contact order" was ambiguous — resolved: mobile shows the 'Email me' copy first, then the form, then the fallback email address
- "token refactor scope" was ambiguous — resolved: the **Design Tokens** expansion applies site-wide across the entire codebase
- "token architecture" was ambiguous — resolved: the codebase uses two layers of **Design Tokens**: primitive and semantic
- "token naming" was ambiguous — resolved: primitive tokens use scale-based names and semantic tokens use intent-based names
- "semantic token scope" was ambiguous — resolved: semantic tokens default to shared purpose-based names rather than page-specific or shell-specific names
- "token consumption path" was ambiguous — resolved: Tailwind is the primary token-consumption layer, with raw CSS variables reserved for edge cases
- "migration order" was ambiguous — resolved: shared primitives, the **Component Library**, and any genuine **Pattern Library** components migrate before page surfaces
- "component vs pattern libraries" was ambiguous — resolved: the **Component Library** holds reusable individual elements, while the **Pattern Library** holds multi-component UX solutions
- "library separation" was ambiguous — resolved: the **Component Library** and **Pattern Library** remain distinct layers rather than a single combined library
- "pattern-library scope" was ambiguous — resolved: the **Pattern Library** holds only multi-component UX solutions with real cross-surface reuse, while page-specific shells stay local
- "pattern promotion rule" was ambiguous — resolved: patterns are promoted only when recurring structure is real, not just because pages share gutters or spacing
- "page layout ownership" was ambiguous — resolved: the editor, landing page, and contact page keep page-local layouts unless real cross-surface reuse emerges
- "page shell scope" was ambiguous — resolved: the editor uses fixed top controls, while the contact page keeps its standard header
- "header control sizing" was ambiguous — resolved: same-role header controls share semantic size tokens unless a difference is intentional
- "no hardcoded values" was too broad — resolved: shared layout and theme-sensitive visual values come from **Design Tokens** rather than one-off component values
- "landing page route" was ambiguous between `/` and a separate path — resolved: the **Landing Page** takes `/` and the editor moves to the **Editor Route** (`/editor`)
- "landing page header CTA" was ambiguous — resolved: the **Landing Page** uses "Open Editor" instead of "Back to Editor" since visitors have not been to the editor yet
- "footer legal navigation" was ambiguous — resolved: the site footer links to the **Legal Pages**
