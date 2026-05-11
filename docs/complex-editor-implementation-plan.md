# Complex Editor Implementation Plan

## Goal

Evolve this package from a standalone HTML-string rich text editor into a platform-ready editor surface that can support:

- real-time collaboration
- offline editing and replay
- role-based comments
- granular track changes and redlining
- import/export for Markdown and DOCX
- AI-assisted editing operations
- permissions-aware RAG across all documents

This plan assumes the current package contract remains valid at the package boundary:

- the editor still exposes a saved HTML string
- the renderer still consumes saved HTML
- all persisted markup still passes sanitization

## Current state

The repository already has a few useful seams:

- [`src/components/rich-text-editor.tsx`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/components/rich-text-editor.tsx): monolithic editor shell with many behaviors already pushed into hooks
- [`src/components/rich-text-editor-field.tsx`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/components/rich-text-editor-field.tsx): buffered save/discard wrapper that is the natural host boundary for collaboration state and draft lifecycle
- [`src/hooks/use-buffered-rich-text.ts`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/hooks/use-buffered-rich-text.ts): current local draft buffer
- [`src/hooks/use-editor-history.ts`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/hooks/use-editor-history.ts): local undo/redo snapshots
- [`src/core/plugin-registry.ts`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/core/plugin-registry.ts): minimal plugin registry that can become the extension point for complex editor capabilities
- [`src/plugins/index.ts`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/plugins/index.ts): currently empty default plugin list
- [`src/utils/sanitize-rich-text.ts`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/utils/sanitize-rich-text.ts): current sanitization gate
- [`src/demo/app.tsx`](/home/lusivelin/code/new-rave/rave-rich-text-editor/src/demo/app.tsx): manual test surface that should grow alongside new capabilities

## Architecture stance

Do not attempt to add collaboration, comments, tracking, AI, and RAG directly inside `rich-text-editor.tsx`.

Instead, move toward five explicit layers:

1. Editor core
2. Review overlays
3. Collaboration transport
4. Document conversion and AI services
5. Search and retrieval indexing

The recommended medium-term architecture is:

- keep saved HTML as the public output of this package
- add sidecar metadata for comments, change suggestions, and document versions
- introduce a canonical live-edit model only when concurrent editing and review semantics exceed what HTML-first persistence can safely represent

## Capability map

### 1. Plugin and extension foundation

Purpose:
Create explicit feature boundaries before adding product complexity.

Changes:

- expand `EditorPlugin` to support:
  - lifecycle hooks
  - commands
  - decorations or overlays
  - sidebar or panel contributions
  - serialization hooks
- move toolbar construction further behind the registry
- add editor feature flags at the field level so consumers can opt into comments, track changes, AI, and collaboration separately

Likely files:

- `src/core/plugin-registry.ts`
- `src/plugins/index.ts`
- `src/components/rich-text-editor.tsx`
- `src/components/toolbar/toolbar.tsx`

Why first:

- the current plugin registry is almost empty
- every later capability needs a safe way to attach UI and behavior without further enlarging the shell

### 2. Document session and version model

Purpose:
Separate local editing from persisted document state and collaborative session state.

Changes:

- introduce a document session adapter contract
- separate:
  - current visible content
  - last saved snapshot
  - pending local mutations
  - version metadata
  - remote session presence
- replace the simple local draft buffer with a richer session model

Suggested interfaces:

- `DocumentSnapshot`
- `DocumentVersion`
- `DocumentSessionState`
- `PendingMutation`
- `PresenceState`

Likely files:

- new `src/core/document-session.ts`
- new `src/hooks/use-document-session.ts`
- `src/hooks/use-buffered-rich-text.ts`
- `src/components/rich-text-editor-field.tsx`

Key rule:

- `RichTextEditor` should remain focused on editing behavior
- session orchestration should live outside the core shell

### 3. Collaboration adapter

Purpose:
Support presence, remote edits, reconnect behavior, and conflict handling.

Changes:

- add a transport-agnostic collaboration adapter interface
- support:
  - join/leave session
  - subscribe to remote operations
  - publish local operations
  - receive presence updates
  - replay missed updates on reconnect
