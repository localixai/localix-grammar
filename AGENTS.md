# AGENTS.md

Instructions for AI coding agents working on this repository.

Localix Grammar is a Chrome Manifest V3 extension that proofreads text in web editors through
OpenRouter. One request per check: the model returns the corrected text, and the extension derives
the suggestions by comparing it with the original. A change is done when it works in the production
bundle loaded by Chrome, not only in a DOM test.

## Layout

- `src/background/`: the service worker. It owns the API key, the OpenRouter SDK calls, the prompt
  (`grammar-service.ts`), the diff that turns corrected text into suggestions (`text-diff.ts`),
  message validation and caching.
- `src/content/`: one overlay per frame. `writing-session.ts` owns the lifecycle, `input-detector.ts`
  decides which fields are eligible, `apply.ts` changes plain and rich text, `overlay.ts` is the UI.
- `src/popup/`: settings, the model list and the paste-in checker.
- `src/shared/`: message and storage contracts, and utilities both sides use.
- `tests/e2e/`: Playwright against the built extension, OpenRouter mocked.
- `scripts/`: bundle validation, packaging, screenshot capture.

## Rules

1. The exactly pinned `@openrouter/sdk` owns transport, OAuth, the model catalog and response
   parsing. No raw duplicate HTTP client. When the pin changes, change it in `package.json` and
   `scripts/validate-dist.mjs` together.
2. The API key stays in `chrome.storage.local`, read only by the service worker. Content scripts
   receive sanitized settings.
3. Model output is untrusted. The model returns text only; offsets come from `text-diff.ts`, and
   every change is checked against the original string before it reaches the DOM.
4. Page DOM is user data. Apply corrections with native setters or DOM `Range`, never `innerHTML`.
5. Password, one-time-code, payment, identity, read-only and opted-out fields stay excluded.
6. No remote executable code: JavaScript, CSS and fonts ship in the package.
7. Permissions do not grow without a documented reason in `docs/permissions-and-privacy.md`.

## Checks

```bash
npm run check        # format, lint, types, unit tests, build, bundle checks
npm run test:e2e     # needs: npx playwright install chromium
npm run verify       # both, with coverage and an audit: run before a commit
npm run screenshots  # after a change to the popup or the overlay; commit the images
```

A prompt change is measured on live models before it lands, old against new on the same texts,
and the numbers go in the commit message. Do not lower coverage thresholds to land a change.

## Style

TypeScript, strict. Prettier formats; ESLint has no warnings. A comment says why, not what. Tests sit
beside the code as `*.test.ts`. Documentation is plain English: short sentences, no marketing.
