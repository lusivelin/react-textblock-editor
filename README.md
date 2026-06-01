# @linhtetpaing9/react-textblock-editor

ProseMirror rich text editor for React. Outputs sanitized HTML and includes optional draft persistence, tables, image upload, and HTML source editing.

## Install

```bash
pnpm add @linhtetpaing9/react-textblock-editor
# or
npm install @linhtetpaing9/react-textblock-editor
```

Import the stylesheet once at your app entry:

```ts
import "@linhtetpaing9/react-textblock-editor/style.css";
```

## Quick start

```tsx
import { useState } from "react";
import { RichTextEditorField } from "@linhtetpaing9/react-textblock-editor";

function Article() {
  const [html, setHtml] = useState("<p>Hello world</p>");

  return (
    <RichTextEditorField
      value={html}
      onSave={async (next) => {
        await api.save(next);
        setHtml(next);
      }}
    />
  );
}
```

## Key props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Saved HTML content |
| `onSave` | `(html: string) => void \| Promise<void>` | — | Called on explicit save (Ctrl+S or save button) |
| `onDiscard` | `(html: string) => void \| Promise<void>` | — | Called when user discards unsaved changes. Also shows a Discard button in the status bar |
| `onChange` | `(html: string) => void` | — | Called on every keystroke |
| `onLocalChange` | `(html: string) => void` | — | Alias for `onChange` |
| `onSaveStatusChange` | `(status: SaveStatus) => void` | — | Fires when save status changes (`idle`, `saving`, `saved`, `error`) |
| `onSessionStateChange` | `(state: DocumentSessionState) => void` | — | Fires when session state changes (draft, unsaved, persistence info) |
| `extensions` | `EditorExtension[]` | — | Optional capability extensions |
| `persist` | `boolean` | `false` | Save draft to localStorage, cleared on successful save |
| `documentId` | `string` | `"default"` | Scopes the localStorage draft key when `persist` is true |
| `placeholder` | `string` | `"Start writing…"` | Placeholder for empty editor |
| `height` | `number` | `400` | Min height in px |
| `darkMode` | `boolean` | `false` | Dark theme |
| `readOnly` | `boolean` | `false` | Disable editing |
| `lazyMount` | `boolean` | `true` | Mount editor on first click (better page load) |
| `emptyLabel` | `string` | `"Click to add content…"` | Trigger label when `value` is empty |
| `filledLabel` | `string` | `"Click to edit…"` | Trigger label when `value` has content |
| `theme` | `string` | — | CSS string for runtime per-instance theming |
| `className` | `string` | — | Class on the root element |
| `classNames` | `EditorClassNames` | — | Fine-grained class overrides per editor region |

## Read-only display

```tsx
import { RichTextRenderer } from "@linhtetpaing9/react-textblock-editor";

<RichTextRenderer content={html} />
```

SSR-safe. Sanitizes content before rendering.

## Save & discard

When `onSave` is provided, a **Save** button appears in the editor's status bar whenever there are unsaved changes. When `onDiscard` is also provided, a **Discard** button appears alongside it.

```tsx
<RichTextEditorField
  value={html}
  onSave={async (next) => {
    await api.save(next);
    setHtml(next);
  }}
  onDiscard={(reverted) => {
    // The editor has already reset internally to the last saved value.
    // Sync any external state that mirrors the draft here.
    setDraftHtml(reverted);
  }}
/>
```

The status bar progresses through these states:

| State | Shown when |
|---|---|
| _(empty)_ | No unsaved changes |
| `● Unsaved changes [Save] [Discard]` | User has typed since last save |
| `⟳ Saving…` | `onSave` promise is pending |
| `Saved` | `onSave` resolved (fades after ~2 s) |
| `Save failed` | `onSave` threw / rejected |

Ctrl+S (or Cmd+S on Mac) also triggers `onSave` directly without clicking the button.

## Draft persistence