- expose collaboration state in the field wrapper, not the renderer

Likely files:

- new `src/core/collaboration.ts`
- new `src/hooks/use-collaboration-session.ts`
- new `src/components/overlays/remote-cursors.tsx`
- `src/components/rich-text-editor-field.tsx`

Important constraint:

- the current undo/redo stack in `use-editor-history.ts` is local-only
- it should remain local until a shared operational model exists
- do not pretend snapshot-based undo is collaboration-safe

### 4. Offline support

Purpose:
Allow draft continuity across reloads and network failures.

Changes:

- add local snapshot persistence
- add a durable mutation queue
- expose sync state in the field wrapper and docs demo
- define replay semantics for reconnect

Likely files:

- new `src/core/offline-store.ts`
- new `src/hooks/use-offline-document-cache.ts`
- new `src/hooks/use-pending-mutation-queue.ts`
- `src/components/rich-text-editor-field.tsx`
- `src/demo/app.tsx`

Recommended behavior:

- cache the last accepted snapshot plus unsynced local mutations
- restore safely on reload
- surface conflict or replay failure explicitly

### 5. Role-based comments

Purpose:
Add anchored discussion threads without mixing comment state into the saved HTML body.

Changes:

- comments should live in sidecar metadata, not inline markup as the source of truth
- add anchor references with fallback quote-based reattachment
- add visibility and resolution states
- add role checks before thread creation, viewing, or resolution

Suggested data:

- `CommentThread`
- `CommentAnchor`
- `CommentEntry`
- `CommentVisibilityPolicy`

Likely files:

- new `src/core/comments.ts`
- new `src/hooks/use-comment-threads.ts`
- new `src/components/comments/comments-sidebar.tsx`
- new `src/components/comments/comment-anchor-overlay.tsx`
- `src/components/rich-text-editor.tsx`

Sanitization rule:

- comment metadata should not depend on storing privileged UI state in sanitized HTML

### 6. Track changes and redlining

Purpose:
Support review workflows with author attribution and accept/reject semantics.

Changes:

- model suggestions as first-class review records
- support insert, delete, replace, formatting, and block-level changes
- provide inline suggestion rendering and a review panel
- derive redline export views from suggestion data

Likely files:

- new `src/core/tracked-changes.ts`
- new `src/hooks/use-tracked-changes.ts`
- new `src/components/review/review-sidebar.tsx`
- new `src/components/review/redline-overlay.tsx`
- `src/utils/sanitize-rich-text.ts`

Critical warning:

- HTML-first persistence becomes fragile here
- if suggestion anchoring and accept/reject behavior become unreliable, this is the point where a canonical structured document model should be considered

### 7. Import and export pipeline

Purpose:
Support external document interoperability without polluting editor-core logic.

Changes:

- define importer and exporter interfaces
- start with Markdown
- add DOCX only after the intermediate document mapping is stable
- make all lossy conversions explicit in return values

Suggested boundaries:

- import service returns:
  - normalized content
  - warnings
  - unsupported feature report
- export service returns:
  - artifact or payload
  - warnings
  - fidelity notes

Likely files:

- new `src/core/import-export.ts`
- new `src/utils/importers/markdown.ts`
- new `src/utils/exporters/markdown.ts`
- later `src/utils/importers/docx.ts`
- later `src/utils/exporters/docx.ts`
- `src/utils/sanitize-rich-text.ts`

Security rule:

- all imported HTML-like content must be sanitized before becoming editor state

### 8. AI operations

Purpose:
Provide explicit AI-assisted transforms and review actions on document content.

Changes:

- define an AI operation adapter instead of embedding any vendor-specific logic in the editor
- treat AI output as a suggestion flow by default
- support selected-text and whole-document operations
- log prompts, outputs, and approval state outside the editor shell

Suggested operations:

- rewrite selection
- summarize selection
- generate outline
- extract action items
- convert tone or reading level

Likely files:

- new `src/core/ai-operations.ts`
- new `src/hooks/use-ai-operations.ts`
- new `src/components/ai/ai-panel.tsx`
- `src/components/action-bar.tsx`
- `src/components/rich-text-editor-field.tsx`

