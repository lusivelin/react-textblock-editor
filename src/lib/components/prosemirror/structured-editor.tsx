import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type React from "react";
import { useIsomorphicLayoutEffect } from "../../hooks/use-isomorphic-layout-effect";
import { EditorState } from "prosemirror-state";
import { type DirectEditorProps, EditorView } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { createEditorSchema } from "./schema";
import { parseHtmlToDoc } from "../../utils/html/html-to-prosemirror";
import { serializeDocToHtml } from "../../utils/html/prosemirror-to-html";
import { ProseMirrorToolbar } from "./toolbar";
import { injectTheme } from "./pm-styles";
import { cn } from "../../utils/cn";
import type { EditorClassNames } from "../../core/document-model";
import type { EditorExtension, EditorExtensionRuntimeContext } from "../../core/editor-extension";
import type { SaveStatus, DocumentSessionState } from "../../core/document-session";
import { createDefaultEditorExtensions } from "../../extensions";
import type { EditorState as ProseMirrorState } from "prosemirror-state";

interface StructuredEditorRenderProps {
  value: string;
  onChange?: (content: string) => void;
  onSave?: () => void | Promise<void>;
  onDiscard?: () => void | Promise<void>;
  placeholder?: string;
  className?: string;
  classNames?: EditorClassNames;
  readOnly?: boolean;
  height?: number;
  darkMode?: boolean;
  saveStatus?: SaveStatus;
  sessionState: DocumentSessionState;
  extensions?: EditorExtension[];
  theme?: string;
}
/** Compact snapshot of toolbar-relevant state: active marks + parent block type. */
function toolbarSnapshot(state: ProseMirrorState): string {
  const { from, $from, to, empty } = state.selection;
  const marks = empty
    ? (state.storedMarks ?? $from.marks()).map((m) => m.type.name).sort().join(",")
    : "";
  return `${from}:${to}|${$from.parent.type.name}|${marks}`;
}

class OverlayErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.warn("[rtb] Overlay render failed:", err); }
  render() { return this.state.hasError ? null : this.props.children; }
}

