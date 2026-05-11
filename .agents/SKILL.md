---
name: complex-editor-architect
description: Designs and guides implementation of sophisticated collaborative editors with real-time sync, offline support, commenting, track changes, import/export, AI editing workflows, and RAG. Use when the user wants to plan, build, or extend an editor similar to Google Docs or Notion inside this repository.
---

# Complex Editor Architect

## Repository state

- Editor: ProseMirror (`prosemirror-state/view/model`), no Tiptap
- Schema: `src/components/prosemirror/schema.ts`
- Persistence: `@automerge/automerge` + localStorage (single-user local-first, done)
- Output: sanitized HTML string via DOMPurify
- Collaboration hook: `onEditorReady(view)` on `createProseMirrorAdapter`

```typescript
type PersistenceConfig = { kind: 'none' } | { kind: 'automerge'; documentId: string }
```

## Classify the request first

1. **Extend the editor** — new PM marks, nodes, toolbar actions, input rules
2. **Add a capability layer** — collaboration, comments, track changes
3. **Design a backend system** — sync server, AI service, RAG pipeline

## Working rules

- ProseMirror only. No contentEditable, no Tiptap.
- Capabilities go into PM plugins or adapter layers, not into `StructuredEditor` directly.
- Never reset EditorView on prop changes — caret stability.
- All HTML in/out passes through `sanitizeRichTextContent`.
- Collaboration: plug a provider into `onEditorReady`. Do not rewrite the editor.
- If a capability changes the stored HTML shape, propose a sidecar approach first.

## State layers to distinguish

| Layer | Where it lives |
|-------|---------------|
| Live editing state | EditorView (in-memory) |
| Local persisted state | Automerge + localStorage |
| Collaboration state | Provider (y-websocket / Hocuspocus / Automerge Repo) |
| Server state | HTML string from `onSave` |

## Capability design

- **Collaboration**: provider factory on `onEditorReady`, presence side-channel, reconnect replay
- **Offline**: Automerge already covers single-user. Multi-user needs mutation queue + merge policy.
- **Comments**: sidecar model, PM position anchors, resolve/reopen flows
- **Track changes**: PM decorations, author attribution, accept/reject — not stored in HTML
- **Import/export**: boundary services with sanitization checkpoint on every import
- **AI**: suggestion-first, user-approved, auditable. Never silent mutation.
- **RAG**: index sanitized HTML snapshots, not raw editor state

## Reference

See [REFERENCE.md](REFERENCE.md) for data shapes, system decomposition, and phased rollout.
