# Automerge Local-First

## Status: implemented

Single-user local-first persistence is live via `@automerge/automerge` + localStorage.

## How it works

- Storage key: `rave-rte:am:<documentId>` in localStorage
- Format: Automerge binary (base64-encoded), wrapping `{ html: string }`
- On mount: stored version loads and overrides `value` prop
- On every keystroke: saves to localStorage via `amSave`
- On page reload: restores last content without a server round-trip

## Enable

```tsx
<RichTextEditorField
  persistence={{ kind: "automerge", documentId: "article:home" }}
  featureFlags={{ offline: true }}
/>
```

## Extending to multi-user sync

1. Add `@automerge/automerge-repo` for document management
2. Add an IndexedDB storage adapter for larger documents
3. Add a WebSocket sync adapter (`automerge-repo-network-websocket`) pointing at a sync server
4. Surface sync status via the existing `featureFlags.offline` seam

The PM editor does not need to change — Automerge Repo manages the document.

## Limits

- localStorage cap: ~5–10 MB per origin. Switch to IndexedDB adapter for large documents.
- No cross-tab sync in the current implementation.
- No server sync out of the box.