Repository rule:

- keep provider-specific integrations out of this package unless they are strictly adapter interfaces

### 9. RAG across document corpus

Purpose:
Enable retrieval and grounded generation across many stored documents.

Changes:

- define indexable document extraction separate from editor rendering
- generate chunkable text plus metadata from saved documents
- keep retrieval permission-aware
- preserve source anchors for citation jump-back

Suggested outputs:

- `IndexableDocument`
- `IndexableChunk`
- `ChunkMetadata`

Likely files:

- new `src/core/rag.ts`
- new `src/utils/document/extract-indexable-content.ts`
- new `src/utils/document/chunk-document.ts`

Important boundary:

- the editor package should define extraction contracts and helpers
- the actual embedding store, vector database, and retrieval orchestration should usually live in the host application or backend services

## Recommended phases

### Phase 1: Stabilize extension seams

Deliver:

- richer plugin registry
- document session abstraction
- feature flags for optional capabilities
- docs page describing the complex editor roadmap

Success criteria:

- new capabilities can attach without further monolithic growth in `rich-text-editor.tsx`

### Phase 2: Local-first document lifecycle

Deliver:

- offline snapshot cache
- mutation queue shape
- session state UI in the field wrapper
- docs playground support for simulated offline mode

Success criteria:

- page reload does not destroy unsaved local work

### Phase 3: Comments and review foundations

Deliver:

- comment thread sidecar model
- anchor overlay rendering
- role-aware review panels
- first review metadata persistence shape

Success criteria:

- comments survive edits through stable anchor recovery

### Phase 4: Collaboration

Deliver:

- collaboration adapter contract
- presence rendering
- remote operation flow
- reconnect and replay handling

Success criteria:

- multiple editors can join one session without forced full-HTML resets

### Phase 5: Track changes

Deliver:

- suggestion model
- accept/reject flows
- redline overlay and review panel

Success criteria:

- reviewers can audit and apply changes without losing authorship metadata

### Phase 6: Import/export and AI

Deliver:

- Markdown import/export
- DOCX integration path
- AI suggestion actions and approval flows

Success criteria:

- transformations remain explicit, inspectable, and sanitization-safe

### Phase 7: RAG

Deliver:

- document extraction helpers
- chunking rules
- permissions-aware retrieval contract
- citation anchor model

Success criteria:

- generated answers can cite document locations and respect document visibility rules

## Main risks

### Risk 1: HTML-string persistence is too weak for granular collaboration

Mitigation:

- treat HTML as the package edge contract first
- be ready to introduce a canonical internal document model with HTML projection if collaboration and review semantics require it

### Risk 2: caret stability regresses under remote updates

Mitigation:

- avoid replacing `innerHTML` on collaborative updates
- move toward operation-based or range-based patch application

### Risk 3: sanitization strips required metadata

Mitigation:

- keep sensitive collaboration and review state in sidecar records
- only persist safe anchor or marker data in HTML when strictly necessary

### Risk 4: docs demo stops being a trustworthy manual test surface

Mitigation:

- grow `src/demo/app.tsx` into a scenario-based test harness for offline, comments, review, and AI flows

## Concrete first implementation batch

Start with a narrow batch that improves the architecture without committing to a backend:

1. Expand `EditorPlugin` and wire actual plugin-based toolbar contributions.
2. Introduce `useDocumentSession` and move buffered save/discard state behind it.
3. Add feature flags for `comments`, `trackedChanges`, `collaboration`, `offline`, and `ai`.
4. Add local persistence for unsaved drafts in the field wrapper.
5. Extend the docs demo with a session status panel and offline simulation controls.

That batch keeps the repo shippable while creating the seams required for all later capabilities.

## Verification strategy

For architecture-only planning work, no build changes are required yet.

When Phase 1 implementation starts, verify with:

```bash
pnpm typecheck
pnpm build:lib
pnpm build:docs
```

Manual checks to add to the docs playground:

- editing still preserves caret stability
- toggling optional features does not break plain HTML editing
- reload restores local drafts when offline mode is enabled
- sanitization still removes unsafe imported content
