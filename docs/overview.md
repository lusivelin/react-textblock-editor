# Overview

ProseMirror rich text editor package. Stores and outputs a sanitized HTML string. Local-first persistence via Automerge + IndexedDB (localStorage fallback). SSR-safe.

## What's in the package

| Export | Description |
|--------|-------------|
| `RichTextEditorField` | Full editing surface: draft buffering, save/discard, extensions |
| `RichTextRenderer` | Read-only renderer, SSR-safe, sanitizes on render |
| `StructuredEditor` | Low-level ProseMirror wrapper (no session logic) |
| `createProseMirrorAdapter` | Adapter factory for custom surfaces |
| `createLocalFirstExtension` | Local-first persistence extension (IndexedDB → localStorage) |
| `composeExtensions` | Compose multiple extensions, filtering falsy values |
| `useDocumentSession` | Low-level draft state hook |
| `sanitizeRichTextContent` | DOMPurify wrapper |
| `isContentSafe` | Check if content is already sanitized |
| `getSanitizationReport` | Detailed sanitization report |

## Architecture

```
RichTextEditorField
  └─ useDocumentSession          draft buffering, save/discard, sessionStorage persistence
  └─ extensions[]                capability layer (local-first, future AI, etc.)
       └─ createLocalFirstExtension
            └─ createAutoStorage (IndexedDB → localStorage, lazy, SSR-safe)
  └─ StructuredEditor            ProseMirror lifecycle, toolbar, image, table
       └─ parseHtmlToDoc         HTML → ProseMirror doc
       └─ serializeDocToHtml     ProseMirror doc → HTML
```

## Extension model

Extensions are plain objects implementing `EditorExtension`. They plug into `RichTextEditorField` via the `extensions` prop:

```ts
interface EditorExtension {
  id: string;
  getFeatureFlags?:       (ctx) => Partial<ResolvedEditorFeatureFlags>
  getSessionPersistence?: (ctx) => DocumentSessionPersistenceOptions | undefined
  getInitialValue?:       (ctx) => string | Promise<string | undefined> | undefined
  onLocalChange?:         (html, ctx) => void | Promise<void>
}
```

Built-in: `createLocalFirstExtension({ documentId })`.

## Local-first storage

`createAutoStorage()` is internal — not exported. It:
1. Defers backend selection to first actual browser-side call (`typeof window` guard)
2. Picks IndexedDB if available, falls back to localStorage
3. Serializes content via Automerge binary (delta-friendly) encoded as base64

## SSR behaviour

| Layer | Server | Client |
|-------|--------|--------|
| `RichTextRenderer` | renders full HTML | hydrates, no flash |
| `RichTextEditorField` (`lazyMount: true`) | renders `<button>` placeholder | mounts ProseMirror on click |
| Local-first storage | no-op | lazy-initializes IndexedDB or localStorage |
| `sanitizeRichTextContent` | regex-only pass | full DOMPurify |

## Source layout

```
src/lib/
  components/
    prosemirror/         ProseMirror editor, toolbar, image-view, table-toolbar
    rich-text-editor-field.tsx
    rich-text-renderer.tsx
  core/
    document-model.ts    StructuredEditorRenderProps, document model types
    document-session.ts  Session state types and storage helpers
    editor-extension.ts  EditorExtension interface
    editor-features.ts   Feature flags interface
    plugin-registry.ts
  extensions/
    local-first/
      index.ts           createLocalFirstExtension
      storage.ts         createAutoStorage (IndexedDB + localStorage, internal)
    shared/
      compose-extensions.ts
  hooks/
    use-document-session.ts
    use-isomorphic-layout-effect.ts
    use-rich-text-styling.ts
    ...
  utils/
    html/                parseHtmlToDoc, serializeDocToHtml
    editor/              ProseMirror command helpers
    sanitize-rich-text.ts
  index.ts               Public package entry
```
