"use client";

import { useMemo, useRef, useState } from "react";
import {
  composeExtensions,
  createDefaultEditorExtensions,
  createImageExtension,
  createTablesExtension,
  RichTextEditorField,
  RichTextRenderer,
} from "@lib";
import type { RichTextEditorHandle, ImageExtensionApi } from "@lib";
import type { SaveStatus } from "@lib";
import { cn } from "@lib/utils/cn";
import { sanitizeRichTextContent } from "@lib/utils/sanitize-rich-text";

type Tab = "playground" | "quick-start" | "api";

const TABS: { id: Tab; label: string }[] = [
  { id: "playground", label: "Playground" },
  { id: "quick-start", label: "Quick Start" },
  { id: "api", label: "API" },
];

const INITIAL_CONTENT = sanitizeRichTextContent(`
  <h2>Try the editor</h2>
  <p>Format text, then import image, table, and local-first capabilities as needed.</p>
  <ul>
    <li><strong>Bold</strong>, <em>italic</em>, underline, inline code</li>
    <li>Headings, bullet lists, ordered lists, blockquote</li>
    <li>Tables with column resizing and horizontal scroll</li>
    <li>Image insertion and resizing via the images extension</li>
  </ul>
`);

// ─── API reference data ──────────────────────────────────────────────────────

const EDITOR_PROP_ROWS: [string, string, string][] = [
  ["value", "string", "Server-persisted HTML. Only syncs into the editor when there are no unsaved local changes."],
  ["onChange", "(html: string) => void", "Fires on every keystroke. Wire to local React state for live preview."],
  ["onSave", "(html: string) => Promise<void>", "Called when the user saves with Ctrl+S / Cmd+S. Also shows a Save button in the status bar when unsaved changes exist."],
  ["onDiscard", "(html: string) => void | Promise<void>", "Called when the user discards unsaved changes. Shows a Discard button in the status bar alongside Save. The editor resets to the last saved value internally before calling this."],
  ["onSaveStatusChange", "(status: SaveStatus) => void", "Called when save status changes: 'idle' | 'saving' | 'saved' | 'error'."],
  ["onSessionStateChange", "(state: DocumentSessionState) => void", "Called whenever session state changes — draft content, unsaved flag, persistence key."],
  ["extensions", "EditorExtension[]", "Primary capability API. Import extensions and pass them in the order you want them composed."],
  ["persist", "boolean", "Save draft to localStorage. Cleared on successful save. Use documentId to scope the key."],
  ["documentId", "string", "Scopes the localStorage draft key when persist is true. Default: \"default\"."],
  ["placeholder", "string", "Shown when the editor is empty."],
  ["height", "number", "Min-height in px. Default: 400."],
  ["darkMode", "boolean", "Enable dark theme."],
  ["readOnly", "boolean", "Disable all editing."],
  ["lazyMount", "boolean", "Mount ProseMirror only on first click. Default: true."],
  ["emptyLabel", "string", "Trigger button label when value is empty (lazyMount mode)."],
  ["filledLabel", "string", "Trigger button label when value has content (lazyMount mode)."],
  ["classNames", "EditorClassNames", "CSS class overrides for root, toolbar, content, and actionBar."],
  ["theme", "string", "CSS string injected at runtime for per-component theming."],
];

