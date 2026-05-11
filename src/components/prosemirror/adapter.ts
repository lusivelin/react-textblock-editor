import { createElement } from "react";
import type { EditorView } from "prosemirror-view";
import type { DocumentModelAdapter, StructuredEditorRenderProps } from "../../core/document-model";
import { StructuredEditor } from "./structured-editor";

export type PersistenceConfig =
  | { kind: "none" }
  | { kind: "automerge"; documentId: string };

export interface ProseMirrorAdapterOptions {
  id?: string;
  label?: string;
  description?: string;
  persistence?: PersistenceConfig;
  /** Called once the EditorView is ready. */
  onEditorReady?: (view: EditorView) => void;
}

export function createProseMirrorAdapter(options: ProseMirrorAdapterOptions = {}): DocumentModelAdapter {
  const {
    id = "prosemirror-adapter",
    label = "ProseMirror editor",
    description = "Raw ProseMirror editor — prosemirror-state/view/model.",
  } = options;

  return {
    id,
    mode: "structured",
    label,
    description,
    render: (props: StructuredEditorRenderProps) => createElement(StructuredEditor, props),
  };
}
