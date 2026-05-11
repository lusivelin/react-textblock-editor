# Complex Editor Roadmap

## Phases

### Phase 1 — Done
- ProseMirror editor (marks, blocks, tables, undo/redo) ✓
- Automerge local-first persistence ✓
- Sanitized HTML string output ✓
- Session metadata + feature flag seams ✓
- Save/discard boundary ✓

### Phase 2
- Real-time collaboration provider (y-websocket or Hocuspocus via `onEditorReady`)
- Presence and remote cursors
- Comment sidecar model
- Markdown import/export

### Phase 3
- Track changes as ProseMirror decorations
- Redline views
- DOCX conversion service
- AI suggestion actions with audit log

### Phase 4
- Document corpus indexing (RAG)
- Permissions-aware retrieval
- Workspace search and citations

## Adding collaboration

Plug a provider into the existing `onEditorReady` hook on `createProseMirrorAdapter`:

```typescript
createProseMirrorAdapter({
  onEditorReady: (view) => {
    // attach y-websocket, Hocuspocus, or Automerge Repo sync adapter
  },
})
```

The editor does not need to change. The provider manages the shared document state.

## Architecture reference

See `.agents/REFERENCE.md` for data models, API contracts, and capability design notes.
