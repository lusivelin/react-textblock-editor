import { createElement } from "react";
import type { EditorView } from "prosemirror-view";
import type { DocumentModelAdapter } from "../../core/document-model";
import { StructuredEditor } from "./structured-editor";

export interface ProseMirrorAdapterOptions {
  id?: string;
  label?: string;
  description?: string;
  /** Called once the EditorView is ready — hook point for future Automerge binding. */
  onEditorReady?: (view: EditorView) => void;
}

export function createProseMirrorAdapter(options: ProseMirrorAdapterOptions = {}): DocumentModelAdapter {
  const {
    id = "prosemirror-adapter",
    label = "ProseMirror editor",
    description = "Raw ProseMirror editor backed by prosemirror-state/view/model.",
  } = options;

  return {
    id,
    mode: "structured",
    label,
    description,
    render: (props) => createElement(StructuredEditor, props),
  };
}
