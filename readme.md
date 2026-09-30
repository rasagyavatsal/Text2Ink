# Text2Ink

Turn typed text into customizable handwriting-style pages and export them as PDF or images—all in your browser.

Text2Ink combines a live handwriting preview with controls for fonts, ink, paper, and page layout. Editing, draft storage, and document export run in the browser, with no backend or account required.

## Features

- **Customizable handwriting:** Choose from 30 built-in fonts or upload a TTF/OTF font. Adjust font size, ink color, line tilt, and variation in character spacing, vertical position, and rotation.
- **Paper and page controls:** Use blank, lined, ruled, grid, dot-grid, or Cornell paper in A4, A3, or Letter sizes, with portrait and landscape orientations.
- **Custom paper backgrounds:** Upload PNG or JPG images and detect notebook lines to help align text with the paper.
- **Automatic pagination:** Text wraps and flows across pages as content, fonts, and layout settings change.
- **Page customization:** Adjust margins and individual page settings, and add movable, resizable text boxes.
- **Local drafts:** Save text, settings, and editor state in browser storage and restore them on return.
- **Document export:** Download a multipage PDF or individual PNG/JPG pages, with export progress and cancellation controls.
- **Responsive interface:** Desktop controls and a mobile bottom sheet, with light, dark, and system themes.

## Engineering highlights

### Shared preview and export rendering

[PageRenderEngine](src/lib/renderer/PageRenderEngine.ts) and [UnifiedPagePainter](src/lib/renderer/UnifiedPagePainter.ts) share page geometry and drawing logic between the canvas preview and exported pages. Preview rendering accounts for the display's pixel density, while export uses its own rendering scale.

### Font-aware text layout

[LayoutEngine](src/lib/layout/LayoutEngine.ts) resolves writing bounds from paper geometry, margins, and line spacing. [Text wrapping](src/lib/layout/textWrap.ts) uses canvas font measurements, character spacing, and glyph overhang to determine line breaks. Seeded handwriting variation keeps character offsets repeatable between renders.

### PDF assembly in a Web Worker

[ExportEngine](src/lib/export/ExportEngine.ts) waits for fonts, paginates the document, and renders each page. It transfers page image buffers to a [Web Worker](src/workers/pdfWorker.ts), where jsPDF assembles the PDF off the main thread. The export flow also handles progress, cancellation, and worker cleanup.

### Notebook line detection

[Line detection](src/lib/lineDetection.ts) samples image brightness by row, finds and clusters dark peaks, and estimates line spacing. The editor uses those measurements to calibrate text placement on uploaded paper backgrounds.

### Versioned draft persistence

[Editor persistence](src/lib/editorPersistence.ts) stores a versioned document in `localStorage`, checks saved data when loading, and normalizes older paper settings into the current model.

## Tech stack

| Area | Technologies |
| --- | --- |
| Application | Next.js App Router, React, TypeScript |
| Interface | Tailwind CSS, Radix UI, Motion, Lucide icons |
| Rendering and layout | Canvas API, CSS Font Loading API |
| Export | jsPDF, Web Workers |
| Local storage | Browser `localStorage` |
| Testing | Vitest, React Testing Library, jsdom |
| Code checks | TypeScript, ESLint |

## Project structure

```text
src/
  app/          Application shell, editor route, and styles
  components/   Editor, canvas preview, settings, and export UI
  lib/
    layout/     Page geometry, text wrapping, and pagination
    paper/      Paper presets, backgrounds, and writing guides
    renderer/   Shared canvas rendering
    export/     Document export orchestration
  workers/      PDF assembly worker
  test/         Shared test setup and helpers
public/         Fonts, paper presets, and image assets
scripts/        Paper preset generation
```

Tests live alongside the features they exercise in `__tests__` directories.

## Run locally

With Node.js and npm installed, run:

```sh
npm install
npm run dev
```

Open [localhost:3000](http://localhost:3000/). No environment variables or backend services are needed.

## Build and test

The test suite covers font-aware wrapping and pagination, paper geometry, preview and export rendering, draft restoration, and editor interactions such as caret placement and text selection.

```sh
npm run type-check
npm run lint
npm test
npm run build
```

Use `npm run test:watch` during development or `npm run test:coverage` to generate a coverage report.

The production build generates a static site in `out/`. Deploy that directory to a static host that serves the editor at `/`.
