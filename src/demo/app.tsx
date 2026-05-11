import { useEffect, useMemo, useState } from "react";
import { Bell, Database, Globe, Home, Package, ShieldCheck } from "lucide-react";
import { RichTextEditorField } from "../components/rich-text-editor-field";
import { RichTextRenderer } from "../components/rich-text-renderer";
import type { DocumentModelAdapter, EditorMode } from "../core/document-model";
import { createProseMirrorAdapter } from "../components/prosemirror/adapter";
import type { DocumentSessionState } from "../core/document-session";
import { cn } from "../shadcn/lib/utils";
import { sanitizeRichTextContent } from "../utils/sanitize-rich-text";

type DocTab = "overview" | "quick-start" | "reference" | "playground";

const TABS: { id: DocTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "quick-start", label: "Quick Start" },
  { id: "reference", label: "Reference" },
  { id: "playground", label: "Playground" },
];

const NAV_GROUPS = [
  {
    label: "Overview",
    tab: "overview" as DocTab,
    sections: [
      { id: "overview", label: "Overview" },
      { id: "integration-flow", label: "Integration Flow" },
      { id: "use-cases", label: "Use Cases" },
      { id: "frontend-architecture", label: "Frontend Architecture" },
    ],
  },
  {
    label: "Quick Start",
    tab: "quick-start" as DocTab,
    sections: [
      { id: "quick-start", label: "Quick Start" },
      { id: "react-usage", label: "React Usage" },
    ],
  },
  {
    label: "Reference",
    tab: "reference" as DocTab,
    sections: [
      { id: "editor-api", label: "Editor API" },
      { id: "session-api", label: "Session API" },
      { id: "feature-flags", label: "Feature Flags" },
      { id: "renderer-api", label: "Renderer API" },
    ],
  },
  {
    label: "Playground",
    tab: "playground" as DocTab,
    sections: [
      { id: "playground", label: "Playground" },
      { id: "hosting", label: "Hosting" },
    ],
  },
] as const;

const SECTION_TAB_MAP: Record<string, DocTab> = {
  "overview": "overview",
  "integration-flow": "overview",
  "use-cases": "overview",
  "frontend-architecture": "overview",
  "quick-start": "quick-start",
  "react-usage": "quick-start",
  "editor-api": "reference",
  "session-api": "reference",
  "feature-flags": "reference",
  "renderer-api": "reference",
  "hosting": "playground",
  "playground": "playground",
};

const INTEGRATION_STEPS = [
  {
    title: "Load the package",
    body: "Import the packaged stylesheet once, then render the field wrapper in your React screen or form.",
  },
  {
    title: "Edit a draft",
    body: "The field owns local draft state so typing stays responsive and unsaved changes can be tracked separately from persisted content.",
  },
  {
    title: "Persist one HTML string",
    body: "Your app saves the final sanitized HTML string. The package does not require a custom JSON document model for the baseline flow.",
  },
  {
    title: "Render saved content",
    body: "Frontend readers consume the saved HTML through RichTextRenderer, which sanitizes and cleans up editor-only artifacts before display.",
  },
] as const;

const ARCHITECTURE_LAYERS = [
  {
    title: "RichTextEditorField",
    body: "Recommended entry point for app forms. It wraps editor mounting, draft buffering, save/discard boundaries, and optional persisted local drafts.",
  },
  {
    title: "Document session seam",
    body: "Tracks saved HTML, draft HTML, unsaved-change state, draft storage keys, and feature flags so future collaboration or comments can sit outside the editor DOM.",
  },
  {
    title: "RichTextEditor",
    body: "Current HTML editing surface. This remains the active production editor and should stay stable for caret behavior and command execution.",
  },
  {
    title: "Document model adapter",
    body: "Optional structured-mode seam for a future ProseMirror or Automerge editor. It mounts beside the current storage contract instead of replacing it prematurely.",
  },
] as const;