Pass `persist` to save the draft to localStorage on every keystroke. Clears automatically when `onSave` succeeds.

```tsx
<RichTextEditorField
  value={html}
  documentId="article:1"
  persist
  onSave={async (next) => {
    await api.save(next);
    setHtml(next);
  }}
/>
```

`documentId` scopes the key — use a stable unique ID per document.

## Extensions

Extensions add optional editor capabilities. If you pass the `extensions` prop, include the default extensions when you still want the built-in formatting toolbar.

### Image upload

```tsx
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createImageExtension,
} from "@linhtetpaing9/react-textblock-editor";

<RichTextEditorField
  extensions={composeExtensions(
    ...createDefaultEditorExtensions(),
    createImageExtension({
      onUpload: async (file) => {
        const url = await myStorage.upload(file);
        return url;
      },
    }),
  )}
/>
```

### Tables

```tsx
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createTablesExtension,
} from "@linhtetpaing9/react-textblock-editor";

<RichTextEditorField
  extensions={composeExtensions(
    ...createDefaultEditorExtensions(),
    createTablesExtension(),
  )}
/>
```

### HTML source editing

```tsx
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createHtmlSourceExtension,
} from "@linhtetpaing9/react-textblock-editor";

<RichTextEditorField
  extensions={composeExtensions(
    ...createDefaultEditorExtensions(),
    createHtmlSourceExtension(),
  )}
/>
```

### Compose extensions

```tsx
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createImageExtension,
  createTablesExtension,
} from "@linhtetpaing9/react-textblock-editor";

const extensions = composeExtensions(
  ...createDefaultEditorExtensions(),
  isImageEnabled && createImageExtension({ onUpload }),
  createTablesExtension(),
);
```

`composeExtensions` filters out `false`, `null`, and `undefined`.

## Styling

### How it works

The editor uses two CSS class namespaces:

- `.rtb-pm` — editor shell (toolbar, editor area, status bar)
- `.rtb-renderer` — read-only renderer (`RichTextRenderer`)

Both are fully controlled by CSS custom properties. Override them in your own stylesheet — no need to modify the lib.

### Editor tokens (`.rtb-pm`)

```css
.rtb-pm {
  /* Surface */
  --rtb-bg: #ffffff;
  --rtb-text: #111827;
  --rtb-border: #e2e8f0;
  --rtb-shadow: 0 1px 3px 0 rgba(0,0,0,.1);
  --rtb-radius: .375rem;
  --rtb-accent: #3b82f6;       /* save indicators, focus rings */
  --rtb-danger-color: #ef4444; /* save error */

  /* Toolbar */
  --rtb-toolbar-bg: #f8fafc;
  --rtb-toolbar-border: #e2e8f0;

  /* Buttons */
  --rtb-btn-color: #64748b;
  --rtb-btn-hover-bg: #f1f5f9;
  --rtb-btn-hover-color: #1e293b;
  --rtb-btn-active-bg: #e2e8f0;
  --rtb-btn-active-color: #0f172a;

  /* Separators / popups */
  --rtb-sep-color: #e2e8f0;
  --rtb-popup-bg: #ffffff;
  --rtb-popup-border: #e2e8f0;
  --rtb-popup-shadow: 0 4px 6px -1px rgba(0,0,0,.1);
}
```

### Renderer tokens (`.rtb-renderer`)

```css
.rtb-renderer {
  --rtb-r-font: ui-sans-serif, system-ui, sans-serif;
  --rtb-r-font-size: 1rem;
  --rtb-r-line-height: 1.6;
  --rtb-r-text: #1f2937;
  --rtb-r-heading-color: #111827;
  --rtb-r-h1-size: 1.875rem;
  --rtb-r-h2-size: 1.5rem;
  --rtb-r-h3-size: 1.25rem;
  --rtb-r-link: #2563eb;
  --rtb-r-link-hover: #1d4ed8;
  --rtb-r-blockquote-border: #e5e7eb;
  --rtb-r-blockquote-color: #4b5563;
  --rtb-r-code-bg: #f3f4f6;
  --rtb-r-table-header-bg: #1f2937;
  --rtb-r-table-header-color: #ffffff;
  --rtb-r-table-cell-color: #374151;
  --rtb-r-table-border: #e5e7eb;
  --rtb-r-marker-color: #6b7280;  /* list bullet / number color */
  --rtb-r-block-gap: 1rem;
}
```

