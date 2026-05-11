# Complex Editor Reference

## Repository architecture (current)

```
src/
  components/
    rich-text-editor-field.tsx     # Field wrapper: draft buffer, Automerge persistence, save/discard
    rich-text-renderer.tsx         # Read-only HTML renderer
    action-bar.tsx                 # Save/discard buttons
    prosemirror/
      schema.ts                    # PM schema: nodes + marks
      structured-editor.tsx        # EditorView lifecycle, toolbar, external value sync
      toolbar.tsx                  # Mark/block toggles, undo/redo
      pm-styles.ts                 # Injected ProseMirror CSS
      adapter.ts                   # createProseMirrorAdapter factory, PersistenceConfig type
      automerge/
        automerge-persistence.ts   # loadHtml / saveHtml via @automerge/automerge + localStorage
  hooks/
    use-document-session.ts        # Draft state, save/discard boundaries, session metadata
    use-buffered-rich-text.ts      # Low-level draft buffer
    use-sanitized-content.ts       # Sanitize on render
    use-rich-text-styling.ts       # Renderer styling
  core/
    document-session.ts            # DocumentSessionState type, storage helpers
    document-model.ts              # DocumentModelAdapter interface, EditorMode type
    editor-features.ts             # EditorFeatureFlags type
  utils/
    sanitize-rich-text.ts          # DOMPurify wrapper — gates all HTML in/out
    html/
      html-to-prosemirror.ts       # parseHtmlToDoc: sanitize → DOMParser
      prosemirror-to-html.ts       # serializeDocToHtml: DOMSerializer → sanitize
  demo/
    app.tsx                        # Docs website + live playground
```

## Persistence model (current)

Single-user local-first:
- `@automerge/automerge` CRDT document stores `{ html: string }`
- Binary serialized to localStorage under key `rave-rte:am:<documentId>`
- Loaded on first mount, saved on every keystroke via `handleChangeWithPersist`
- Survives page reload without a server round-trip

To enable: `persistence={{ kind: 'automerge', documentId: 'article:home' }}` on `RichTextEditorField`.

Multi-user collaboration (not yet implemented):
- Plug a provider into `onEditorReady` on `createProseMirrorAdapter`
- Provider wraps a shared CRDT (y-websocket, Hocuspocus, Automerge Repo + sync server)
- Emit presence and cursor state via provider side-channel

## System decomposition for complex editors

### Frontend package layers

- PM editor surface: formatting, selection, composition, tables, embeds
- Collaboration adapter: shared doc session, remote cursors, presence, conflict events
- Comments adapter: thread anchors, role checks, resolve/reopen
- Change-tracking adapter: suggestion decorations, author badges, accept/reject
- Offline adapter (already started): Automerge + localStorage; future: mutation queue, replay
- AI adapter: explicit user actions, suggestion application, audit trail

### Backend services

- Document service: metadata, versions, snapshots, publish state
- Collaboration service: room membership, presence, sync transport, replay window
- Comment service: threads, participants, mentions, permissions, audit history
- Change service: suggestions, accept/reject events, reviewer attribution
- Conversion service: DOCX/Markdown import-export with validation
- AI service: prompt orchestration, policy checks, result storage, audit trail
- Indexing service: chunk extraction, embeddings, vector store writes, reindex jobs
- Retrieval service: permissions-aware semantic and lexical search

## Document model options

### Option A: HTML-first (current)

Keep sanitized HTML as persisted document body. Store comments, suggestions, and version metadata in sidecar tables.

Use when compatibility and simplicity are primary concerns.

Tradeoff: simpler migration path; weaker semantics for granular concurrent editing.

### Option B: Canonical structured model + HTML projection

Keep PM document state as canonical for editing and sync. Generate sanitized HTML snapshots for renderer compatibility.

Use when collaboration is central and accept/reject semantics need to be precise.

Tradeoff: higher implementation complexity; much stronger collaboration and review behavior.

## Collaboration model

Minimum design points:
- stable document/session ids
- per-user presence state
- reconnect with missed-op replay
- server-side authorization on every room join and mutation stream
- snapshot compaction for long-lived documents

For this repository: plug a provider factory into `onEditorReady`. The PM editor already has full undo/redo via `prosemirror-history`. Adding y-prosemirror would replace history with `yUndoPlugin`.

## Offline support

Current: Automerge + localStorage covers single-user offline (survives reload, no server needed).

For multi-user offline:
- cache the last accepted document snapshot locally
- append user mutations to a local durable queue
- replay mutations on reconnect after auth refresh
- surface conflicts that cannot be auto-merged

Rules:
- queue entries must be idempotent or deduplicatable
- do not run irreversible AI transforms automatically while offline
- expose sync status in the UI

## Comments and role-based review

Represent comments as threads separate from the document body.

Each thread should contain:
- thread id, anchor reference, quoted context for recovery
- author, timestamps, status (open/resolved/reopened)
- visibility policy or role requirement

Anchor strategy:
- stable PM node ids when available
- textual quote + offset fallback
- reattachment logic after edits

## Track changes and redlining

Each suggestion should capture:
- operation type: insert, delete, replace, format, block move
- author, created at, anchor/range, before/after payload
- status: pending, accepted, rejected

Implement as PM decorations. Do not store tracked changes inside the sanitized HTML string.

## Import and export

Import pipeline: parse → map to safe HTML or PM doc → sanitize → normalize → warn on lossy conversions.

Export pipeline: load canonical state or HTML snapshot → map to target format → preserve comments/change marks where possible → emit fidelity warnings.

Always document which features are lossy for: DOCX comments, tracked changes, tables, nested layouts, embeds.

## AI operations

Rules:
- AI returns suggestions, never silent document mutations
- user accepts or rejects proposed changes
- prompts and outputs logged per privacy policy
- sensitive documents may require model routing or redaction

Recommended operations: rewrite selection, summarize, generate outline, transform tone, extract action items, classify/tag.

## RAG across documents

Index sanitized HTML snapshots, not raw editor state.

Pipeline: choose indexable versions → extract text + structural metadata → chunk by headings/blocks → embed → store with tenant/project/roles/tags/timestamps/source anchors → retrieve with permissions filtering before ranking.

Minimum metadata per chunk: document id, version id, tenant id, permissions scope, heading/path context, source anchor for citation.

## Phased rollout

### Phase 1 (done / in progress)
- ProseMirror editor surface ✓
- Automerge local-first persistence ✓
- Sanitized HTML string output ✓
- Session metadata seams ✓
- Feature flag boundaries ✓

### Phase 2
- Real-time collaboration transport and presence
- Conflict surface in UI
- Role-based comment sidecar model
- Markdown import/export

### Phase 3
- First-class tracked changes and redline views
- DOCX conversion pipeline
- AI suggestion actions with audit logging

### Phase 4
- Corpus indexing and permissions-aware RAG
- Workspace search, citations, and answer grounding

## Questions to force early

- Is the HTML-string output contract mandatory long-term, or can it become a projection?
- What is the maximum number of simultaneous editors per document?
- Must tracked changes round-trip to DOCX?
- Are comments tenant-private, role-scoped, or share-link visible?
- What offline guarantees are required: draft-only, full edit, or full collaboration?
- Are AI outputs advisory only, or can they perform batch operations with approval?
- Must RAG respect per-document and per-section permissions?
