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
import { ImageNodeView } from "./image-view";
import { TableFloatingToolbar } from "./table-toolbar";
import { ActionBar } from "../action-bar";
import { injectPmStyles } from "./pm-styles";
import { cn } from "../../shadcn/lib/utils";
import type { StructuredEditorRenderProps } from "../../core/document-model";

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
  onImageUpload,
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
    injectPmStyles();
    if (!mountRef.current) return;

    const doc = parseHtmlToDoc(value ?? "", schema);
    const state = EditorState.create({ doc, plugins: buildPlugins() });

    const view = new EditorView(mountRef.current, {
      state,
      editable: () => !readOnly,
      nodeViews: {
        image: (node, view, getPos) => new ImageNodeView(node, view, getPos as () => number | undefined),
      },
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
      <ProseMirrorToolbar view={viewRef.current} state={currentState} darkMode={darkMode} onImageUpload={onImageUpload} />
      <div ref={mountRef} style={{ minHeight: `${height}px` }} />
      {viewRef.current && currentState && (
        <TableFloatingToolbar view={viewRef.current} state={currentState} darkMode={darkMode} />
      )}
    </div>
  );
}
