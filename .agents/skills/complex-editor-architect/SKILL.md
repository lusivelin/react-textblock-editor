---
name: complex-editor-architect
description: Designs and guides implementation of sophisticated collaborative editors with real-time sync, offline support, commenting, track changes, import/export, AI editing workflows, and RAG over document corpora. Use when the user wants to plan, build, extend, or review an editor similar to Google Docs or Notion, especially inside this repository's HTML-string editor constraints.
---

# Complex Editor Architect

## Quick start

Use this skill when the request involves a serious document editor, not just local formatting controls.

Start by classifying the ask:

- Extend the current standalone HTML editor incrementally
- Design a larger system around the current editor
- Review an existing editor architecture for gaps

Assume this repository's current product contract still matters unless the user explicitly replaces it:

- The editor persists a single HTML string
- The renderer consumes saved HTML
- New markup must remain sanitizable

## Working rules

- Treat collaboration, comments, track changes, AI features, and RAG as separate capabilities with explicit boundaries.
- Do not collapse everything into `rich-text-editor.tsx`; prefer hooks, plugins, service adapters, and transport boundaries.
- Preserve caret stability and avoid unnecessary `innerHTML` resets when proposing frontend changes.
- Distinguish clearly between:
  - local editor state
  - shared collaboration state
  - persisted document state
  - derived AI or search indexes
- If a capability conflicts with the current HTML-string storage model, call that out and propose an adapter or migration path.

## Workflow

1. Define the target outcome.
   - Identify users, roles, document scale, collaboration latency, offline expectations, and compliance constraints.
   - Separate MVP requirements from later enterprise requirements.

2. Choose the editor evolution path.
   - For this repo, prefer layered evolution: editor shell, collaboration adapter, comments layer, change-tracking layer, import/export services, AI services, indexing services.
   - Only recommend a full document-model rewrite if the requested behavior cannot be defended with the current storage contract.

3. Design the capability slices.
   - Real-time collaboration: presence, cursors, conflict resolution, reconciliation, reconnect behavior.
   - Offline: local cache, mutation queue, retry rules, merge policy.
   - Role-based comments: permissions, anchors, resolution, mentions, audit trail.
   - Track changes and redlining: insertion/deletion marks, author attribution, accept/reject semantics, printable diff views.
   - Import/export: DOCX, Markdown, HTML, PDF handoff boundaries, lossy conversions called out explicitly.
   - AI operations: rewrite, summarize, classify, transform, structured suggestions, approval flow.
   - RAG: chunking, embeddings, metadata filters, permissions-aware retrieval, citation model.

4. Produce concrete outputs.
   - Architecture diagram in prose
   - Data model outline
   - API or event contract sketch
   - Phased delivery plan
   - Verification and risk list

## Deliverable checklist

- State whether the current HTML storage contract remains intact
- Name the collaboration model and merge strategy
- Define how comments and tracked changes are anchored
- Define offline persistence and replay behavior
- Define import/export trust boundaries and sanitization checkpoints
- Define AI approval boundaries and audit logging
- Define permissions-aware RAG indexing and retrieval
- Call out the highest-risk migrations first

## Reference

Use [REFERENCE.md](REFERENCE.md) for default architecture patterns, data shapes, and phased rollout guidance.
