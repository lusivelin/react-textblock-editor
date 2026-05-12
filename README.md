# `@rave/rich-text-editor`

ProseMirror rich text editor for React. Stores and outputs sanitized HTML. Optional local-first persistence via Automerge + IndexedDB (localStorage fallback). SSR-safe.

## Install

```bash
pnpm add @rave/rich-text-editor
# or
npm install @rave/rich-text-editor
```

Import the stylesheet once at your app root:

```ts
import "@rave/rich-text-editor/style.css";
```

## Quick start

```ts
// app entry point — import once
import "@rave/rich-text-editor/style.css";
```

```tsx
import { useState } from "react";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

function Article() {
  const [html, setHtml] = useState("<p>Hello world</p>");

  return (
    <>
      <RichTextEditorField
        value={html}
        onSave={async (next) => {
          await api.save(next);
          setHtml(next);
        }}
        documentId="article:home"
      />

      {/* read-only display */}
      <RichTextRenderer content={html} />
    </>
  );
}
```

---

## Components

### `RichTextEditorField`

Full editing surface with draft buffering, save/discard flow, and optional local-first persistence.

```tsx
<RichTextEditorField
  value={html}
  onSave={async (html) => { ... }}
  documentId="article:home"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Saved HTML. Updated by your state after `onSave`. |
| `onSave` | `(html: string) => void \| Promise<void>` | — | Called when the user explicitly saves. Show a save button by providing this. |
| `onDiscard` | `(html: string) => void \| Promise<void>` | — | Called on discard. Shows a discard button when provided. |
| `onLocalChange` | `(html: string) => void` | — | Called on every keystroke. Use for autosave previews. |
| `onSessionStateChange` | `(state: DocumentSessionState) => void` | — | Fires when session metadata changes (unsaved state, draft, flags). |
| `onImageUpload` | `(file: File) => Promise<string>` | — | Handle image upload. Return the public URL. |
| `documentId` | `string` | `"default"` | Stable ID for this document. Scopes local-first storage. |
| `extensions` | `EditorExtension[]` | `[]` | Capability extensions (local-first, future AI, etc). |
| `autoSave` | `boolean \| { enabled?: boolean; debounceMs?: number }` | `false` | Auto-calls `onSave` after the debounce period (default 800 ms). |
| `persistence` | `PersistenceConfig` | `{ kind: 'none' }` | Legacy compat. Use `extensions` instead. |
| `featureFlags` | `EditorFeatureFlags` | — | Explicitly set `offline`, `comments`, `collaboration`, `ai`, `trackedChanges`. |
| `placeholder` | `string` | `"Start writing…"` | Placeholder shown in empty editor. |
| `height` | `number` | `400` | Min height of the editor in px. |
| `darkMode` | `boolean` | `false` | Activate dark theme (adds `.loom-pm-dark` class). |
| `readOnly` | `boolean` | `false` | Disable all editing. |
| `lazyMount` | `boolean` | `true` | Only mount the editor on first click (good default for page performance). |
| `emptyLabel` | `string` | `"Click to add content…"` | Label shown in lazy preview when content is empty. |
| `filledLabel` | `string` | `"Click to edit…"` | Label shown in lazy preview when content exists. |
| `theme` | `string` | — | CSS string injected at runtime. Use for per-component theming without a CSS file import. See [Styling & theming](#styling--theming). |
| `className` | `string` | — | Extra class on the editor root element. |
| `classNames` | `EditorClassNames` | — | Per-region class overrides: `root`, `toolbar`, `content`, `actionBar`. |

---

### `RichTextRenderer`

Read-only renderer. SSR-safe. Sanitizes content before rendering.

```tsx
<RichTextRenderer content={html} />
<RichTextRenderer content={html} className="prose" />
```

| Prop | Type | Description |
|------|------|-------------|
| `content` | `string` | HTML string from the editor. |
| `className` | `string` | Extra class on the wrapper `div`. |

---

## Styling & theming

### Stylesheet import

Import the stylesheet once at your app entry point. This includes the default light theme, all editor UI styles, and the renderer styles.

```ts
import "@rave/rich-text-editor/style.css";
```

That single line is all most projects need.

---

### Design tokens

Every visual property is a CSS custom property (`--loom-*`) defined on `.loom-pm`. Override any token on that class — or any parent — to customise the look without touching component code.

| Token | Default | Controls |
|---|---|---|
| `--loom-accent` | `#3b82f6` | Focus rings, active buttons, save button |
| `--loom-bg` | `#ffffff` | Editor background |
| `--loom-text` | `#111827` | Editor text colour |
| `--loom-border` | `#e2e8f0` | Outer border |
| `--loom-shadow` | `0 1px 3px …` | Outer drop-shadow |
| `--loom-radius` | `.375rem` | Corner radius (outer container) |
| `--loom-toolbar-bg` | `#f8fafc` | Toolbar background |
| `--loom-toolbar-border` | `#e2e8f0` | Toolbar bottom border |
| `--loom-btn-color` | `#64748b` | Toolbar button icon colour |
| `--loom-btn-hover-bg` | `#f1f5f9` | Button hover background |
| `--loom-btn-active-bg` | `#e2e8f0` | Button active/pressed background |
| `--loom-sep-color` | `#e2e8f0` | Toolbar separator colour |
| `--loom-popup-bg` | `#ffffff` | Dropdown / picker background |
| `--loom-popup-border` | `#e2e8f0` | Dropdown border |
| `--loom-popup-shadow` | `0 4px 6px …` | Dropdown shadow |
| `--loom-danger-color` | `#ef4444` | Destructive action icons |

