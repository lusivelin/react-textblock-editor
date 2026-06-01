# Overview

ProseMirror rich text editor library. HTML string in, sanitized HTML string out. Extensions add optional capabilities.

## Public exports

| Export | Description |
|--------|-------------|
| `RichTextEditorField` | Main editor component with draft buffering and save/discard flow |
| `RichTextRenderer` | Read-only renderer, SSR-safe |
| `createDefaultEditorExtensions` | Preset: formatting + lists |
| `createHtmlSourceExtension` | HTML source editor toggle and modal |
| `createImageExtension` | Image upload and URL insert |
| `createTablesExtension` | Table editing |
| `composeExtensions` | Merge extension arrays, filtering falsy values |
| `sanitizeRichTextContent` | DOMPurify wrapper (regex fallback on SSR) |
| `isContentSafe` | Returns true if content needs no sanitization |
| `getSanitizationReport` | Detailed diff of what sanitization changed |
| `defaultTheme`, `darkTheme`, `minimalTheme` | CSS theme strings for the `theme` prop |

## Architecture

```
RichTextEditorField
  ├─ useDocumentSession      draft state, save/discard, localStorage
  ├─ extensions[]            capability layer
  └─ StructuredEditor        ProseMirror lifecycle
       ├─ createEditorSchema  merges extension schema contributions
       ├─ parseHtmlToDoc      HTML → ProseMirror doc (via DOMParser)
       └─ serializeDocToHtml  ProseMirror doc → sanitized HTML
```

## Extension contract

Each extension is a plain object:

```ts
interface EditorExtension {
  id: string;
  dependsOn?: string[];
  getSchema?():              EditorSchemaSpec
  getPlugins?(ctx):          Plugin[]
  getKeymap?(ctx):           Record<string, Command>
  getNodeViews?(ctx):        NodeViews
  getToolbarItems?(ctx):     EditorToolbarItem[]
  getOverlays?(ctx):         EditorOverlayItem[]
  getFeatureFlags?(ctx):     Partial<ResolvedEditorFeatureFlags>
  getSessionPersistence?(ctx): DocumentSessionPersistenceOptions
  getInitialValue?(ctx):     string | Promise<string | undefined>
  onLocalChange?(html, ctx): void | Promise<void>
  getApi?():                 unknown
}
```

All methods are optional. See [extension-guide.md](./extension-guide.md) for authoring details.

## Source layout

```
src/lib/
  components/
    prosemirror/         StructuredEditor, toolbar, image-view, table-toolbar
    rich-text-editor-field.tsx
    rich-text-renderer.tsx
  core/
    document-model.ts    EditorClassNames type
    document-session.ts  Session state types and storage helpers
    editor-extension.ts  EditorExtension interface + resolution utilities
    editor-features.ts   Feature flags
  extensions/
    default-tools/       Bold, italic, headings, lists
    html-source/         HTML source toggle and modal
    images/              Image node, upload/link UI
    tables/              Table schema and toolbar
    shared/              composeExtensions
  hooks/
    use-document-session.ts
  utils/
    html/                parseHtmlToDoc, serializeDocToHtml
    sanitize-rich-text.ts
  index.ts               Public package entry
```

## Draft persistence

Pass `persist={true}` on `RichTextEditorField` to save the draft to localStorage on every keystroke. The draft is cleared when `onSave` resolves successfully. Use `documentId` to scope the storage key per document.

Storage key format: `rtb-editor:draft:<documentId>`

## SSR

| Layer | Server | Client |
|-------|--------|--------|
| `RichTextRenderer` | Renders full HTML | Hydrates, no flash |
| `RichTextEditorField` (`lazyMount: true`) | Renders `<button>` placeholder | Mounts ProseMirror on click |
| localStorage persistence | No-op | Active when `persist={true}` |
| `sanitizeRichTextContent` | Regex-only pass | Full DOMPurify |