const EDITOR_API_ROWS = [
  ["value", "Saved HTML string from your app state or API."],
  ["onSave", "Persist the current draft when the user explicitly saves."],
  ["onDiscard", "Reset the draft back to the last saved value."],
  ["onLocalChange", "Observe local draft updates before they are saved."],
  ["onSessionStateChange", "Receive session metadata such as unsaved state and persistence key."],
  ["documentId", "Stable identifier used to scope local draft persistence."],
  ["persistLocalDrafts", "Enable browser-backed draft recovery between reloads."],
  ["featureFlags", "Declare whether offline, comments, tracked changes, collaboration, or AI surfaces should appear as enabled seams."],
  ["editorMode", "Choose between the current HTML editor and a structured adapter prototype."],
  ["documentModelAdapter", "Provide the UI adapter when editorMode is set to structured."],
  ["onImageUpload", "Async upload bridge for image insertion workflows."],
  ["height / darkMode / readOnly / lazyMount", "Presentation and lifecycle options for common frontend embedding needs."],
] as const;

const SESSION_API_ROWS = [
  ["documentId", "Resolved document identifier used by the session layer."],
  ["savedContent", "Last persisted HTML string."],
  ["draftContent", "Current editable draft HTML string."],
  ["hasUnsavedChanges", "Boolean boundary between draft state and persisted state."],
  ["hasPersistedDraft", "Whether a browser-restorable draft currently exists."],
  ["persistenceKey", "Effective local storage key when draft persistence is enabled."],
  ["featureFlags", "Resolved boolean feature map consumed by the editor surface and future adapters."],
] as const;

const FEATURE_FLAG_ROWS = [
  ["offline", "Signals that local-first draft recovery or a future offline queue is active."],
  ["comments", "Seam for threaded annotations without changing the stored HTML contract."],
  ["trackedChanges", "Seam for change-marking workflows that may later require structured anchoring."],
  ["collaboration", "Marks the document as collaboration-aware so external presence or sync layers can attach."],
  ["ai", "Seam for rewrite, summarize, classify, or suggestion workflows gated behind explicit approval."],
] as const;