### Override globally

Put this in your global CSS file (after importing the lib stylesheet):

```css
/* your-app/globals.css */
.rtb-pm {
  --rtb-accent: #7c3aed;
  --rtb-radius: 0;
  --rtb-shadow: none;
}

.rtb-renderer {
  --rtb-r-heading-color: #053b9b;
  --rtb-r-font: var(--font-poppins), sans-serif;
  --rtb-r-font-size: 0.9375rem;
}
```

### Override per-instance

Pass `className` and scope your overrides to that class:

```tsx
<RichTextEditorField className="my-editor" ... />
<RichTextRenderer className="my-renderer" content={html} />
```

```css
.my-editor.rtb-pm {
  --rtb-accent: #7c3aed;
  --rtb-toolbar-bg: #f5f3ff;
}

.my-renderer.rtb-renderer {
  --rtb-r-heading-color: #053b9b;
  --rtb-r-font-size: 1.125rem;
}
```

### Override with a CSS theme file

Built-in themes (`themes/dark.css`, `themes/minimal.css`) work by redefining the same vars. You can create your own the same way:

```css
/* your-app/rtb-brand-theme.css */
.rtb-pm {
  --rtb-accent: #7c3aed;
  --rtb-btn-active-bg: #ede9fe;
  --rtb-btn-active-color: #5b21b6;
}
.rtb-renderer {
  --rtb-r-heading-color: #5b21b6;
  --rtb-r-link: #7c3aed;
}
```

```ts
import "@linhtetpaing9/react-textblock-editor/style.css";
import "./rtb-brand-theme.css"; // after — wins the cascade
```

### Override with the `theme` prop (inline, per-instance)

For runtime theming (e.g. user-selected theme), pass a CSS string directly:

```tsx
import { darkTheme } from "@linhtetpaing9/react-textblock-editor";

<RichTextEditorField theme={darkTheme} />

// or a custom string
<RichTextEditorField theme=".rtb-pm { --rtb-accent: #7c3aed; }" />
```

Built-in theme strings: `defaultTheme`, `darkTheme`, `minimalTheme`.

### Built-in theme imports

```ts
import "@linhtetpaing9/react-textblock-editor/style.css";
import "@linhtetpaing9/react-textblock-editor/themes/dark.css";    // dark mode
import "@linhtetpaing9/react-textblock-editor/themes/minimal.css"; // borderless minimal
```

## Building a custom extension

```ts
import type { EditorExtension } from "@linhtetpaing9/react-textblock-editor";

export function createMyExtension(): EditorExtension {
  return {
    id: "my-extension",
    onLocalChange: async (html, ctx) => {
      await myApi.autosave(ctx.documentId, html);
    },
  };
}
```

See [docs/extension-guide.md](./docs/extension-guide.md) for the full API.

## Dev

```bash
pnpm dev          # demo site at localhost:5173
pnpm typecheck    # type-check
pnpm test         # unit tests
pnpm build:lib    # build → dist/
pnpm pack:check   # inspect npm package contents
```

## Release

Publishing is handled by the `Release package` GitHub Actions workflow.

1. Add an `NPM_TOKEN` repository secret with publish access for this package.
2. Run **Actions → Release package** from the `main` branch.
3. Choose `patch`, `minor`, or `major`.

The workflow runs typecheck, unit tests, e2e tests, bumps `package.json`, creates a git tag, builds the library, uploads the generated npm tarball, and publishes to npm.
