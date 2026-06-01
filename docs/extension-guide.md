# Extension Building Guide

react-textblock-editor is built around a capability extension system. Every optional feature — formatting, tables, images, source editing — is an extension. Your custom logic can be one too.

## The extension contract

An extension is a plain object that implements `EditorExtension`:

```ts
import type { EditorExtension } from "react-textblock-editor";

const myExtension: EditorExtension = {
  id: "my-extension",        // must be unique across all extensions
  dependsOn: [],             // IDs of extensions that must be present

  // --- document lifecycle ---
  getInitialValue(ctx) {},   // return HTML string to seed the editor
  onLocalChange(html, ctx) {},// called on every keystroke

  // --- editor runtime ---
  getSchema() {},            // contribute NodeSpec / MarkSpec
  getPlugins(ctx) {},        // ProseMirror plugins
  getKeymap(ctx) {},         // keyboard shortcuts
  getNodeViews(ctx) {},      // custom node renderers

  // --- UI ---
  getToolbarItems(ctx) {},   // toolbar buttons
  getOverlays(ctx) {},       // floating panels or sidecar UI

  // --- metadata ---
  getFeatureFlags(ctx) {},   // signal capabilities to the host app
  getSessionPersistence(ctx) {}, // configure sessionStorage draft key

  // --- host API ---
  getApi() {},               // imperative API exposed to the host app
};
```

All methods are optional. Implement only what your extension needs.

## Contexts

Most methods receive a context object:

```ts
interface EditorExtensionContext {
  documentId: string;
  featureFlags: ResolvedEditorFeatureFlags;
}
```

Methods that run after schema assembly receive `EditorExtensionRuntimeContext`, which adds `schema`.

## Minimal example — autosave extension

```ts
import type { EditorExtension } from "react-textblock-editor";

export function createAutosaveExtension(save: (html: string) => Promise<void>): EditorExtension {
  return {
    id: "autosave",
    onLocalChange: async (html) => {
      await save(html);
    },
  };
}
```

Usage:

```tsx
<RichTextEditorField
  value={html}
  documentId="article:1"
  extensions={[createAutosaveExtension(myApi.save)]}
/>
```

## Adding toolbar items

```ts
import type { EditorExtension, EditorToolbarItem } from "react-textblock-editor";

export function createWordCountExtension(): EditorExtension {
  return {
    id: "word-count",
    getToolbarItems(): EditorToolbarItem[] {
      return [
        {
          id: "word-count-display",
          group: "view",
          priority: 10,
          render({ state }) {
            const text = state.doc.textContent;
            const words = text.trim() ? text.trim().split(/\s+/).length : 0;
            return <span className="toolbar-meta">{words} words</span>;
          },
        },
      ];
    },
  };
}
```

`group` controls placement in the toolbar (`"history"`, `"inline"`, `"block"`, `"insert"`, `"view"`, or any custom string). `priority` breaks ties within a group — lower numbers appear first.

## Adding ProseMirror schema

```ts
import type { EditorExtension, EditorSchemaSpec } from "react-textblock-editor";
import type { NodeSpec } from "prosemirror-model";

const calloutNode: NodeSpec = {
  group: "block",
  content: "inline*",
  attrs: { kind: { default: "info" } },
  parseDOM: [{ tag: "div[data-callout]", getAttrs: (dom) => ({ kind: (dom as HTMLElement).dataset.calloutKind }) }],
  toDOM(node) {
    return ["div", { "data-callout": "", "data-callout-kind": node.attrs.kind }, 0];
  },
};

export function createCalloutsExtension(): EditorExtension {
  return {
    id: "callouts",
    getSchema(): EditorSchemaSpec {
      return {
        nodes: { callout: calloutNode },
      };
    },
    getPlugins() {
      return []; // add input rules, keymaps, etc. here
    },
    getToolbarItems(ctx) {
      return [
        {
          id: "insert-callout",
          group: "insert",
          render({ view, schema }) {
            return (
              <button onClick={() => insertCallout(view, schema)}>
                Callout
              </button>
            );
          },
        },
      ];
    },
  };
}
```

## Declaring dependencies

If your extension requires another to be present, declare it explicitly:

```ts
export function createCommentsExtension(): EditorExtension {
  return {
    id: "comments",
    dependsOn: ["tables"], // throws at init if missing
    // ...
  };
}
```

The editor validates all `dependsOn` IDs before mounting. Missing dependencies throw a clear error.

## Exposing a host-facing API

```ts
interface SpellcheckApi {
  checkDocument(): Promise<string[]>;
}

let spellcheckApi: SpellcheckApi | null = null;

export function createSpellcheckExtension(): EditorExtension {
  spellcheckApi = {
    async checkDocument() {
      // ...
      return [];
    },
  };

  return {
    id: "spellcheck",
    getApi() {
      return spellcheckApi;
    },
  };
}
```

The host app can call `getApi()` on the extension instance after mounting.

## Conditional extensions

Use `composeExtensions` to conditionally include extensions:

```ts
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createImageExtension,
} from "react-textblock-editor";

const extensions = composeExtensions(
  ...createDefaultEditorExtensions(),
  isImagesEnabled && createImageExtension({ onUpload }),
  isAiEnabled     && createAiExtension({ documentId }),  // future
);
```

`composeExtensions` filters out `false`, `null`, and `undefined` — no conditional branches needed at the call site.

## Extension composition rules

- **Own your capability area** — schema, plugins, toolbar UI, and host API should live in one extension folder, not spread across the codebase.
- **Don't fake optional features** — if the toolbar button is hidden, the schema/plugins should also be absent. Use `composeExtensions` to exclude the extension entirely.
- **Extension list is construction-time** — the schema is assembled once. Adding or removing extensions requires remounting the editor (new `documentId` or key change).
- **HTML boundary** — extensions may contribute schema and HTML conversion rules, but all output still flows through `sanitizeRichTextContent`.

## Extension folder layout

```
src/lib/extensions/my-extension/
  index.ts        # factory function + public types
  plugin.ts       # ProseMirror plugin(s)
  toolbar.tsx     # toolbar item component(s)
  node-view.ts    # custom node view (if any)
  schema.ts       # NodeSpec / MarkSpec (if any)
```

Export only through `index.ts`. Keep internal modules private to the folder.

## Planned future extensions

The following are on the roadmap and follow the same extension pattern:

| Extension | Status | Notes |
|-----------|--------|-------|
| AI writing | Planned | Proposes suggestions; user must accept/reject. AI state stays outside sanitized HTML. |
| Comments | Planned | Inline anchored comments with sidecar panel. |
| Collaboration | Planned | WebSocket/CRDT provider — swappable transport. |
| Tracked changes | Planned | Accept/reject UI over the extension system. |

If you're building one of these, open an issue first to coordinate.
