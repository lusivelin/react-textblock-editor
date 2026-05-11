# Automerge Local-First Migration Plan

## Decision

Use Automerge as the foundation for offline-first collaboration only if this repository is willing to move the live editing model away from raw `contentEditable` HTML.

Recommended target architecture:

- live editor state: ProseMirror document
- collaboration and offline sync: Automerge document and repo
- saved compatibility surface: sanitized HTML snapshot
- review metadata: sidecar records or sidecar Automerge documents

Do not attempt to make the current HTML-string editor itself the canonical collaborative model.

## Why

This repository currently treats one HTML string as the editor's source of truth. That is still a good package boundary for:

- saved output
- rendering
- interoperability with existing consumers

It is not a good canonical model for:

- concurrent text editing
- stable cursor tracking
- comments anchored through edits
- granular tracked changes
- local-first mutation replay

Automerge is strongest when it owns the structured document state directly.

## Verified Automerge capabilities

Automerge explicitly supports:

- offline-first local editing with later sync
- local storage and sync adapters
- stable cursors for sequence positions
- ephemeral per-document messaging for transient data like cursors
- rich-text primitives based on marks and block markers
- official ProseMirror integration guidance

References:

- https://automerge.org/
- https://automerge.org/docs/hello/
- https://automerge.org/docs/tutorial/local-sync/
- https://automerge.org/docs/reference/repositories/ephemeral/
- https://automerge.org/docs/reference/under-the-hood/rich-text-schema/
- https://automerge.org/docs/cookbook/rich-text-prosemirror-react/
- https://github.com/automerge/automerge-prosemirror

## Recommended architecture

### 1. Canonical document model

Adopt a structured rich-text document as the editing source of truth.

Recommended shape:

- ProseMirror schema for editor behavior
- Automerge rich-text document as the shared collaborative backing state
- HTML snapshot generated from the structured model for persistence compatibility and rendering

This means:

- editor users interact with ProseMirror
- collaboration/offline semantics come from Automerge
- existing `RichTextRenderer` can keep consuming HTML with minimal consumer breakage

### 2. Local-first repo layer

Create one Automerge `Repo` per app instance.

Browser-first default:

- storage: IndexedDB
- same-browser-tab sync: BroadcastChannel
- remote sync: WebSocket or other network adapter later

For this repository, that repo layer should live outside the low-level editor shell and be injected through a higher-level provider or adapter.

### 3. Presence and cursors

Use Automerge ephemeral messaging for:

- live cursors
- selection highlights
- active-user presence
- typing indicators

Do not persist these into the saved document body.

### 4. Comments and tracked changes

Do not encode comments and review state only as HTML markup.

Instead:

- anchor comments and suggestions to stable document positions or cursor-derived ranges
- store comment threads separately from the text body
- store review suggestions as first-class records

Automerge gives you the shared data layer, but comments and tracked changes still need explicit product modeling.

### 5. HTML compatibility layer

Preserve the package contract by projecting the structured document into sanitized HTML.

That projection should be used for:

- `onSave` payloads
- renderer input
- Markdown/DOCX export staging
- RAG text extraction

The HTML snapshot should be considered a derived artifact, not the editing source of truth.

## Migration path

### Phase 1: Add an Automerge adapter boundary

Goal:
Prepare the package to host a structured collaborative editor without breaking the current API immediately.

Deliver:

- `CollaborationAdapter` or `DocumentModelAdapter` interface
- `RichTextEditorField` support for a structured editor mode
- session/provider wiring for local-first document state

Effect on current repo:

- no user-facing collaboration yet
- no forced rewrite of renderer/output contract yet

### Phase 2: Introduce ProseMirror editor core

Goal:
Replace the current DOM-driven editing shell with a structured editor core.

Deliver:

- ProseMirror-based editor component
- schema mapping for current supported markup:
  - paragraphs
  - headings
  - bold/italic/underline/strike/code
  - links
  - lists
  - blockquote
  - tables
  - images
- HTML import/export bridge

Repository impact:

- `src/components/rich-text-editor.tsx` likely becomes a wrapper around a new editor implementation instead of directly owning editing mechanics
- current DOM mutation hooks become progressively obsolete