**Example — brand accent + flat style:**

```css
/* your-app.css */
.loom-pm {
  --loom-accent: #7c3aed;
  --loom-radius: 0;
  --loom-shadow: none;
  --loom-toolbar-bg: #ffffff;
}
```

---

### Pre-built themes

Three themes are included. Each is a CSS file that redefines the `--loom-*` tokens.

#### Import a theme file (static, build-time)

```ts
import "@rave/rich-text-editor/style.css";         // core + default theme
import "@rave/rich-text-editor/themes/dark.css";    // override to dark
// or
import "@rave/rich-text-editor/themes/minimal.css"; // override to minimal
```

| Theme file | Description |
|---|---|
| *(included in `style.css`)* | Default light theme |
| `themes/dark.css` | Dark surface, muted borders, blue accent |
| `themes/minimal.css` | Flat, no shadows, reduced chrome |

#### Use the `theme` prop (runtime, per-component)

Import a theme string and pass it to the component. No CSS file import required — useful in Next.js App Router, component libraries, or anywhere you want per-instance theming.

```tsx
import { darkTheme, minimalTheme } from "@rave/rich-text-editor";

// dark editor
<RichTextEditorField theme={darkTheme} ... />

// minimal editor
<RichTextEditorField theme={minimalTheme} ... />
```

The `theme` prop is reference-counted: the style tag is shared across all instances using the same string and removed when the last instance unmounts.

#### The `darkMode` prop

A convenience shorthand that adds the `.loom-pm-dark` class, which activates the dark token set from `themes/dark.css` (already included in `style.css`).

```tsx
<RichTextEditorField darkMode={true} ... />
```

---

### Custom theme

#### Option 1 — CSS variables (quickest)

Override tokens directly in your stylesheet or in a `<style>` tag:

```css
.loom-pm {
  --loom-accent: #10b981;      /* emerald */
  --loom-radius: 0;             /* sharp corners */
  --loom-shadow: none;
  --loom-toolbar-bg: #f0fdf4;
}
```

#### Option 2 — Theme string (runtime)

Build a CSS string and pass it as the `theme` prop:

```ts
const emeraldTheme = `
  .loom-pm {
    --loom-accent: #10b981;
    --loom-toolbar-bg: #f0fdf4;
    --loom-btn-active-bg: #d1fae5;
  }
`;

<RichTextEditorField theme={emeraldTheme} ... />
```

#### Option 3 — Extend a preset

Compose on top of an existing theme string:

