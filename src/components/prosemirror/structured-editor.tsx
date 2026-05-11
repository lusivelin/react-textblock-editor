"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { history, undo, redo } from "prosemirror-history";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list";
import { tableEditing, columnResizing } from "prosemirror-tables";
import { schema } from "./schema";
import { parseHtmlToDoc } from "../../utils/html/html-to-prosemirror";
import { serializeDocToHtml } from "../../utils/html/prosemirror-to-html";
import { ProseMirrorToolbar } from "./toolbar";
import { ActionBar } from "../action-bar";
import { cn } from "../../shadcn/lib/utils";
import type { StructuredEditorRenderProps } from "../../core/document-model";

const STYLE_ID = "rave-pm-styles";
const STYLES = `
.rave-pm .ProseMirror { outline: none; padding: 1rem; min-height: inherit; font-size: 0.9375rem; line-height: 1.6; word-break: break-word; }
.rave-pm .ProseMirror > * + * { margin-top: 0.5em; }
.rave-pm .ProseMirror p { margin: 0; }
.rave-pm .ProseMirror h1 { font-size: 1.75em; font-weight: 700; margin: 0; }
.rave-pm .ProseMirror h2 { font-size: 1.375em; font-weight: 700; margin: 0; }
.rave-pm .ProseMirror h3 { font-size: 1.125em; font-weight: 600; margin: 0; }
.rave-pm .ProseMirror h4, .rave-pm .ProseMirror h5, .rave-pm .ProseMirror h6 { font-weight: 600; margin: 0; }
.rave-pm .ProseMirror ul, .rave-pm .ProseMirror ol { padding-left: 1.5em; margin: 0; }
.rave-pm .ProseMirror blockquote { border-left: 3px solid #e2e8f0; padding-left: 1em; color: #64748b; margin: 0; }
.rave-pm .ProseMirror pre { background: #f1f5f9; border-radius: 0.375rem; padding: 0.75rem; overflow-x: auto; margin: 0; }
.rave-pm .ProseMirror code { background: #f1f5f9; border-radius: 0.25rem; padding: 0.125em 0.25em; font-size: 0.875em; font-family: monospace; }
.rave-pm .ProseMirror pre code { background: none; padding: 0; }
.rave-pm .ProseMirror a { color: #3b82f6; text-decoration: underline; }
.rave-pm .ProseMirror img { max-width: 100%; height: auto; }
.rave-pm .ProseMirror table { border-collapse: collapse; width: 100%; }
.rave-pm .ProseMirror th, .rave-pm .ProseMirror td { border: 1px solid #e2e8f0; padding: 0.4em 0.6em; vertical-align: top; }
.rave-pm .ProseMirror th { background: #f8fafc; font-weight: 600; }
.rave-pm .ProseMirror .column-resize-handle { position: absolute; right: -2px; top: 0; bottom: 0; width: 4px; background-color: #adf; pointer-events: none; }
.rave-pm .ProseMirror.resize-cursor { cursor: col-resize; }
.rave-pm .ProseMirror-selectednode { outline: 2px solid #8cf; }
.rave-pm-dark .ProseMirror { color: #e2e8f0; }
.rave-pm-dark .ProseMirror blockquote { border-color: #334155; color: #94a3b8; }
.rave-pm-dark .ProseMirror pre, .rave-pm-dark .ProseMirror code { background: #1e293b; color: #e2e8f0; }
.rave-pm-dark .ProseMirror a { color: #60a5fa; }
.rave-pm-dark .ProseMirror th, .rave-pm-dark .ProseMirror td { border-color: #334155; }
.rave-pm-dark .ProseMirror th { background: #1e293b; }
`;

function injectStyles() {
  if (typeof document === "undefined" || document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = STYLES;
  document.head.appendChild(style);
}

function buildPlugins() {
  return [
    history(),
    keymap({
      "Mod-z": undo,
      "Mod-Shift-z": redo,
      "Mod-y": redo,
      Enter: splitListItem(schema.nodes.list_item),
      Tab: sinkListItem(schema.nodes.list_item),
      "Shift-Tab": liftListItem(schema.nodes.list_item),
    }),
    keymap(baseKeymap),
    columnResizing(),
    tableEditing(),
  ];
}

export function StructuredEditor({
  value,
  onChange,
  onSave,
  onDiscard,
  className,
  height = 400,
  darkMode = false,
  readOnly = false,
  hasUnsavedChanges = false,
  isSaving = false,
  isDiscarding = false,
}: StructuredEditorRenderProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastEmittedRef = useRef<string>("");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const [, setTick] = useState(0);

  useLayoutEffect(() => {
    injectStyles();
    if (!mountRef.current) return;

    const doc = parseHtmlToDoc(value ?? "", schema);
    const state = EditorState.create({ doc, plugins: buildPlugins() });

    const view = new EditorView(mountRef.current, {
      state,
      editable: () => !readOnly,
      dispatchTransaction(tr) {
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
      },
    });

    viewRef.current = view;
    lastEmittedRef.current = serializeDocToHtml(doc, schema);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync readOnly prop changes
  useEffect(() => {
    viewRef.current?.setProps({ editable: () => !readOnly });
  }, [readOnly]);

  // Sync external value changes — skip when it's our own emission
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const incoming = value ?? "";
    if (incoming === lastEmittedRef.current) return;
    const doc = parseHtmlToDoc(incoming, schema);
    view.updateState(EditorState.create({ doc, plugins: view.state.plugins }));
    lastEmittedRef.current = serializeDocToHtml(doc, schema);
  }, [value]);

  const currentState = viewRef.current?.state ?? null;

  return (
    <div
      className={cn(
        "rave-pm overflow-hidden rounded border shadow-sm",
        darkMode ? "rave-pm-dark border-white/[0.08] bg-[#141618] text-white" : "border-gray-200 bg-white text-gray-900",
        className
      )}
    >
      {onSave && (
        <ActionBar
          darkMode={darkMode}
          isFullscreen={false}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isDiscarding={isDiscarding}
          onSave={onSave}
          onDiscard={onDiscard}
        />
      )}
      <ProseMirrorToolbar view={viewRef.current} state={currentState} darkMode={darkMode} />
      <div ref={mountRef} style={{ minHeight: `${height}px` }} />
    </div>
  );
}