const IMAGE_API_ROWS: [string, string, string][] = [
  ["openPicker()", "void", "Opens the combined Upload / Link popover."],
  ["insertImageFromUrl(url, attrs?)", "ImageInsertResult | null", "Inserts a validated http/https image URL immediately."],
  ["insertImageFromFile(file, attrs?)", "Promise<ImageInsertResult | null>", "Uploads a file through the host callback, then inserts it."],
  ["getMode()", "\"upload\" | \"link\"", "Returns the current remembered insert mode."],
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function CodeBlock({ lang, children }: { lang: string; children: string }) {
  return (
    <div className="docs-code-block">
      <div className="docs-code-block-header">
        <div className="docs-code-block-dots"><span /><span /><span /></div>
        <span className="docs-code-block-lang">{lang}</span>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function ApiTable({ rows, cols = 2 }: { rows: [string, string][] | [string, string, string][]; cols?: 2 | 3 }) {
  return (
    <div className="docs-api-table" role="table">
      {(rows as string[][]).map((row) => (
        <div key={row[0]} className={cn("docs-api-row", cols === 3 && "cols-3")} role="row">
          <code>{row[0]}</code>
          {cols === 3 && <span className="docs-api-type">{row[1]}</span>}
          <p>{row[cols - 1]}</p>
        </div>
      ))}
    </div>
  );
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function mockImageUpload(file: File): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 900));
  return readFileAsDataUrl(file);
}

// ─── App ─────────────────────────────────────────────────────────────────────

export function DemoApp() {
  const editorRef = useRef<RichTextEditorHandle>(null);
  const [savedContent, setSavedContent] = useState(INITIAL_CONTENT);
  const [draftContent, setDraftContent] = useState(INITIAL_CONTENT);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [persistEnabled, setPersistEnabled] = useState(false);
  const [imagesEnabled, setImagesEnabled] = useState(true);
  const [tablesEnabled, setTablesEnabled] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("playground");
  const playgroundExtensions = useMemo(
    () =>
      composeExtensions(
        ...createDefaultEditorExtensions(),
        imagesEnabled && createImageExtension({ onUpload: mockImageUpload }),
        tablesEnabled && createTablesExtension(),
      ),
    [imagesEnabled, tablesEnabled]
  );

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-logo">
          <div className="docs-logo-mark">&gt;_</div>
          <div className="docs-logo-text">
            <div className="docs-logo-name">Textblock</div>
            <div className="docs-logo-sub">editor</div>
          </div>
        </div>

        <nav className="docs-nav" aria-label="Sections">
          {TABS.map((tab) => (
            <a
              key={tab.id}
              className={cn("docs-nav-link", activeTab === tab.id && "docs-nav-link--active")}
              href={`#${tab.id}`}
              onClick={(e) => { e.preventDefault(); setActiveTab(tab.id); }}
            >
              {tab.label}
            </a>
          ))}
        </nav>

        <div className="docs-sidebar-footer">
          <div className="docs-sidebar-user">
            <div className="docs-user-avatar">&gt;_</div>
            <div className="docs-user-info">
              <div className="docs-user-name">react-textblock</div>
              <div className="docs-user-badge">v0.1.0</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="app-body">
        <div className="docs-page-header">
          <div className="docs-page-title">
            <h2>Textblock Editor</h2>
            <p>ProseMirror rich text editor for React</p>
          </div>
          <div className="docs-tabs" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                type="button"
                className={cn("docs-tab", activeTab === tab.id && "docs-tab--active")}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="docs-content">

          {/* ── Playground ─────────────────────────────────────────────────── */}
          {activeTab === "playground" && (
            <section className="demo-grid" id="playground">
              <div className="demo-panel demo-editor-panel">
                <div className="demo-panel-header">
                  <h3>Editor</h3>
                  {saveStatus !== "idle" && (
                    <span className={cn(
                      "demo-save-badge",
                      saveStatus === "saving" && "demo-save-badge--saving",
                      saveStatus === "saved" && "demo-save-badge--saved",
                      saveStatus === "error" && "demo-save-badge--error",
                    )}>
                      {saveStatus === "saving" && "Saving…"}
                      {saveStatus === "saved" && "Saved"}
                      {saveStatus === "error" && "Save failed"}
                    </span>
                  )}
                </div>

                <div className="demo-extensions-panel">
                  <div className="demo-extensions-title">Image upload</div>
                  <div className="demo-note" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="demo-save-badge demo-save-badge--saving" style={{ padding: "4px 8px" }}>
                      Mock promise
                    </span>
                    <span className="demo-extension-desc">
                      The playground upload flow waits on a mock promise and returns a data URL.
                    </span>
                  </div>
                </div>

                {/* Options panel */}
                <div className="demo-extensions-panel">
                  <div className="demo-extensions-title">Options</div>
                  <label className="demo-extension-row">
                    <div className="demo-extension-info">
                      <span className="demo-extension-name">images</span>
                      <span className="demo-extension-desc">
                        Import the image extension to get upload and resize support.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={imagesEnabled}
                      onChange={(e) => setImagesEnabled(e.target.checked)}
                    />
                  </label>
                  <label className="demo-extension-row">
                    <div className="demo-extension-info">
                      <span className="demo-extension-name">tables</span>
                      <span className="demo-extension-desc">
                        Import the tables extension to get insertion, resizing, and floating controls.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={tablesEnabled}
                      onChange={(e) => setTablesEnabled(e.target.checked)}
                    />
                  </label>
                  <label className="demo-extension-row">
                    <div className="demo-extension-info">
                      <span className="demo-extension-name">persist</span>
                      <span className="demo-extension-desc">
                        Save draft to localStorage. Clears automatically on successful save.
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={persistEnabled}
                      onChange={(e) => setPersistEnabled(e.target.checked)}
                    />
                  </label>
                </div>

                <RichTextEditorField
                  ref={editorRef}
                  value={savedContent}
                  onChange={setDraftContent}
                  onSave={async (html) => {
                    // Simulate API call (Ctrl+S / Cmd+S)
                    await new Promise((r) => setTimeout(r, 400));
                    setSavedContent(html);
                  }}
                  onDiscard={(html) => {
                    // Editor has already reset internally — sync our live preview state
                    setDraftContent(html);
                  }}
                  onSaveStatusChange={setSaveStatus}
                  persist={persistEnabled}
                  documentId="demo-playground"
                  extensions={playgroundExtensions}
                  placeholder="Start typing…"
                  height={400}
                  lazyMount={false}
                />
              </div>

              <div className="demo-side">
                <div className="demo-panel">
                  <div className="demo-panel-header">
                    <h3>Preview</h3>
                    <p>Rendered from saved HTML.</p>
                  </div>
                  <RichTextRenderer content={savedContent} />
                </div>

                <div className="demo-panel demo-code-panel">
                  <div className="demo-panel-header">
                    <h3>Live HTML</h3>
                    <p>Updates on every keystroke.</p>
                  </div>
                  <pre>{draftContent}</pre>
                </div>
              </div>
            </section>
          )}

          {/* ── Quick Start ─────────────────────────────────────────────────── */}
          {activeTab === "quick-start" && (
            <>
              <section className="demo-panel" id="install">
                <div className="demo-panel-header">
                  <h3>Install</h3>
                </div>
                <CodeBlock lang="shell">{`pnpm add react-textblock-editor`}</CodeBlock>
                <p className="docs-note">Import the stylesheet once at your app entry point.</p>
                <CodeBlock lang="ts">{`import "@linhtetpaing9/react-textblock-editor/style.css";`}</CodeBlock>
              </section>

              <section className="demo-panel" id="basic-usage">
                <div className="demo-panel-header">
                  <h3>Basic usage</h3>
                  <p>Import a default preset, then add only the capability extensions that surface needs.</p>
                </div>
                <CodeBlock lang="tsx">{`import {
  createDefaultEditorExtensions,
  createImageExtension,
  createTablesExtension,
  RichTextEditorField,
  RichTextRenderer,
} from "@linhtetpaing9/react-textblock-editor";

function ArticleEditor() {
  const [savedHtml, setSavedHtml] = useState("<p>Hello</p>");
  const extensions = [
    ...createDefaultEditorExtensions(),
    createImageExtension({ onUpload: api.uploadImage }),
    createTablesExtension(),
  ];

  return (
    <>
      <RichTextEditorField
        value={savedHtml}
        extensions={extensions}
        onSave={async (html) => {
          await api.save(html);
          setSavedHtml(html);
        }}
      />

      {/* Read-only display */}
      <RichTextRenderer content={savedHtml} />
    </>
  );
}`}</CodeBlock>
              </section>

              <section className="demo-panel" id="controlled">
                <div className="demo-panel-header">
                  <h3>Controlled + live preview</h3>
                  <p>Compose the extension list once, then use <code>onChange</code> for local preview and <code>onSave</code> for persistence.</p>
                </div>
                <CodeBlock lang="tsx">{`const extensions = [
  ...createDefaultEditorExtensions(),
  createTablesExtension(),
];

const [serverHtml, setServerHtml] = useState("<p>Hello</p>");
const [localHtml, setLocalHtml] = useState(serverHtml);

<RichTextEditorField
  extensions={extensions}
  value={serverHtml}
  onChange={setLocalHtml}
  onSave={async (html) => {
    await api.save(html);
    setServerHtml(html);
  }}
/>

<RichTextRenderer content={localHtml} />`}</CodeBlock>
              </section>

              <section className="demo-panel" id="save-status">
                <div className="demo-panel-header">
                  <h3>Save status feedback</h3>
                  <p>Wire <code>onSaveStatusChange</code> to your own status indicator, or let the built-in toolbar badge handle it.</p>
                </div>
                <CodeBlock lang="tsx">{`import type { SaveStatus } from "@linhtetpaing9/react-textblock-editor";

const [status, setStatus] = useState<SaveStatus>("idle");

<RichTextEditorField
  extensions={createDefaultEditorExtensions()}
  value={html}
  onSave={api.save}
  onSaveStatusChange={setStatus}
/>

{/* status: "idle" | "saving" | "saved" | "error" */}
<p>{status === "saving" ? "Saving…" : status === "saved" ? "All changes saved" : null}</p>`}</CodeBlock>
              </section>

              <section className="demo-panel" id="persist">
                <div className="demo-panel-header">
                  <h3>Draft persistence</h3>
                  <p>Pass <code>persist</code> to save the draft to localStorage. Clears on successful save.</p>
                </div>
                <CodeBlock lang="tsx">{`<RichTextEditorField
  value={serverHtml}
  documentId="article:home"
  persist
  onSave={async (html) => {
    await api.save(html);
    setServerHtml(html);
  }}
/>`}</CodeBlock>
                <p className="docs-note">
                  <code>documentId</code> scopes the localStorage key. Use a stable unique ID per document.
                </p>
              </section>

              <section className="demo-panel" id="explicit-save">
                <div className="demo-panel-header">
                  <h3>Explicit save button</h3>
                  <p>New code should keep persistence explicit and keep feature config inside extension factories.</p>
                </div>
                <CodeBlock lang="tsx">{`const extensions = [
  ...createDefaultEditorExtensions(),
  createImageExtension({ onUpload: api.uploadImage }),
];

<RichTextEditorField
  value={serverHtml}
  extensions={extensions}
  onSave={async (html) => {
    await api.publish(html);
    setServerHtml(html);
  }}
/>`}</CodeBlock>
              </section>

              <section className="demo-panel" id="sanity-wrapper">
                <div className="demo-panel-header">
                  <h3>Sanity Studio wrapper</h3>
                  <p>
                    Use the editor as a custom input for a Sanity <code>string</code> field that stores HTML.
                    Wire Sanity's <code>onChange</code> to <code>set</code> / <code>unset</code> — no <code>onSave</code> needed since Sanity manages persistence.
                  </p>
                </div>
                <CodeBlock lang="tsx">{`// sanity-loom-input.tsx
import { useMemo } from "react";
import { set, unset } from "sanity";
import type { StringInputProps } from "sanity";
import {
  RichTextEditorField,
  createDefaultEditorExtensions,
  createImageExtension,
} from "@linhtetpaing9/react-textblock-editor";
import "@linhtetpaing9/react-textblock-editor/style.css";

export function LoomInput({ value, onChange }: StringInputProps) {
  const extensions = useMemo(
    () => [
      ...createDefaultEditorExtensions(),
      createImageExtension({ onUpload: api.uploadImage }),
    ],
    []
  );

  return (
    <RichTextEditorField
      value={value ?? ""}
      extensions={extensions}
      onChange={(html) => onChange(html ? set(html) : unset())}
    />
  );
}`}</CodeBlock>
                <p className="docs-note">Register the component in your schema definition.</p>
                <CodeBlock lang="ts">{`// sanity.config.ts
import { defineConfig, defineField, defineType } from "sanity";
import { LoomInput } from "./sanity-loom-input";

export default defineConfig({
  schema: {
    types: [
      defineType({
        name: "article",
        type: "document",
        fields: [
          defineField({
            name: "body",
            title: "Body",
            type: "string",
            components: { input: LoomInput },
          }),
        ],
      }),
    ],
  },
});`}</CodeBlock>
                <p className="docs-note">
                  To render the saved HTML outside Sanity Studio, use <code>RichTextRenderer</code> with the field value retrieved via GROQ.
                </p>
                <CodeBlock lang="tsx">{`// article-page.tsx — Next.js / any React frontend
import { RichTextRenderer } from "@linhtetpaing9/react-textblock-editor";
import "@linhtetpaing9/react-textblock-editor/style.css";

// GROQ: *[_type == "article"][0]{ body }
export function ArticlePage({ body }: { body: string }) {
  return <RichTextRenderer content={body} className="prose" />;
}`}</CodeBlock>
              </section>
            </>
          )}

          {/* ── API ─────────────────────────────────────────────────────────── */}
          {activeTab === "api" && (
            <div className="docs-two-column">
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <section className="demo-panel" id="editor-props">
                  <div className="demo-panel-header">
                    <h3>RichTextEditorField</h3>
                    <p>Main editor component.</p>
                  </div>
                  <ApiTable rows={EDITOR_PROP_ROWS} cols={3} />
                </section>

                <section className="demo-panel" id="renderer-api">
                  <div className="demo-panel-header">
                    <h3>RichTextRenderer</h3>
                    <p>Read-only HTML renderer. SSR-safe.</p>
                  </div>
                  <CodeBlock lang="tsx">{`<RichTextRenderer content={savedHtml} className="prose" />`}</CodeBlock>
                </section>

                <section className="demo-panel" id="image-api">
                  <div className="demo-panel-header">
                    <h3>Image API</h3>
                    <p>Host apps can drive the image extension through the editor ref.</p>
                  </div>
                  <ApiTable rows={IMAGE_API_ROWS} cols={3} />
                  <CodeBlock lang="tsx">{`const editorRef = useRef<RichTextEditorHandle>(null);

const mockUploadImage = async (file: File) => {
  await new Promise((r) => setTimeout(r, 900));
  return await readFileAsDataUrl(file);
};

editorRef.current?.getExtensionApi<ImageExtensionApi>("images")?.openPicker();
editorRef.current?.getExtensionApi<ImageExtensionApi>("images")?.insertImageFromUrl(
  "https://example.com/image.jpg",
  { alt: "Example image", title: "Example" }
);`}</CodeBlock>
                  <p className="docs-note">
                    The playground uses a mock upload promise that converts the chosen file to a data URL after a short delay, so the upload flow is visible without a backend.
                  </p>
                </section>

              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                <section className="demo-panel" id="save-status-type">
                  <div className="demo-panel-header">
                    <h3>SaveStatus</h3>
                    <p>Emitted via <code>onSaveStatusChange</code>. Also shown in the toolbar badge.</p>
                  </div>
                  <CodeBlock lang="ts">{`type SaveStatus = "idle" | "saving" | "saved" | "error"`}</CodeBlock>
                </section>

                <section className="demo-panel" id="persist-prop">
                  <div className="demo-panel-header">
                    <h3>persist prop</h3>
                  </div>
                  <CodeBlock lang="tsx">{`// Saves draft to localStorage under key:
// "rtb-editor:draft:<documentId>"
<RichTextEditorField
  documentId="article:home"
  persist
  value={serverHtml}
  onSave={api.save}
/>`}</CodeBlock>
                </section>

                <section className="demo-panel" id="themes">
                  <div className="demo-panel-header">
                    <h3>Themes</h3>
                    <p>Import a CSS file or use the <code>theme</code> prop for runtime switching.</p>
                  </div>
                  <CodeBlock lang="ts">{`import { darkTheme, minimalTheme } from "@linhtetpaing9/react-textblock-editor";

<RichTextEditorField theme={darkTheme} ... />
<RichTextEditorField theme={minimalTheme} ... />`}</CodeBlock>
                </section>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