```ts
import { darkTheme } from "@rave/rich-text-editor";

const purpleDark = darkTheme + `
  .loom-pm { --loom-accent: #a855f7; }
`;

<RichTextEditorField theme={purpleDark} ... />
```

---

### Scoped overrides with `className`

For per-instance overrides without a new theme string, use the `className` prop and target it in CSS:

```tsx
<RichTextEditorField className="editor-compact" ... />
```

```css
.editor-compact.loom-pm {
  --loom-accent: #f59e0b;
  --loom-radius: .125rem;
}
.editor-compact .loom-toolbar {
  padding: .125rem .375rem;
}
```

For finer control, `classNames` lets you target sub-regions:

```tsx
<RichTextEditorField
  classNames={{
    root: "my-editor",
    toolbar: "my-editor-toolbar",
    content: "my-editor-content",
  }}
/>
```

---

### Renderer theming

`RichTextRenderer` uses a separate `.loom-renderer` class with its own token set. Override them the same way:

```css
.loom-renderer {
  --loom-r-text: #1a1a1a;
  --loom-r-link: #7c3aed;
  --loom-r-h1-size: 2rem;
  --loom-r-table-header-bg: #1e1b4b;
}
```

See `src/lib/styles/rich-text-renderer.css` for the full token list.

---

## Local-first persistence

Keeps a local copy of the document so edits survive page reload without a server round-trip. Uses Automerge for delta tracking on top of IndexedDB (falls back to localStorage when IndexedDB is unavailable).

```tsx
import {
  RichTextEditorField,
  createLocalFirstExtension,
} from "@rave/rich-text-editor";

<RichTextEditorField
  value={html}
  onSave={async (next) => { setSavedHtml(next); }}
  documentId="article:home"
  extensions={[
    createLocalFirstExtension({ documentId: "article:home" }),
  ]}
/>
```

`documentId` scopes the storage. Use the same ID on the field and the extension.

#### `createLocalFirstExtension(options)`

| Option | Type | Description |
|--------|------|-------------|
| `documentId` | `string` | Required. Storage key for this document. |
| `storageKey` | `string` | Optional. Override the session draft key. |

The extension automatically:
- sets the `offline` feature flag
- hydrates the editor from local storage on mount
- writes local edits back to storage on every change

Storage priority: **IndexedDB → localStorage**. Selection happens lazily on first browser-side use (SSR produces no-ops).

---

## Composing extensions

`composeExtensions(...)` accepts extensions or falsy values — useful for conditional capabilities.

```tsx
import {
  composeExtensions,
  createLocalFirstExtension,
} from "@rave/rich-text-editor";

const extensions = composeExtensions(
  enableLocalFirst && createLocalFirstExtension({ documentId: "article:home" }),
  enableAi      && createAiExtension({ documentId: "article:home" }), // future
);

<RichTextEditorField
  value={html}
  documentId="article:home"
  extensions={extensions}
/>
```

---

## Writing a custom extension

An extension can do any combination of four things:

```ts
import type { EditorExtension } from "@rave/rich-text-editor";

const myExtension: EditorExtension = {
  // Required unique ID
  id: "my-extension",

  // Contribute feature flags
  getFeatureFlags: (context) => ({ offline: true }),

  // Configure session draft persistence (sessionStorage key, enabled flag)
  getSessionPersistence: (context) => ({
    enabled: true,
    storageKey: `my-draft:${context.documentId}`,
  }),

  // Provide initial document value (async ok — good for remote fetch)
  getInitialValue: async (context) => {
    const saved = await myApi.load(context.documentId);
    return saved ?? context.value;
  },

  // React to local content changes
  onLocalChange: async (html, context) => {
    await myApi.autosave(context.documentId, html);
  },
};
```

All methods are optional. The `context` argument provides `documentId` and the resolved `featureFlags`.

---

## Session state

`onSessionStateChange` fires whenever session metadata changes:

```tsx
<RichTextEditorField
  onSessionStateChange={(state) => {
    console.log(state.hasUnsavedChanges);
    console.log(state.hasPersistedDraft);
  }}
/>
```

#### `DocumentSessionState`

| Field | Type | Description |
|-------|------|-------------|
| `documentId` | `string` | Resolved document ID. |
| `savedContent` | `string` | Last explicitly saved HTML. |
| `draftContent` | `string` | Current local draft HTML. |
| `hasUnsavedChanges` | `boolean` | Draft differs from saved content. |
| `hasPersistedDraft` | `boolean` | A draft is stored in sessionStorage. |
| `persistenceKey` | `string \| null` | SessionStorage key in use. |
| `featureFlags` | `ResolvedEditorFeatureFlags` | Active resolved flags. |

---

## Feature flags

Flags let extensions and UI signal which capabilities are active. The editor does not gate functionality on these — they are metadata for your app to read.

```ts
interface EditorFeatureFlags {
  offline?: boolean;
  comments?: boolean;
  trackedChanges?: boolean;
  collaboration?: boolean;
  ai?: boolean;
}
```

`createLocalFirstExtension` sets `offline: true` automatically.

---

## Low-level hook: `useDocumentSession`

For custom editor surfaces that don't use `RichTextEditorField`:

```ts
import { useDocumentSession } from "@rave/rich-text-editor";

const {
  localContent,
  hasUnsavedChanges,
  handleLocalChange,
  handleSave,
  handleDiscard,
  clearPersistedDraft,
  sessionState,
} = useDocumentSession({
  value: serverHtml,
  onSave: async (html) => { ... },
  onDiscard: async (html) => { ... },
  documentId: "article:home",
  persistence: { enabled: true },
  autoSave: { enabled: true, debounceMs: 1000 },
});
```

---

## Sanitization utilities

```ts
import {
  sanitizeRichTextContent,
  isContentSafe,
  getSanitizationReport,
} from "@rave/rich-text-editor";

// Sanitize arbitrary HTML string
const clean = sanitizeRichTextContent(rawHtml);

// Check if content is already clean
const safe = isContentSafe(rawHtml);

// Detailed report for debugging
const report = getSanitizationReport(rawHtml);
```

`sanitizeRichTextContent` uses DOMPurify on the client. On SSR it falls back to a regex-only pass (safe for rendering; full sanitization runs after hydration).

---

## SSR

Both `RichTextEditorField` and `RichTextRenderer` are SSR-safe:

- `RichTextRenderer` — renders on server, no DOM dependencies.
- `RichTextEditorField` — with `lazyMount: true` (default) renders a `<button>` placeholder on server. ProseMirror mounts client-side only.
- Local-first storage — all IndexedDB/localStorage access is deferred to the first client-side call. No-ops on the server.

For Next.js App Router, no special wrapper is needed. For Pages Router or other SSR setups, the library works without `dynamic(() => ..., { ssr: false })`.

---

## Dev commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start demo/playground at `http://localhost:5173` |
| `pnpm typecheck` | Type check lib + demo |
| `pnpm build:lib` | Build package → `dist/` |
| `pnpm build:docs` | Build demo site → `site-dist/` |
| `pnpm build` | Build both |

## Publish

```bash
pnpm typecheck && pnpm build:lib && pnpm publish --access public
```

## Deploy docs site

```
Build command:    pnpm build:docs
Output directory: site-dist
```

Works on Vercel, Netlify, Cloudflare Pages.
