# Text2Ink

Text2Ink is a Next.js app for turning typed text into realistic handwritten pages. It renders the document in a canvas-backed editor, supports multiple handwriting fonts and paper styles, and exports the generated pages as PDF, PNG, or JPG files.

The public site is statically exported and served by Firebase Hosting. The contact form is handled by a Firebase Cloud Function at `/api/inquiry`.

## Features

- Responsive editor at `/editor` with desktop controls and a mobile bottom sheet.
- Built-in handwriting fonts, plus custom `.ttf` and `.otf` uploads.
- Paper presets for Letter, A4, and A3 in portrait or landscape.
- Blank, lined, ruled, grid, dot-grid, and Cornell paper styles.
- Per-page margins, font size, ink color, paper color, text position, background images, and line calibration.
- Randomized spacing, baseline, and rotation controls for a less mechanical handwriting effect.
- Browser persistence for the current editor state.
- High-resolution export to PDF, PNG, and JPG.
- Contact form with shared validation, spam checks, rate limiting, and SMTP email delivery.

## Tech Stack

- Next.js 16, React 19, TypeScript
- Tailwind CSS 4
- Radix UI primitives and lucide-react icons
- Vitest and Testing Library
- Firebase Hosting, Firebase Analytics, Firestore, and Cloud Functions
- jsPDF for PDF export

## Repository Layout

```text
src/app/                       Next.js app routes
src/components/                React UI and editor components
src/lib/layout/                Pagination and page layout engine
src/lib/renderer/              Canvas page rendering
src/lib/export/                PDF, PNG, and JPG export engine
src/lib/paper/                 Paper presets and paper selection logic
src/workers/                   Browser workers for pagination and PDF export
functions/                     Firebase Cloud Functions source
packages/inquiry-validation/   Shared contact form validation package
public/                        Images, fonts, manifest, and generated paper presets
scripts/                       Maintenance scripts
```

## Prerequisites

- Node.js 20 is recommended, and is required for the Firebase Functions package.
- npm
- Firebase CLI, if you need to run emulators or deploy.

## Getting Started

Install the web app dependencies:

```bash
npm install
```

Install the Firebase Functions dependencies when working on the inquiry endpoint:

```bash
npm --prefix functions install
```

Start the Next.js development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Local Inquiry API

In development, `next.config.ts` rewrites `/api/inquiry` to a Cloud Function. By default it points to the local emulator URL:

```text
http://127.0.0.1:5001/text2ink/us-central1/inquiry
```

Run the function emulator in another terminal:

```bash
npm --prefix functions run serve
```

To point the app at a different function URL, set `API_URL` before running `npm run dev`.

## Environment Variables

Client-side Firebase Analytics uses these public variables:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

The inquiry Cloud Function uses:

```text
EMAIL_USER=                  # SMTP sender account
EMAIL_PASS=                  # SMTP password or app password
ALLOWED_ORIGINS=             # comma-separated origins allowed to submit inquiries
INQUIRY_HMAC_SECRET=         # secret used when hashing rate-limit keys
```

For local development, the function falls back to a development HMAC secret if `INQUIRY_HMAC_SECRET` is not set. Set a real secret in deployed environments.

## Scripts

```bash
npm run dev                     # start Next.js in development mode
npm run build                   # build and static-export the site to out/
npm run start                   # serve a production Next build
npm run lint                    # run ESLint
npm run type-check              # run TypeScript without emitting files
npm run test                    # run the Vitest suite
npm run test:watch              # run Vitest in watch mode
npm run test:coverage           # run Vitest with coverage
npm run generate:paper-presets  # regenerate public paper preset SVGs
npm run deploy                  # build and deploy to Firebase
npm run deploy:preview          # build and deploy to a Firebase preview channel
```

Functions package scripts:

```bash
npm --prefix functions run build
npm --prefix functions run serve
npm --prefix functions run deploy
npm --prefix functions run test
```

## Testing and Quality Checks

Before shipping code changes, run:

```bash
npm run build
npm run lint
npm run type-check
npm run test
```

The root test suite covers editor persistence, layout and pagination, canvas rendering, export behavior, paper presets, UI components, app routes, and shared validation. The `functions` package has its own Vitest tests for inquiry validation, rate limiting, spam checks, email delivery, and request handling.

## Deployment

Production hosting is configured in `firebase.json`:

- Next.js exports the static site to `out/`.
- Firebase Hosting serves `out/`.
- `/api/inquiry` is rewritten to the `inquiry` Cloud Function.
- Function predeploy runs `npm --prefix functions run build`.

Deploy the site and function together:

```bash
npm run deploy
```

Deploy to a preview channel:

```bash
npm run deploy:preview
```

## Notes

- The production Next build uses `output: "export"`, while development leaves static export disabled so rewrites can proxy `/api/inquiry`.
- Images are configured as unoptimized because the exported site is served statically.
- Paper preset SVGs live under `public/paper-presets/` and can be regenerated with `npm run generate:paper-presets`.
