# Overview

ProseMirror rich text editor package. Stores and outputs a sanitized HTML string. Local-first persistence via Automerge + localStorage.

## What's in the package

- `RichTextEditorField` — full editing surface with draft buffering, save/discard, Automerge persistence
- `RichTextRenderer` — read-only renderer, sanitizes on render
- `sanitizeRichTextContent` — DOMPurify wrapper for manual use
- `useDocumentSession` — low-level draft state hook
- `createProseMirrorAdapter` — adapter factory for the structured-editor seam

## Integration

```tsx
import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => { setSavedHtml(html); }}
  documentId="article:home"
/>

<RichTextRenderer content={savedHtml} />
```

## Available seams

```typescript
// Observe every draft keystroke
onLocalChange={(html) => console.log(html)}

// Observe session metadata (unsaved changes, draft state, flags)
onSessionStateChange={(state) => console.log(state)}

// Local-first persistence — survives reload
persistence={{ kind: 'automerge', documentId: 'article:home' }}

// Feature flags — signal which capabilities are active
featureFlags={{ offline: true, comments: true, collaboration: true, ai: true }}
```

## Use cases

| Tier | What it needs |
|------|--------------|
| Simple | Single-user editing, save/discard, local draft persistence |
| Medium | Collaboration, comments, slash commands, drag-and-drop blocks |
| Complex | Real-time sync, offline replay, track changes, DOCX export, AI, RAG |

See `.agents/SKILL.md` for medium and complex tier architecture guidance.
