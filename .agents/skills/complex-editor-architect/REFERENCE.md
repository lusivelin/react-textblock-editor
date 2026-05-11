# Complex Editor Reference

## Default stance for this repository

This repository is currently a standalone editor that stores one sanitized HTML string. For complex-editor requests, the default recommendation is to keep that contract at the package edge and add richer internal services around it instead of immediately replacing the storage model.

When the request truly needs operational transforms or CRDT-native semantics at character granularity, propose a dual-model design:

- authoritative collaboration model for live editing
- exported HTML snapshot for renderer compatibility and existing consumers

That preserves backward compatibility while allowing the system to evolve.

## Recommended system decomposition

### Frontend package

- Core editor surface: formatting, selection, composition, tables, media, embeds
- Collaboration adapter: document session, remote cursor rendering, presence state, conflict events
- Comments adapter: thread anchors, role checks, resolve/reopen flows
- Change-tracking adapter: suggestion overlays, author badges, accept/reject controls
- Offline adapter: local snapshot cache, pending mutation log, reconnect flush
- AI adapter: explicit user-invoked actions and suggestion application flows

### Backend services

- Document service: document metadata, versions, snapshots, publish state
- Collaboration service: room membership, presence, sync transport, replay window
- Comment service: threads, participants, mentions, permissions, audit history
- Change service: suggestions, redlines, accept/reject events, reviewer attribution
- Conversion service: DOCX/Markdown import-export pipelines with validation
- AI service: prompt orchestration, policy checks, result storage, audit trail
- Indexing service: chunk extraction, embeddings, vector store writes, reindex jobs
- Retrieval service: permissions-aware semantic and lexical search across documents

## Document model options

### Option A: HTML-first incremental evolution

Use when:

- compatibility with current repo contract is primary
- collaboration needs are moderate
- track changes can be stored as annotated markup plus sidecar metadata

Pattern:

- keep sanitized HTML as persisted document body
- store comments, suggestions, and import/export metadata in side tables
- use versioned snapshots for history and recovery

Tradeoff:

- simpler migration path
- weaker semantics for very granular concurrent editing

### Option B: Canonical structured model plus HTML projection

Use when:

- collaboration is central
- acceptance/rejection of changes must be precise
- import/export fidelity matters

Pattern:

- keep canonical structured document state for editing and syncing
- generate sanitized HTML snapshots for read/render compatibility
- persist change marks and comment anchors against stable node or span ids

Tradeoff:

- higher implementation complexity
- much stronger collaboration and review behavior

## Collaboration model

Default recommendation:

- Use a CRDT or OT-backed shared document model for live sessions
- Persist periodic durable snapshots plus incremental operations
- Treat presence as ephemeral and document mutations as durable

Minimum design points:

- stable document/session ids
- per-user presence state
- reconnect with missed-op replay
- server-side authorization on every room join and mutation stream
- snapshot compaction for long-lived documents

## Offline support

Recommended shape:

- cache the last accepted document snapshot locally
- append user mutations to a local durable queue
- replay mutations on reconnect after auth refresh
- surface conflicts that cannot be merged automatically

Guardrails:

- queue entries must be idempotent or deduplicatable
- do not run irreversible AI transforms automatically while offline
- expose sync status and failure state in the UI

## Comments and role-based review

Represent comments as threads separate from the document body.

Each thread should contain:

- thread id
- anchor reference
- quoted context for recovery
- author and timestamps
- status: open, resolved, reopened
- visibility policy or role requirement

Anchor strategy:

- stable node/span ids when available
- textual quote plus offset fallback
- reattachment logic after edits

## Track changes and redlining

Treat tracked changes as first-class review entities, not just styled markup.

Each suggestion should capture:

- operation type: insert, delete, replace, format, block move
- author
- created at
- anchor/range
- before/after payload
- status: pending, accepted, rejected

Redline views can then be derived for:

- inline collaborative review
- print/export review output
- per-author or per-date filtering

## Import and export

Define import/export as boundary services rather than editor-core logic.

Import pipeline:

1. parse source format
2. map to canonical model or safe intermediate HTML
3. sanitize
4. normalize unsupported constructs
5. produce warnings for lossy conversions

Export pipeline:

1. load canonical state or sanitized HTML snapshot
2. map to target format
3. preserve supported comments/change marks where possible
4. emit fidelity warnings if necessary

Always document which features are lossy for:

- DOCX comments
- tracked changes
- tables
- nested layouts
- embeds
- custom blocks

## AI operations

AI features should be opt-in, inspectable, and auditable.

Recommended operations:

- rewrite selected text
- summarize selection or document
- generate title or outline
- transform tone or reading level
- extract action items
- classify or tag document content

Rules:

- AI should return suggestions, not silent document mutations
- user accepts or rejects proposed changes
- prompts and outputs should be logged according to privacy policy
- sensitive documents may require model routing or redaction

## RAG across all documents

RAG should index document-derived chunks, not raw unsanitized editor state.

Pipeline:

1. choose indexable document versions
2. extract text and structural metadata
3. chunk by headings, blocks, or semantic boundaries
4. embed chunks
5. store metadata for tenant, project, roles, tags, timestamps, and source anchors
6. retrieve with permissions filtering before ranking and answer generation

Minimum metadata per chunk:

- document id
- version id
- tenant/workspace id
- permissions scope
- heading/path context
- source anchor for citation jump-back

RAG constraints:

- retrieval must enforce document permissions before generation
- citations should link to document and anchor
- reindex jobs must handle imports, edits, deletes, and permission changes

## Suggested phased rollout

### Phase 1

- strengthen current editor plugin boundaries
- add versioned snapshots
- add comment sidecar model
- add Markdown import/export

### Phase 2

- add live collaboration transport and presence
- add offline cache and mutation queue
- add role-based comment permissions

### Phase 3

- add first-class tracked changes and redline views
- add DOCX conversion pipeline
- add AI suggestion actions with audit logging

### Phase 4

- add corpus indexing and permissions-aware RAG
- add workspace search, citations, and answer grounding

## Questions this skill should force early

- Is the current HTML-string persistence contract mandatory long term?
- What is the maximum number of simultaneous editors per document?
- Must tracked changes round-trip to DOCX?
- Are comments and suggestions tenant-private, role-scoped, or share-link visible?
- What offline guarantees are required: draft-only, full edit, or full collaboration?
- Are AI outputs advisory only, or can they perform batch operations with approval?
- Must RAG respect per-document and per-section permissions?
