# Overview

This repository isolates the editor from the original application so it can be:

- tested from a simple homepage
- versioned independently
- published to npm
- consumed by any React application

The library exports the editor field, raw editor, renderer, sanitization helpers, and low-level editor utilities.

## Frontend contract

The package is intentionally opinionated about the baseline document flow:

- edit locally in React
- save one sanitized HTML string
- render that same saved value on reader surfaces

Most consumers should start with `RichTextEditorField`, not the lower-level editor shell. The field wrapper handles:

- local draft buffering
- explicit save and discard boundaries
- optional persisted browser drafts
- session metadata for frontend state inspection

`RichTextRenderer` is the read-side companion. It accepts the saved HTML string, sanitizes it again defensively, and removes editor-only DOM artifacts before rendering.

## Frontend seams already available

The current package already exposes boundaries for larger editor capabilities without changing the core storage contract:

- `featureFlags` for offline, comments, tracked changes, collaboration, and AI
- `onSessionStateChange` for observing document session state outside the editor DOM
- `editorMode="structured"` plus `documentModelAdapter` for docs-only or experimental structured editor mounting

These are seams, not promises that the full capability is implemented end-to-end yet. The current production contract remains a single saved HTML string.

## Use Cases

This repository can support three broad editor tiers, depending on how far the package evolves.

### A simple editor

A traditional WYSIWYG single-user rich text editor with a basic command bar at the top, various standard elements like text, lists, tables, and images for basic content creation. No version history, AI, or multi-user features, just a JavaScript package to install into frontend source code.

### A medium editor

An advanced content editor with a modern editing UI, including slash command menus, drag-and-drop content blocks, real-time collaboration, commenting, and webhooks and APIs for further processing of editor content outside the editor.

### A complex editor

A sophisticated editor interface similar to Google Docs or Notion, with real-time collaboration, offline support, role-based commenting, granular track changes, redlining, import and export of file formats like MS Word or Markdown, AI operations on editor content, and Retrieval-Augmented Generation (RAG) capabilities across all editor documents in the database.
