---
name: simple-editor-extension-architect
description: Guides implementation of this repository as a simple ProseMirror editor core with optional extensions such as local-first persistence, comments, collaboration, tracked changes, and AI writing.
---

# Simple Editor Extension Architect

## Repository state

- Editor core: ProseMirror, no Tiptap
- Main field entry: `src/lib/components/rich-text-editor-field.tsx`
- Structured editor shell: `src/lib/components/prosemirror/structured-editor.tsx`
- Output contract: sanitized HTML string
- Extension seam: `src/lib/core/editor-extension.ts`
- Extension implementations: `src/lib/extensions/`
- Public library entry: `src/lib/index.ts`

## Model

Treat the repository as three layers:

1. editor core
2. field/session layer
3. optional extensions

Do not push optional capabilities into `StructuredEditor` unless they are truly editor-runtime behavior.

## Put work in the right place

### Core editor

- `EditorView` mount/lifecycle
- extension composition
- schema assembly
- parse/serialize/sanitize boundaries
- extension API registry

### Field/session layer

- current draft
- saved content
- unsaved-change state
- session metadata
- compatibility shims during migration
- extension array plumbing

### Extensions

- default formatting
- lists
- tables
- images
- local-first persistence
- collaboration providers
- comments
- tracked changes
- AI writing

## Extension contract

`EditorExtension` can:

- add feature flags
- configure session persistence
- provide an initial value
- react to local document changes
- contribute schema parts
- contribute plugins and keymaps
- contribute node views
- contribute toolbar items
- contribute overlay or panel UI
- expose host-facing commands or state API

Start with the extension seam before changing feature code.

## Public API stance

- `extensions` is the primary public editor configuration API.
- Keep `RichTextEditorField` generic.
- Feature-specific options belong in extension factories such as:
  - `createImageExtension({ onUpload })`
  - `createTablesExtension({ resizableColumns: true })`
  - `createLocalFirstExtension({ documentId, enabled: true })`
- Preserve legacy props only as temporary compatibility shims.
- Default tools should also be implemented as extensions behind a curated preset such as `createDefaultEditorExtensions()`.

## Image Extension History

- The `images` extension owns the image node, node view, and toolbar UI.
- Image insertion now uses one combined popover with `Upload` and `Link` modes.
- Direct link insertion validates `http:` and `https:` URLs before inserting.
- The upload path still accepts a host-owned `onUpload(file)` callback; the editor stays transport-agnostic.
- Resize affordance is intentionally obvious in the node view so users can discover it without guessing.
- Host-facing image actions were considered, but a generic extension registry is the right next step before exposing them.

## Composition rules

- A feature is not optional unless its schema/plugins/UI are all removed when the extension is absent.
- Do not hide a toolbar button while leaving its capability active in the editor.
- Registration order may break ties, but toolbar placement should prefer extension metadata such as group/priority.
- Extension dependencies must be explicit and validated during setup.
- Treat the extension list as construction-time configuration. Rebuilding the schema requires a new editor instance.

## Local-first rule

Local-first should stay behind `createLocalFirstExtension({ documentId })`.

That keeps the editor:

- storage-agnostic
- easier to replace later
- easier to extend with AI or collaboration

## AI writing rule

AI should be an extension later.

- AI proposes suggestions, not silent edits
- user must accept or reject changes
- AI state should stay outside sanitized HTML when possible

## HTML boundary

- All inbound and outbound HTML still flows through `sanitizeRichTextContent`.
- Extensions may contribute schema and conversion rules, but they do not own the final sanitize boundary.
- Non-document extension state should stay outside the sanitized HTML string.
- Unsupported extension content should fail soft with an explicit fallback strategy.

## Decision order

1. Can this stay in ProseMirror core?
2. If not, can it be an `EditorExtension`?
3. If it is an extension, can it own its schema/plugins/UI/API as one capability area?
4. If not, does it require sidecar/backend design?