### Phase 3: Back ProseMirror with Automerge

Goal:
Make the structured editor collaborative and offline-first.

Deliver:

- Automerge repo initialization
- browser local storage adapter
- local-tab sync
- document handle lifecycle
- ProseMirror <-> Automerge binding

Recommended first scope:

- collaboration in one browser across multiple tabs
- reload-safe local persistence
- no remote backend yet

This is the safest first milestone because it proves:

- local-first persistence
- sync correctness
- editor state hydration
- selection resilience

### Phase 4: Reintroduce current package features

Goal:
Rebuild current editor features on top of the structured model.

Re-add in this order:

1. formatting toolbar
2. links
3. lists and headings
4. images
5. tables
6. variable insertion
7. fullscreen and editor chrome

Do not port current DOM-manipulation code directly. Rebuild features against commands and schema transactions.

### Phase 5: Add remote sync

Goal:
Extend local-first behavior beyond one browser/origin.

Deliver:

- remote network adapter
- auth-aware document access
- reconnect handling
- sync state UI

At this stage the docs demo should expose:

- online/offline state
- local draft persistence state
- peer presence count
- connection and replay status

### Phase 6: Add comments and presence

Goal:
Add real collaboration UX beyond shared text.

Deliver:

- live cursors via ephemeral messaging
- anchored comment threads
- comment sidebar
- resolve/reopen flows

Important:

- comments should survive edits through stable anchors
- transient cursor presence should never pollute saved content

### Phase 7: Add tracked changes

Goal:
Support editorial workflows rather than plain collaboration only.

Deliver:

- suggestion model
- accept/reject flows
- redline rendering
- author attribution

Important design note:

- Automerge history is not the same thing as product-grade tracked changes
- tracked changes must be modeled explicitly

### Phase 8: Import/export and AI/RAG

Goal:
Move advanced document workflows onto the new structured base.

Deliver:

- Markdown import/export
- DOCX conversion pipeline
- AI suggestion operations
- document extraction and chunking for RAG

At this stage RAG should index:

- derived plain text or structured chunks from the canonical document
- document metadata and source anchors

Do not index raw unsanitized HTML from transient editor state.

## Mapping this repo to the new architecture

### Likely to keep

- `RichTextEditorField` as the host integration boundary
- `RichTextRenderer` as the HTML rendering boundary
- sanitization and output validation responsibilities
- docs site as manual test surface

### Likely to replace or heavily reduce

- direct DOM mutation logic in `src/components/rich-text-editor.tsx`
- hooks that manipulate selection and HTML directly
- ad hoc undo/redo based on HTML snapshots

### New modules to add

- `src/core/collaboration/`
- `src/core/document-model/`
- `src/components/prosemirror/`
- `src/hooks/use-automerge-repo.ts`
- `src/hooks/use-collaborative-document.ts`
- `src/utils/html/structured-to-html.ts`
- `src/utils/html/html-to-structured.ts`

## Risks

### Risk 1: `automerge-prosemirror` is still not a final stable platform

The Automerge ProseMirror bindings currently describe themselves as beta-quality software. That does not mean "do not use", but it does mean this migration should start behind an adapter boundary so this repository is not tightly coupled to one unstable integration surface.

### Risk 2: feature parity gap during migration

The current editor already supports images, tables, variables, fullscreen, and custom toolbar behavior. A naive rewrite will regress these.

Mitigation:

- reintroduce capabilities in ordered phases
- keep the current editor available behind a feature flag during migration

### Risk 3: dual-model complexity

For some time you may have:

- canonical structured state
- derived HTML snapshots
- sidecar comments/review state

Mitigation:

- define ownership clearly
- treat HTML as derived only
- keep comments/review records out of HTML whenever possible

## Best first implementation step

If this repo is committing to Automerge, the next concrete coding step should not be "add sync to the current editor".

It should be:

1. add a collaboration/document-model adapter interface
2. scaffold a ProseMirror-based experimental editor path
3. create a docs-only local-first prototype using Automerge + IndexedDB + BroadcastChannel
4. prove multi-tab editing and reload persistence
5. keep HTML output compatibility for the renderer

That sequence de-risks the migration before comments, track changes, or remote sync are added.
