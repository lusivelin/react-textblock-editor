import { Component, useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { createDefaultEditorExtensions } from "../../extensions";
import type { Command } from "prosemirror-state";

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

  const [, setTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSourceMode, setIsSourceMode] = useState(false);

  const toggleFullscreen = useCallback(() => setIsFullscreen((f) => !f), []);
  const toggleSourceMode = useCallback(() => setIsSourceMode((f) => !f), []);

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
  const plugins = useMemo(
    () => [
      ...resolvedExtensions.flatMap((extension) => {
        try {
          return extension.getPlugins?.(extensionContext) ?? [];
        } catch (err) {
          console.warn(`[rtb] Extension "${extension.id}" getPlugins failed:`, err);
          return [];
        }
      }),
      ...resolvedExtensions
        .map((extension) => {
          try {
            return extension.getKeymap?.(extensionContext);
          } catch (err) {
            console.warn(`[rtb] Extension "${extension.id}" getKeymap failed:`, err);
            return undefined;
          }
        })
        .filter((bindings): bindings is Record<string, Command> => Boolean(bindings))
        .map((bindings) => keymap(bindings)),
    ],
    [extensionContext, resolvedExtensions]
  );
  const nodeViews = useMemo(
    () =>
      resolvedExtensions.reduce<NonNullable<DirectEditorProps["nodeViews"]>>((acc, extension) => {
        try {
          return { ...acc, ...extension.getNodeViews?.(extensionContext) };
        } catch (err) {
          console.warn(`[rtb] Extension "${extension.id}" getNodeViews failed:`, err);
          return acc;
        }
      }, {}),
    [extensionContext, resolvedExtensions]
  );
  const toolbarItems = useMemo(
    () => resolvedExtensions.flatMap((extension) => {
      try {
        return extension.getToolbarItems?.(extensionContext) ?? [];
      } catch (err) {
        console.warn(`[rtb] Extension "${extension.id}" getToolbarItems failed:`, err);
        return [];
      }
    }),
    [extensionContext, resolvedExtensions]
  );
  const overlays = useMemo(
    () => resolvedExtensions.flatMap((extension) => {
      try {
        return extension.getOverlays?.(extensionContext) ?? [];
      } catch (err) {
        console.warn(`[rtb] Extension "${extension.id}" getOverlays failed:`, err);
        return [];
      }
    }),
    [extensionContext, resolvedExtensions]
  );

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
          if (tr.docChanged || tr.selectionSet) {
            setTick((t) => t + 1);
            if (tr.docChanged) {
              const html = serializeDocToHtml(next.doc, schema);
              lastEmittedRef.current = html;
              onChangeRef.current?.(html);
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

  return (
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
        {(!saveStatus || saveStatus === "idle") && sessionState?.hasUnsavedChanges && (onSaveRef.current || onDiscardRef.current) && (
          <>
            <span className="rtb-status-dot" />
            Unsaved changes
            {onSaveRef.current && (
              <button type="button" className="rtb-status-action-btn" onMouseDown={(e) => { e.preventDefault(); void onSaveRef.current?.(); }}>
                Save
              </button>
            )}
            {onDiscardRef.current && (
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
}
