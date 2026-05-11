/**
 * Public component entry points for the editor shell, generic field wrapper,
 * frontend renderer, and Sanity adapter.
 */

export { RichTextEditor } from "./rich-text-editor";
export { RichTextEditorField } from "./rich-text-editor-field";
export { RichTextRenderer } from "./rich-text-renderer";
export { createProseMirrorAdapter } from "./prosemirror/adapter";
export type { ProseMirrorAdapterOptions } from "./prosemirror/adapter";