const INITIAL_CONTENT = sanitizeRichTextContent(`
  <h2>Standalone editor demo</h2>
  <p>This homepage exists only to test the package in isolation.</p>
  <ul>
    <li>Edit content</li>
    <li>Save it locally</li>
    <li>See the rendered output and generated HTML</li>
  </ul>
`);

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
  const structuredAdapterId = "demo-structured-adapter";
  const [savedContent, setSavedContent] = useState(INITIAL_CONTENT);
  const [draftContent, setDraftContent] = useState(INITIAL_CONTENT);
  const [sessionState, setSessionState] = useState<DocumentSessionState | null>(null);
  const [offlineDraftsEnabled, setOfflineDraftsEnabled] = useState(true);
  const [editorMode, setEditorMode] = useState<EditorMode>("html");
  const [activeTab, setActiveTab] = useState<DocTab>("overview");
  const [activeSection, setActiveSection] = useState<string>("overview");

  const demoFeatureFlags = useMemo(
    () => ({
      offline: offlineDraftsEnabled,
      comments: true,
      trackedChanges: true,
      collaboration: true,
      ai: true,
    }),
    [offlineDraftsEnabled]
  );

  useEffect(() => {
    const allSectionIds = NAV_GROUPS.flatMap((g) => g.sections.map((s) => s.id));
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-10% 0px -80% 0px", threshold: 0 }
    );
    allSectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [activeTab]);

  function handleNavClick(sectionId: string) {
    const tab = SECTION_TAB_MAP[sectionId] ?? "overview";
    setActiveTab(tab);
    setActiveSection(sectionId);
    setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  const experimentalStructuredAdapter = useMemo<DocumentModelAdapter>(
    () =>
      createProseMirrorAdapter({
        id: structuredAdapterId,
        label: "ProseMirror editor",
        description: "Raw ProseMirror editor — prosemirror-state/view/model, no Tiptap.",
      }),
    [structuredAdapterId]
  );

  return (
    <div className="app-shell">
      {/* ── Sidebar ── */}
      <aside className="docs-sidebar">
        <div className="docs-sidebar-logo">
          <div className="docs-logo-mark">&gt;_</div>
          <div className="docs-logo-text">
            <div className="docs-logo-name">RAVE</div>
            <div className="docs-logo-sub">rich-text-editor</div>
          </div>
        </div>

        <nav className="docs-nav" aria-label="Documentation sections">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="docs-nav-group-label">{group.label}</div>
              {group.sections.map((section) => (
                <a
                  key={section.id}
                  className={cn("docs-nav-link", activeSection === section.id && "docs-nav-link--active")}
                  href={`#${section.id}`}
                  onClick={(e) => { e.preventDefault(); handleNavClick(section.id); }}
                >
                  {section.label}
                </a>
              ))}
            </div>
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

      {/* ── App Body ── */}
      <div className="app-body">
        {/* Topbar */}
        <header className="docs-topbar">
          <div className="docs-breadcrumb">
            <Home size={13} className="docs-breadcrumb-home" />
            <span className="docs-breadcrumb-home">Home</span>
            <span className="docs-breadcrumb-sep">/</span>
            <span className="docs-breadcrumb-current">Docs</span>
          </div>
          <button className="docs-topbar-bell" type="button" aria-label="Notifications">
            <Bell size={14} />
          </button>
        </header>

        {/* Page Header + Tabs */}
        <div className="docs-page-header">
          <div className="docs-page-title">
            <h2>Documentation</h2>
            <p>Rich text editor components and API reference</p>
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

        {/* Content */}
        <div className="docs-content">

          {/* ── Overview tab ── */}
          {activeTab === "overview" && (
            <>
              <section id="overview">
                <p className="demo-kicker">Standalone Repo</p>
                <h2 className="demo-hero-title" style={{ margin: 0 }}>
                  Documentation website<br />and playground in one project
                </h2>
                <p className="demo-copy">
                  This site explains installation, React integration, hosting, and package publishing. The live editor below
                  uses the same library source that consumers install from npm.
                </p>
                <div className="docs-stat-grid">
                  <article className="docs-stat-card">
                    <div className="docs-stat-card-icon docs-stat-card-icon--green">
                      <Package size={16} />
                    </div>
                    <span>Library Build</span>
                    <strong>dist/</strong>
                  </article>
                  <article className="docs-stat-card">
                    <div className="docs-stat-card-icon docs-stat-card-icon--blue">
                      <Globe size={16} />
                    </div>
                    <span>Docs Site Build</span>
                    <strong>site-dist/</strong>
                  </article>
                  <article className="docs-stat-card">
                    <div className="docs-stat-card-icon docs-stat-card-icon--purple">
                      <Database size={16} />
                    </div>
                    <span>Storage Model</span>
                    <strong>HTML string</strong>
                  </article>
                  <article className="docs-stat-card">
                    <div className="docs-stat-card-icon docs-stat-card-icon--amber">
                      <ShieldCheck size={16} />
                    </div>
                    <span>Draft Persistence</span>
                    <strong>{offlineDraftsEnabled ? "enabled" : "disabled"}</strong>
                  </article>
                </div>
              </section>

              <section className="demo-panel" id="integration-flow">
                <div className="demo-panel-header">
                  <h3>Integration Flow</h3>
                  <p>The frontend contract is deliberately small: edit locally, save one HTML string, and render that same saved value anywhere in your app.</p>
                </div>
                <div className="docs-step-grid">
                  {INTEGRATION_STEPS.map((step, i) => (
                    <article key={step.title} className="docs-detail-card">
                      <div className="docs-detail-card-number">{i + 1}</div>
                      <h4>{step.title}</h4>
                      <p>{step.body}</p>
                    </article>
                  ))}
                </div>
                <div style={{ marginTop: 18 }}>
                  <CodeBlock lang="tsx">{`const [savedHtml, setSavedHtml] = useState("<p>Hello</p>");

<RichTextEditorField
  value={savedHtml}
  onSave={async (nextHtml) => {
    await saveDocument({ body: nextHtml });
    setSavedHtml(nextHtml);
  }}
  documentId="article:home"
  persistLocalDrafts
/>

<RichTextRenderer content={savedHtml} />`}</CodeBlock>
                </div>
              </section>

              <section className="demo-panel" id="use-cases">
                <div className="demo-panel-header">
                  <h3>Use Cases</h3>
                  <p>Three practical ways to think about the editor roadmap, from installable single-user package to a full document platform.</p>
                </div>
                <div className="docs-use-case-grid">
                  <article className="docs-host-card">
                    <h4>A simple editor</h4>
                    <p>
                      A traditional WYSIWYG single-user rich text editor with a basic command bar at the top, various
                      standard elements like text, lists, tables, and images for basic content creation.
                    </p>
                    <p>No version history, AI, or multi-user features, just a JavaScript package to install into frontend source code.</p>
                  </article>
                  <article className="docs-host-card">
                    <h4>A medium editor</h4>
                    <p>
                      An advanced content editor with a modern editing UI, including slash command menus, drag-and-drop
                      content blocks, real-time collaboration, commenting, and webhooks and APIs for further processing of
                      editor content outside the editor.
                    </p>
                  </article>
                  <article className="docs-host-card">
                    <h4>A complex editor</h4>
                    <p>
                      A sophisticated editor interface similar to Google Docs or Notion, with real-time collaboration,
                      offline support, role-based commenting, granular track changes, redlining, import and export of file
                      formats like MS Word or Markdown, AI operations on editor content, and RAG capabilities.
                    </p>
                  </article>
                </div>
              </section>

              <section className="demo-panel" id="frontend-architecture">
                <div className="demo-panel-header">
                  <h3>Frontend Architecture</h3>
                  <p>The package already exposes the seams needed for a more advanced document stack without breaking the current HTML-string storage model.</p>
                </div>
                <div className="docs-step-grid">
                  {ARCHITECTURE_LAYERS.map((layer, i) => (
                    <article key={layer.title} className="docs-detail-card">
                      <div className="docs-detail-card-number">{i + 1}</div>
                      <h4>{layer.title}</h4>
                      <p>{layer.body}</p>
                    </article>
                  ))}
                </div>
                <p className="docs-note">
                  Current contract: the editor persists a single sanitized HTML string. Structured editing is presented here as an adapter boundary, not as an undocumented storage rewrite.
                </p>
              </section>
            </>
          )}

          {/* ── Quick Start tab ── */}
          {activeTab === "quick-start" && (
            <>
              <section className="demo-panel" id="quick-start">
                <div className="demo-panel-header">
                  <h3>Quick Start</h3>
                  <p>Install the package and stylesheet, then mount the field or renderer inside any React app.</p>
                </div>
                <CodeBlock lang="shell">{`pnpm add @rave/rich-text-editor

import "@rave/rich-text-editor/style.css";
import { RichTextEditorField, RichTextRenderer } from "@rave/rich-text-editor";`}</CodeBlock>
              </section>

              <section className="demo-panel" id="react-usage">
                <div className="demo-panel-header">
                  <h3>React Usage</h3>
                  <p>The field wrapper buffers drafts locally and gives you explicit save and discard boundaries.</p>
                </div>
                <CodeBlock lang="tsx">{`const [content, setContent] = useState("<p>Hello</p>");

<RichTextEditorField
  value={content}
  onSave={async (nextHtml) => {
    setContent(nextHtml);
  }}
  onLocalChange={(draftHtml) => {
    console.log(draftHtml);
  }}
  height={420}
  lazyMount={false}
/>`}</CodeBlock>
              </section>
            </>
          )}

          {/* ── Reference tab ── */}
          {activeTab === "reference" && (
            <>
              <div className="docs-two-column">
                <section className="demo-panel" id="editor-api">
                  <div className="demo-panel-header">
                    <h3>Editor API</h3>
                    <p>Most integrations should start with <code>RichTextEditorField</code> rather than the lower-level editor shell.</p>
                  </div>
                  <div className="docs-api-table" role="table" aria-label="Editor API">
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
                      <h3>Renderer API</h3>
                      <p><code>RichTextRenderer</code> accepts the saved HTML string and renders sanitized output for the frontend.</p>
                    </div>
                    <CodeBlock lang="tsx">{`<RichTextRenderer
  content={savedHtml}
  className="prose-shell"
/>`}</CodeBlock>
                    <p className="docs-note">
                      The editor stores one HTML string. Consumers do not need Portable Text or a custom document structure.
                    </p>
                  </section>

                  <section className="demo-panel" id="session-api">
                    <div className="demo-panel-header">
                      <h3>Session API</h3>
                      <p>The field wrapper can emit session metadata so your frontend can observe draft boundaries without scraping editor DOM state.</p>
                    </div>
                    <div className="docs-api-table" role="table" aria-label="Session API">
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
                      <h3>Feature Flags</h3>
                      <p>The current package resolves feature flags into explicit booleans so future capability slices can mount cleanly around the editor.</p>
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
            </>
          )}

          {/* ── Playground tab ── */}
          {activeTab === "playground" && (
            <>
              <section className="demo-grid" id="playground">
                <div className="demo-panel demo-editor-panel">
                  <div className="demo-panel-header">
                    <h3>Playground</h3>
                    <p>Interactive editor wired directly to the library source, including Phase 1 session-state seams.</p>
                  </div>
                  <label className="demo-label">
                    <input
                      type="checkbox"
                      checked={offlineDraftsEnabled}
                      onChange={(event) => setOfflineDraftsEnabled(event.target.checked)}
                    />
                    persist local drafts between reloads
                  </label>
                  <label className="demo-label">
                    <span>editor mode</span>
                    <select
                      value={editorMode}
                      onChange={(event) => setEditorMode(event.target.value as EditorMode)}
                    >
                      <option value="html">html editor</option>
                      <option value="structured">structured seam (experimental)</option>
                    </select>
                  </label>
                  <RichTextEditorField
                    value={draftContent}
                    onLocalChange={setDraftContent}
                    onSessionStateChange={setSessionState}
                    onSave={async (content) => {
                      setSavedContent(content);
                      setDraftContent(content);
                    }}
                    onDiscard={async (content) => {
                      setDraftContent(content);
                    }}
                    editorPlaceholder="Start typing rich text..."
                    height={460}
                    lazyMount={false}
                    filledLabel="Open editor"
                    emptyLabel="Open editor"
                    documentId="demo-playground"
                    persistLocalDrafts={offlineDraftsEnabled}
                    editorMode={editorMode}
                    documentModelAdapter={editorMode === "structured" ? experimentalStructuredAdapter : undefined}
                    featureFlags={demoFeatureFlags}
                  />
                </div>

                <div className="demo-side">
                  <div className="demo-panel">
                    <div className="demo-panel-header">
                      <h3>Session state</h3>
                      <p>Current field-session boundary exposed by the new document session hook.</p>
                    </div>
                    <pre>{JSON.stringify(sessionState, null, 2)}</pre>
                  </div>

                  <div className="demo-panel">
                    <div className="demo-panel-header">
                      <h3>Preview</h3>
                      <p>Rendered output from the saved HTML.</p>
                    </div>
                    <RichTextRenderer content={savedContent} />
                  </div>

                  <div className="demo-panel demo-code-panel">
                    <div className="demo-panel-header">
                      <h3>Saved HTML</h3>
                      <p>Exact value you can persist in your app.</p>
                    </div>
                    <pre>{savedContent}</pre>
                  </div>
                </div>
              </section>

              <section className="demo-panel" id="hosting">
                <div className="demo-panel-header">
                  <h3>Hosting</h3>
                  <p>The docs website is a static Vite build, so it can be deployed to common static hosts without server code.</p>
                </div>
                <div className="docs-host-grid">
                  <article className="docs-host-card">
                    <h4>Build locally</h4>
                    <pre>{`pnpm install\npnpm build:docs`}</pre>
                    <p>Upload the generated <code>site-dist/</code> folder to your host.</p>
                  </article>
                  <article className="docs-host-card">
                    <h4>Vercel / Netlify</h4>
                    <pre>{`Build command: pnpm build:docs\nOutput directory: site-dist`}</pre>
                    <p>Works as a static site with no custom runtime required.</p>
                  </article>
                  <article className="docs-host-card">
                    <h4>Cloudflare Pages</h4>
                    <pre>{`Build command: pnpm build:docs\nBuild output: site-dist`}</pre>
                    <p>Use the repo root as the project root and publish the generated docs artifact.</p>
                  </article>
                </div>
              </section>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
