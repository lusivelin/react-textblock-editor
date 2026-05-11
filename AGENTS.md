# Rave Rich Text Editor Agent Guide

## Scope

This repository is the standalone home for the custom rich text editor.

Primary areas:

- `src/components/*`: editor shell, field wrapper, renderer
- `src/hooks/*`: editor behavior and renderer cleanup hooks
- `src/utils/*`: sanitization and DOM helpers
- `src/demo/*`: sidebar-based docs website and live playground
- `vite.lib.config.ts`: package build configuration
- `scripts/build-css.mjs`: distributable CSS build step

## Product contract

- The editor stores a single HTML string.
- The renderer consumes that saved HTML string.
- The docs website is both the documentation surface and the manual test surface for package development.
- Library code should remain framework-light and avoid app-specific dependencies.

## Working rules

- Keep Sanity-specific code out of this repo.
- Prefer changes through existing hooks before enlarging `rich-text-editor.tsx`.
- Preserve caret stability and avoid unnecessary `innerHTML` resets.
- Keep the docs website clear and hostable; it should explain install, usage, hosting, and expose a live editor playground.
- Any new saved markup must be validated against sanitization rules.

## Verification

Run these before finishing meaningful editor changes:

```bash
pnpm typecheck
pnpm build:lib
pnpm build:docs
```

If you add tests later, document the test command here.
