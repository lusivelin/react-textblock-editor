# `@rave/rich-text-editor`

Standalone React rich text editor package with a hostable frontend documentation site and live playground.

## Product contract

- The editor stores a single HTML string.
- The renderer consumes that saved HTML string.
- The docs site doubles as package documentation and the manual test surface.
- New saved markup must remain compatible with the sanitization layer.

## Repository layout

- `src/`: publishable library source
- `src/demo/`: frontend docs website and playground
- `src/components/`: editor shell, field wrapper, renderer
- `src/hooks/`: draft buffering, session, selection, copy/paste, and editor behavior hooks
- `src/utils/`: sanitization and DOM helpers
- `docs/`: local markdown documentation for overview, hosting, publishing, and roadmap notes
- `scripts/build-css.mjs`: distributable stylesheet build step

## Frontend integration

Most consumers should mount `RichTextEditorField` and save the HTML string returned by `onSave`.

```tsx
import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

const [savedHtml, setSavedHtml] = useState("<p>Hello</p>");

<RichTextEditorField
  value={savedHtml}
  onSave={async (nextHtml) => {
    await saveDocument({ body: nextHtml });
    setSavedHtml(nextHtml);
  }}
  documentId="article:home"
  persistLocalDrafts
/>;

<RichTextRenderer content={savedHtml} />;
```

Frontend seams already exposed by the package:

- `onLocalChange`: observe draft edits before save
- `onSessionStateChange`: inspect session metadata such as unsaved state or persistence key
- `featureFlags`: declare enabled seams for offline, comments, tracked changes, collaboration, and AI
- `editorMode` plus `documentModelAdapter`: mount a structured-editor prototype without replacing the current HTML storage contract

## Local development

```bash
pnpm install
pnpm dev
```

Open the Vite app to use the docs site and playground together.

## Verification

Run these before shipping meaningful editor changes:

```bash
pnpm typecheck
pnpm build:lib
pnpm build:docs
```

## Build outputs

`pnpm build:lib` writes:

- `dist/index.js`
- `dist/index.cjs`
- `dist/style.css`
- `dist/types/*`

`pnpm build:docs` writes the static docs site to `site-dist/`.

## Hosting the docs site

The frontend docs site is a static Vite build. Use:

- Build command: `pnpm build:docs`
- Output directory: `site-dist`

This works on Vercel, Netlify, and Cloudflare Pages.

## Publish flow

1. Update the version in `package.json`.
2. Run `pnpm typecheck`.
3. Run `pnpm build:lib`.
4. Publish from the repo root with `pnpm publish` or `npm publish`.