export function StructuredEditor({
  value,
  onChange,
  onSave,
  onDiscard,
  className,
  classNames,
  height = 400,
  darkMode = false,
  readOnly = false,
  saveStatus,
  sessionState,
  extensions,
  theme,
}: StructuredEditorRenderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastEmittedRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;
  const tableHScrollAllowedRef = useRef(false);
  const pasteHandlerRef = useRef<((view: EditorView, event: ClipboardEvent) => boolean | void) | undefined>(undefined);
  const dropHandlerRef = useRef<((view: EditorView, event: DragEvent) => boolean | void) | undefined>(undefined);
  // Snapshot of cursor-position-relevant toolbar state. Re-render is skipped
  // when the cursor moves through content where marks and block type are unchanged.
  const toolbarSnapshotRef = useRef<string>("");

  const [, setTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), []);
  const toggleSourceMode = useCallback(() => setIsSourceMode((f) => !f), []);

  // Stable portal host. The editor is always rendered into this node; we only
  // relocate the node itself (inline placeholder ↔ document.body) when toggling
  // fullscreen. Because the portal container's identity never changes, ProseMirror
  // is never unmounted/recreated — cursor, scroll, and unsaved edits are preserved.
  // Portaling to body lets `position: fixed` fullscreen escape any ancestor
  // transform/stacking context (e.g. Sanity Studio panes) that would otherwise
  // trap it and cause z-index overlap.
  const portalHostRef = useRef<HTMLDivElement | null>(null);
  if (typeof document !== "undefined" && !portalHostRef.current) {
    const host = document.createElement("div");
    host.className = "rtb-pm-portal-host";
    host.style.display = "contents";
    portalHostRef.current = host;
  }
  const placeholderRef = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const host = portalHostRef.current;
    if (!host) return;
    const target = isFullscreen ? document.body : placeholderRef.current;
    if (target && host.parentNode !== target) target.appendChild(host);
  }, [isFullscreen]);

  useIsomorphicLayoutEffect(() => {
    return () => portalHostRef.current?.remove();
  }, []);

  const resolvedExtensions = useMemo<EditorExtension[]>(
    () => (extensions && extensions.length > 0 ? extensions : createDefaultEditorExtensions()),
    [extensions]
  );
  const schema = useMemo(() => createEditorSchema(resolvedExtensions), [resolvedExtensions]);

  const extensionContext = useMemo<EditorExtensionRuntimeContext>(
    () => ({
      documentId: sessionState.documentId,
      featureFlags: sessionState.featureFlags,
      schema,
    }),
    [schema, sessionState.documentId, sessionState.featureFlags]
  );
  // Single pass over all extensions — collect plugins, nodeViews, toolbar items,
  // overlays, and event handlers in one iteration instead of 5 separate ones.
  const { plugins, nodeViews, toolbarItems, overlays } = useMemo(() => {
    const plugins: ReturnType<NonNullable<EditorExtension["getPlugins"]>> = [];
    const nodeViews: NonNullable<DirectEditorProps["nodeViews"]> = {};
    const toolbarItems: NonNullable<ReturnType<NonNullable<EditorExtension["getToolbarItems"]>>> = [];
    const overlays: NonNullable<ReturnType<NonNullable<EditorExtension["getOverlays"]>>> = [];

    for (const ext of resolvedExtensions) {
      try {
        plugins.push(...(ext.getPlugins?.(extensionContext) ?? []));
        const bindings = ext.getKeymap?.(extensionContext);
        if (bindings) plugins.push(keymap(bindings));
        Object.assign(nodeViews, ext.getNodeViews?.(extensionContext));
        toolbarItems.push(...(ext.getToolbarItems?.(extensionContext) ?? []));
        overlays.push(...(ext.getOverlays?.(extensionContext) ?? []));
      } catch (err) {
        console.warn(`[rtb] Extension "${ext.id}" setup failed:`, err);
      }
    }

    return { plugins, nodeViews, toolbarItems, overlays };
  }, [extensionContext, resolvedExtensions]);

  // Update paste/drop handler refs in a separate effect so the view creation
  // below doesn't depend on them (handlers are read via ref at call time).
  useEffect(() => {
    const handlers = resolvedExtensions.flatMap((ext) => {
      try {
        const h = ext.getEditorHandlers?.(extensionContext);
        return h ? [h] : [];
      } catch (err) {
        console.warn(`[rtb] Extension "${ext.id}" getEditorHandlers failed:`, err);
        return [];
      }
    });
    pasteHandlerRef.current = handlers.some((h) => h.handlePaste)
      ? (view, event) => handlers.some((h) => h.handlePaste?.(view, event))
      : undefined;
    dropHandlerRef.current = handlers.some((h) => h.handleDrop)
      ? (view, event) => handlers.some((h) => h.handleDrop?.(view, event))
      : undefined;
  }, [extensionContext, resolvedExtensions]);

  useEffect(() => {
    if (!theme) return;
    return injectTheme(theme);
  }, [theme]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsFullscreen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  useIsomorphicLayoutEffect(() => {
    if (!mountRef.current) return;

    const doc = parseHtmlToDoc(value ?? "", schema);
    const state = EditorState.create({ doc, plugins });

    const view = new EditorView(mountRef.current, {
      state,
      editable: () => !readOnly,
      nodeViews,
      handlePaste(view, event) {
        return pasteHandlerRef.current?.(view, event) ?? false;
      },
      handleDrop(view, event) {
        return dropHandlerRef.current?.(view, event) ?? false;
      },
      handleKeyDown(_view, event) {
        if ((event.ctrlKey || event.metaKey) && event.key === "s") {
          event.preventDefault();
          void onSaveRef.current?.();
          return true;
        }
        if (event.key === "Tab" || event.key === "ArrowLeft" || event.key === "ArrowRight") {
          tableHScrollAllowedRef.current = true;
          setTimeout(() => { tableHScrollAllowedRef.current = false; }, 60);
        }
        return false;
      },
      handleScrollToSelection(view) {
        if (tableHScrollAllowedRef.current) return false;
        const wrappers = view.dom.querySelectorAll<HTMLElement>(".tableWrapper");
        if (!wrappers.length) return false;
        const saved = Array.from(wrappers).map((el) => el.scrollLeft);
        requestAnimationFrame(() => {
          Array.from(wrappers).forEach((el, i) => { el.scrollLeft = saved[i]; });
        });
        return false;
      },
      dispatchTransaction(tr) {
        try {
          const next = view.state.apply(tr);
          view.updateState(next);
          if (tr.docChanged) {
            const html = serializeDocToHtml(next.doc, schema);
            lastEmittedRef.current = html;
            onChangeRef.current?.(html);
            // Doc change always warrants a toolbar re-render; reset snapshot.
            toolbarSnapshotRef.current = "";
            setTick((t) => t + 1);
          } else if (tr.selectionSet) {
            // Only re-render when toolbar-relevant state actually changed:
            // active marks at cursor or the parent block type.
            const snap = toolbarSnapshot(next);
            if (snap !== toolbarSnapshotRef.current) {
              toolbarSnapshotRef.current = snap;
              setTick((t) => t + 1);
            }
          }
        } catch (err) {
          console.warn("[rtb] dispatchTransaction failed:", err);
        }
      },
    });

    viewRef.current = view;
    lastEmittedRef.current = serializeDocToHtml(doc, schema);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, [nodeViews, plugins, schema]);

  useEffect(() => {
    viewRef.current?.setProps({ editable: () => !readOnly });
  }, [readOnly]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const incoming = value ?? "";
    if (incoming === lastEmittedRef.current) return;
    const doc = parseHtmlToDoc(incoming, schema);
    view.updateState(EditorState.create({ doc, plugins: view.state.plugins }));
    lastEmittedRef.current = serializeDocToHtml(doc, schema);
  }, [schema, value]);

  const currentState = viewRef.current?.state ?? null;

  const editorTree = (
    <div className={cn("rtb-pm", darkMode && "rtb-pm-dark", isFullscreen && "rtb-pm--fullscreen", className, classNames?.root)}>
      {viewRef.current && currentState && (
        <ProseMirrorToolbar
          view={viewRef.current}
          state={currentState}
          schema={schema}
          items={toolbarItems}
          className={classNames?.toolbar}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isSourceMode={isSourceMode}
          onToggleSourceMode={toggleSourceMode}
        />
      )}

      <div
        ref={mountRef}
        className={cn(classNames?.content, isFullscreen && "rtb-pm-content--fullscreen")}
        style={isFullscreen ? undefined : { minHeight: `${height}px` }}
      />

      <div className={`rtb-status-bar${saveStatus && saveStatus !== "idle" ? ` rtb-status-bar--${saveStatus}` : ""}`}>
        {saveStatus === "saving" && <><span className="rtb-spinner" />Saving…</>}
        {saveStatus === "saved" && "Saved"}
        {saveStatus === "error" && "Save failed"}
        {(!saveStatus || saveStatus === "idle") && sessionState?.hasUnsavedChanges && (onSave || onDiscard) && (
          <>
            <span className="rtb-status-dot" />
            Unsaved changes
            {onSave && (
              <button type="button" className="rtb-status-action-btn" onMouseDown={(e) => { e.preventDefault(); void onSaveRef.current?.(); }}>
                Save
              </button>
            )}
            {onDiscard && (
              <button type="button" className="rtb-status-action-btn rtb-status-action-btn--discard" onMouseDown={(e) => { e.preventDefault(); void onDiscardRef.current?.(); }}>
                Discard
              </button>
            )}
          </>
        )}
      </div>

      {viewRef.current && currentState && overlays.map((overlay) => (
        <OverlayErrorBoundary key={overlay.id}>
          {overlay.render({
            view: viewRef.current!,
            state: currentState,
            schema,
            darkMode,
            isFullscreen,
            onToggleFullscreen: toggleFullscreen,
            isSourceMode,
            onToggleSourceMode: toggleSourceMode,
          })}
        </OverlayErrorBoundary>
      ))}
    </div>
  );

  return (
    <>
      <div ref={placeholderRef} style={{ display: "contents" }} />
      {portalHostRef.current && createPortal(editorTree, portalHostRef.current)}
    </>
  );
}
