export { RichTextEditorField } from "./components/rich-text-editor-field";
export type { RichTextEditorFieldProps, LocalDraftConfig, RichTextEditorHandle } from "./components/rich-text-editor-field";

export { RichTextRenderer } from "./components/rich-text-renderer";

export {
  sanitizeRichTextContent,
  isContentSafe,
  getSanitizationReport,
} from "./utils/sanitize-rich-text";

export { defaultTheme, darkTheme, minimalTheme } from "./styles/themes";

export type { SaveStatus } from "./core/document-session";
export type { EditorClassNames } from "./core/document-model";
export type { EditorExtension, EditorOverlayProps, EditorOverlayItem, EditorSchemaSpec } from "./core/editor-extension";
export {
  createDefaultEditorExtensions,
  createDefaultFormattingExtension,
  createImageExtension,
  createLocalFirstExtension,
  createTablesExtension,
  composeExtensions,
} from "./extensions";
export type {
  ImageExtensionApi,
  ImageExtensionOptions,
  ImageInsertOptions,
  ImageInsertResult,
  LocalFirstExtensionOptions,
  TablesExtensionOptions,
  MaybeEditorExtension,
} from "./extensions";
