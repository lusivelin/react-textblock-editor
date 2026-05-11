# Rave Rich Text Editor — Agent Guide

ProseMirror-based structured document editor. Output is a sanitized HTML string. Local-first persistence via `@automerge/automerge` + localStorage.

## Repository layout

```
src/
  components/
    rich-text-editor-field.tsx     # Main consumer entry point
    rich-text-renderer.tsx         # Read-only renderer
    action-bar.tsx                 # Save/discard UI
    prosemirror/
      schema.ts                    # ProseMirror schema
      structured-editor.tsx        # EditorView lifecycle
      toolbar.tsx                  # Formatting toolbar
      pm-styles.ts                 # Injected CSS
      adapter.ts                   # createProseMirrorAdapter, PersistenceConfig
      automerge/
        automerge-persistence.ts   # loadHtml / saveHtml via Automerge + localStorage
  hooks/
    use-document-session.ts        # Draft state and session metadata
    use-buffered-rich-text.ts
    use-sanitized-content.ts
    use-rich-text-styling.ts
  core/
    document-session.ts            # DocumentSessionState type
    document-model.ts              # DocumentModelAdapter, EditorMode types
    editor-features.ts             # EditorFeatureFlags type
  utils/
    sanitize-rich-text.ts          # DOMPurify wrapper — gates all HTML in/out
    html/
      html-to-prosemirror.ts       # parseHtmlToDoc
      prosemirror-to-html.ts       # serializeDocToHtml
  demo/
    app.tsx                        # Docs site + playground
.agents/
  SKILL.md                         # Complex editor architect skill
  REFERENCE.md                     # Architecture patterns and phased rollout
docs/
  overview.md
  complex-editor-implementation-plan.md
  automerge-local-first-migration-plan.md
  hosting.md
  publishing.md
```

## Working rules

- Editor is ProseMirror only — no contentEditable, no Tiptap.
- Keep `StructuredEditor` focused on EditorView lifecycle. Add capabilities as PM plugins.
- Never destroy and recreate EditorView on prop changes — caret stability.
- All HTML leaving the editor must pass through `sanitizeRichTextContent`.
- `prosemirror-history` handles undo/redo. Don't mix with `yUndoPlugin`.

## API quick reference

```tsx
import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => { setSavedHtml(html); }}
  documentId="article:home"
  persistence={{ kind: "automerge", documentId: "article:home" }}
  featureFlags={{ offline: true }}
/>
<RichTextRenderer content={savedHtml} />
```

## Verification

```bash
pnpm typecheck
pnpm build:lib
pnpm build:docs
```

## Complex editor patterns

See `.agents/SKILL.md` — covers collaboration, comments, track changes, AI, RAG.
