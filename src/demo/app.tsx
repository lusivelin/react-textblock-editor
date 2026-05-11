"use client";

import { useMemo, useState } from "react";
import { RichTextEditorField } from "../components/rich-text-editor-field";
import { RichTextRenderer } from "../components/rich-text-renderer";
import type { DocumentSessionState } from "../core/document-session";
import { cn } from "../shadcn/lib/utils";
import { sanitizeRichTextContent } from "../utils/sanitize-rich-text";

type Tab = "playground" | "quick-start" | "api";

const TABS: { id: Tab; label: string }[] = [
  { id: "playground", label: "Playground" },
  { id: "quick-start", label: "Quick Start" },
  { id: "api", label: "API" },
];

const INITIAL_CONTENT = sanitizeRichTextContent(`
  <h2>Try the editor</h2>
  <p>Format text, add lists and tables, then save to see the output.</p>
  <ul>
    <li><strong>Bold</strong>, <em>italic</em>, underline, code</li>
    <li>Headings, bullet lists, ordered lists, blockquote</li>
    <li>Tables</li>
  </ul>
`);

const EDITOR_API_ROWS: [string, string][] = [
  ["value", "Saved HTML from your state or API."],
  ["onSave", "Called when the user explicitly saves."],
  ["onDiscard", "Called when the user discards draft."],
  ["onLocalChange", "Called on every draft edit."],
  ["onSessionStateChange", "Emits session metadata on change."],
  ["documentId", "Stable ID for this document."],
  ["persistence", "{ kind: 'none' } | { kind: 'automerge', documentId }"],
  ["featureFlags", "{ offline, comments, trackedChanges, collaboration, ai }"],
  ["placeholder", "Editor placeholder text."],
  ["height", "Min height in px. Default: 400."],
  ["darkMode", "Enable dark theme."],
  ["readOnly", "Disable editing."],
  ["lazyMount", "Mount only on first click. Default: true."],
];

const SESSION_API_ROWS: [string, string][] = [
  ["documentId", "Resolved document identifier."],
  ["savedContent", "Last persisted HTML string."],
  ["draftContent", "Current draft HTML string."],
  ["hasUnsavedChanges", "True when draft differs from saved."],
  ["hasPersistedDraft", "True when a local draft exists in storage."],
  ["persistenceKey", "Active localStorage key (if any)."],
  ["featureFlags", "Resolved feature flag map."],
];

const FEATURE_FLAG_ROWS: [string, string][] = [
  ["offline", "Local-first persistence is active."],
  ["comments", "Comment threads seam."],
  ["trackedChanges", "Track changes seam."],
  ["collaboration", "Real-time collaboration seam."],
  ["ai", "AI editing operations seam."],
];

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

