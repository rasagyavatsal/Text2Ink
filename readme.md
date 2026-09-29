# Text2Ink

Text2Ink is a browser-based handwriting editor. The only application page is `/`. It supports handwriting and paper controls, local draft persistence, and PDF, PNG, and JPG export.

## Run locally

```sh
npm install
npm run dev
```

Open `http://localhost:3000/`.

## Build and test

```sh
npm run type-check
npm run lint
npm test
npm run build
```

The production build is a static export in `out/`. Deploy it to a static host that serves the root route. The previous Firebase project and inquiry Cloud Function are no longer part of this codebase.
