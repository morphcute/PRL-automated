# Firebase Free Hosting (Static-Only)

This project now supports a static export path that is safe for Firebase Hosting Spark (free tier).

## What this exports

The Firebase static build exports only static pages:

- `/`
- `/login` (UI only; sign-in disabled in static mode)
- `/privacy`
- `/terms`

Server/API pages are excluded during the static build and restored immediately after build.

## Build

```bash
pnpm run build:firebase
```

This creates the static output in `out/`.

## Deploy to Firebase Hosting

1. Install and login:

```bash
npm i -g firebase-tools
firebase login
```

2. Initialize hosting once (if not already initialized):

```bash
firebase init hosting
```

Use:
- `public` directory: `out`
- single-page app rewrite: `No`

3. Deploy:

```bash
firebase deploy --only hosting
```
