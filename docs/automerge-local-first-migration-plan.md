# Automerge Local-First

## Status: implemented

Single-user local-first persistence is live via `@automerge/automerge` with pluggable browser storage.

## How it works

- Default backend: `IndexedDB`
- Optional simple backend: `localStorage`
- Format: Automerge document wrapping `{ html: string }`
- Entry point: `createLocalFirstExtension({ documentId })`
- On initial load: the extension can hydrate editor content from browser-local storage
- On local edits: the extension writes the latest HTML back into Automerge/localStorage
- On page reload: the editor can restore the last local content without a server round-trip
- On explicit save: your application still decides what becomes canonical server-saved HTML

## Enable

```tsx
<RichTextEditorField
  documentId="article:home"
  extensions={[
    createLocalFirstExtension({ documentId: "article:home" }),
  ]}
/>
```

To force the simple `localStorage` backend:

```tsx
const extension = createLocalFirstExtension({
  documentId: "article:home",
  storage: createLocalStorageLocalFirstStorage(),
});
```

## Mental model

- `value` is your app-controlled saved HTML
- local-first is a resilience layer around the active editing session
- the local-first backend is browser-local only in the current implementation
- this is not multi-user sync and not server replication

The goal is:

1. keep editing responsive
2. survive reloads
3. reduce accidental data loss
4. still let the host app own the save API contract

## Extending to multi-user sync

1. Add `@automerge/automerge-repo` for document management
2. Add an IndexedDB storage adapter for larger documents
3. Add a WebSocket sync adapter (`automerge-repo-network-websocket`) pointing at a sync server
4. Surface sync status via the existing `featureFlags.offline` seam

The PM editor does not need to change — Automerge Repo manages the document.

## Limits

- `localStorage` cap is still small if you choose that adapter. Prefer the default `IndexedDB` backend for real local-first usage.
- No cross-tab sync in the current implementation.
- No server sync out of the box.
