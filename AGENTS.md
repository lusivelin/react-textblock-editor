# Rave Rich Text Editor — Agent Guide

ProseMirror-based structured document editor. Output is always a sanitized HTML string.

## Repository layout

```text
src/
  lib/          # publishable library
    extensions/ # one folder per extension, plus shared extension helpers
  demo/         # docs/playground site
.agents/
  SKILL.md      # extension-first architecture guidance
docs/           # product and implementation notes
```

## Core rules

- ProseMirror only. No contentEditable, no Tiptap.
- Keep `StructuredEditor` focused on `EditorView` lifecycle.
- Add editor-surface behavior as ProseMirror plugins.
- Add optional product capabilities as extensions, not hard-wired editor props.
- Never destroy and recreate `EditorView` on normal prop changes.
- All HTML entering or leaving the editor must pass through `sanitizeRichTextContent`.
- `prosemirror-history` owns undo/redo. Do not mix it with `yUndoPlugin`.
- Treat the `extensions` array as construction-time editor configuration.
- Do not fake optional tools by hiding toolbar buttons while keeping schema/plugins active.

## Architecture stance

- `src/lib/` is the library consumers install.
- `src/demo/` is only the local/docs site.
- Treat local-first persistence as an extension, not core editor behavior.
- Future AI writing should also be an extension, not a hard-wired core dependency.
- Keep `RichTextEditorField` generic. Feature-specific APIs belong in extension factories.
- The demo must consume the same public extension API as real users.

## Extension stance

- Core owns editor runtime only:
  - `EditorView` lifecycle
  - extension composition
  - schema assembly
  - sanitize/parse/serialize boundaries
  - extension API registry
- Built-in tools should also use the extension system:
  - default formatting
  - lists
  - tables
  - images
  - local-first
- A real extension owns its full capability area:
  - schema parts
  - plugins
  - keymaps
  - node views
  - toolbar items
  - sidecar UI such as floating toolbars or panels
  - host-facing commands or state API
- Prefer extension factories such as `createTablesExtension(...)` over boolean feature props.
- Keep one curated preset such as `createDefaultEditorExtensions()`, but make explicit composition the primary API.

## Image Extension History

- Image handling moved out of the toolbar monolith and into the `images` extension.
- The insert UI now uses one popover with `Upload` and `Link` modes instead of separate toolbar actions.
- URL insertion is validated and inserts immediately when the link is valid.
- Upload remains host-owned through `onUpload(file)` for now; the editor does not know about the transport layer.
- The resize handle was made visually obvious in the node view with a larger control, selection frame, and hint text.
- A host-facing image registry/API was discussed but is still deferred until the generic extension registry exists.

## Content contract

- Sanitized HTML is still the only document exchange format.
- Extensions may contribute schema and HTML conversion rules, but they must not bypass `sanitizeRichTextContent`.
- Non-document feature state should stay outside the HTML string in extension-managed sidecar/session state.
- Unsupported extension content must fail soft with a documented fallback path.

## Verification

```bash
pnpm typecheck
pnpm build:lib
pnpm build:docs
```

## Specialized guidance

See `.agents/SKILL.md` when the task is about extension design, local-first behavior, AI writing, comments, collaboration, or tracked changes.