export function DemoApp() {
  const [savedContent, setSavedContent] = useState(INITIAL_CONTENT);
  const [draftContent, setDraftContent] = useState(INITIAL_CONTENT);
  const [sessionState, setSessionState] = useState<DocumentSessionState | null>(null);
  const [localFirst, setLocalFirst] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("playground");

  const featureFlags = useMemo(() => ({
    offline: localFirst,
    comments: false,
    trackedChanges: false,
    collaboration: false,
    ai: false,
  }), [localFirst]);

  return (
    <div className="app-shell">
      {/* Sidebar */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-logo">
          <div className="docs-logo-mark">&gt;_</div>
          <div className="docs-logo-text">
            <div className="docs-logo-name">RAVE</div>
            <div className="docs-logo-sub">rich-text-editor</div>
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
              <div className="docs-user-name">@rave/rich-text-editor</div>
              <div className="docs-user-badge">v0.1.0</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="app-body">
        <div className="docs-page-header">
          <div className="docs-page-title">
            <h2>Rave Rich Text Editor</h2>
            <p>ProseMirror editor with local-first persistence</p>
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

          {/* Playground */}
          {activeTab === "playground" && (
            <section className="demo-grid" id="playground">
              <div className="demo-panel demo-editor-panel">
                <div className="demo-panel-header">
                  <h3>Editor</h3>
                  <label className="demo-label" style={{ margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={localFirst}
                      onChange={(e) => setLocalFirst(e.target.checked)}
                    />
                    local-first persistence (Automerge)
                  </label>
                </div>
                <RichTextEditorField
                  value={draftContent}
                  onLocalChange={setDraftContent}
                  onSessionStateChange={setSessionState}
                  onSave={async (html) => {
                    setSavedContent(html);
                    setDraftContent(html);
                  }}
                  onDiscard={async (html) => {
                    setDraftContent(html);
                  }}
                  placeholder="Start typing…"
                  height={460}
                  lazyMount={false}
                  documentId="demo-playground"
                  persistence={localFirst ? { kind: "automerge", documentId: "demo:playground" } : { kind: "none" }}
                  featureFlags={featureFlags}
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
                    <h3>Saved HTML</h3>
                  </div>
                  <pre>{savedContent}</pre>
                </div>

                <div className="demo-panel">
                  <div className="demo-panel-header">
                    <h3>Session state</h3>
                  </div>
                  <pre>{JSON.stringify(sessionState, null, 2)}</pre>
                </div>
              </div>
            </section>
          )}

          {/* Quick Start */}
          {activeTab === "quick-start" && (
            <>
              <section className="demo-panel" id="quick-start">
                <div className="demo-panel-header">
                  <h3>Install</h3>
                </div>
                <CodeBlock lang="shell">{`pnpm add @rave/rich-text-editor`}</CodeBlock>
              </section>

              <section className="demo-panel" id="basic-usage">
                <div className="demo-panel-header">
                  <h3>Basic usage</h3>
                </div>
                <CodeBlock lang="tsx">{`import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";

const [savedHtml, setSavedHtml] = useState("<p>Hello</p>");

<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => {
    await saveToServer(html);
    setSavedHtml(html);
  }}
  documentId="article:home"
/>

<RichTextRenderer content={savedHtml} />`}</CodeBlock>
              </section>

              <section className="demo-panel" id="local-first">
                <div className="demo-panel-header">
                  <h3>Local-first persistence</h3>
                  <p>Content survives page reload via Automerge + localStorage. Requires <code>@automerge/automerge</code>.</p>
                </div>
                <CodeBlock lang="shell">{`pnpm add @automerge/automerge`}</CodeBlock>
                <CodeBlock lang="tsx">{`<RichTextEditorField
  value={savedHtml}
  onSave={async (html) => { setSavedHtml(html); }}
  documentId="article:home"
  persistence={{ kind: "automerge", documentId: "article:home" }}
  featureFlags={{ offline: true }}
/>`}</CodeBlock>
              </section>

              <section className="demo-panel" id="hosting">
                <div className="demo-panel-header">
                  <h3>Deploy this site</h3>
                </div>
                <CodeBlock lang="shell">{`pnpm build:docs   # → site-dist/`}</CodeBlock>
                <p className="docs-note">Build command: <code>pnpm build:docs</code> · Output directory: <code>site-dist</code> · Works on Vercel, Netlify, Cloudflare Pages.</p>
              </section>
            </>
          )}

          {/* API */}
          {activeTab === "api" && (
            <div className="docs-two-column">
              <section className="demo-panel" id="editor-api">
                <div className="demo-panel-header">
                  <h3>RichTextEditorField</h3>
                </div>
                <div className="docs-api-table" role="table" aria-label="Editor props">
                  {EDITOR_API_ROWS.map(([name, description]) => (
                    <div key={name} className="docs-api-row" role="row">
                      <code>{name}</code>
                      <p>{description}</p>
                    </div>
                  ))}
                </div>
              </section>

              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <section className="demo-panel" id="renderer-api">
                  <div className="demo-panel-header">
                    <h3>RichTextRenderer</h3>
                  </div>
                  <CodeBlock lang="tsx">{`<RichTextRenderer content={savedHtml} className="prose" />`}</CodeBlock>
                </section>

                <section className="demo-panel" id="session-api">
                  <div className="demo-panel-header">
                    <h3>Session state</h3>
                    <p>Emitted via <code>onSessionStateChange</code>.</p>
                  </div>
                  <div className="docs-api-table" role="table" aria-label="Session state">
                    {SESSION_API_ROWS.map(([name, description]) => (
                      <div key={name} className="docs-api-row" role="row">
                        <code>{name}</code>
                        <p>{description}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="demo-panel" id="feature-flags">
                  <div className="demo-panel-header">
                    <h3>Feature flags</h3>
                  </div>
                  <div className="docs-api-table" role="table" aria-label="Feature flags">
                    {FEATURE_FLAG_ROWS.map(([name, description]) => (
                      <div key={name} className="docs-api-row" role="row">
                        <code>{name}</code>
                        <p>{description}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
