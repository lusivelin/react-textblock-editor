# `@rave/rich-text-editor`

ProseMirror rich text editor for React with local-first persistence.

## Install

```bash
pnpm add @rave/rich-text-editor
```

For local-first persistence (optional):

```bash
pnpm add @automerge/automerge
```

## Quick start

```tsx
import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

const [savedHtml, setSavedHtml] = useState("<p>Hello</p>");

<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => {
    await saveDocument({ body: html });
    setSavedHtml(html);
  }}
  documentId="article:home"
/>

<RichTextRenderer content={savedHtml} />
```

## Local-first persistence

Content survives page reload without a server. Uses `@automerge/automerge` + localStorage.

```tsx
<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => { setSavedHtml(html); }}
  documentId="article:home"
  persistence={{ kind: "automerge", documentId: "article:home" }}
  featureFlags={{ offline: true }}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `string` | — | Saved HTML from your state or API |
| `onSave` | `(html) => void \| Promise` | — | Called on explicit save |
| `onDiscard` | `(html) => void \| Promise` | — | Called on discard |
| `onLocalChange` | `(html) => void` | — | Called on every draft edit |
| `onSessionStateChange` | `(state) => void` | — | Session metadata observer |
| `documentId` | `string` | — | Stable ID for this document |
| `persistence` | `PersistenceConfig` | `{ kind: 'none' }` | `{ kind: 'automerge', documentId }` to enable |
| `featureFlags` | `EditorFeatureFlags` | — | `offline`, `comments`, `collaboration`, `ai` |
| `placeholder` | `string` | `"Start writing…"` | Editor placeholder |
| `height` | `number` | `400` | Min height in px |
| `darkMode` | `boolean` | `false` | Dark theme |
| `readOnly` | `boolean` | `false` | Disable editing |
| `lazyMount` | `boolean` | `true` | Mount only on first click |

## Session state

```typescript
onSessionStateChange={(state) => {
  // state.documentId
  // state.savedContent
  // state.draftContent
  // state.hasUnsavedChanges
  // state.hasPersistedDraft
  // state.featureFlags
}}
```

## Sanitization

```tsx
import { sanitizeRichTextContent, isContentSafe, getSanitizationReport } from "@rave/rich-text-editor";
```

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Dev server at `http://localhost:4173` |
| `pnpm typecheck` | Type check |
| `pnpm build:lib` | Build package → `dist/` |
| `pnpm build:docs` | Build docs site → `site-dist/` |
| `pnpm build` | Both |

## Deploy docs site

```
Build command:    pnpm build:docs
Output directory: site-dist
```

Works on Vercel, Netlify, Cloudflare Pages.

## Publish

```bash
pnpm typecheck && pnpm build:lib && pnpm publish --access public
```
