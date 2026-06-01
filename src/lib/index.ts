export { RichTextEditorField } from "./components/rich-text-editor-field";
export type { RichTextEditorFieldProps, RichTextEditorHandle } from "./components/rich-text-editor-field";

export { RichTextRenderer } from "./components/rich-text-renderer";

export {
  sanitizeRichTextContent,
  isContentSafe,
  getSanitizationReport,
} from "./utils/sanitize-rich-text";

export { defaultTheme, darkTheme, minimalTheme } from "./styles/themes";

export type { SaveStatus } from "./core/document-session";
export type { EditorClassNames } from "./core/document-model";
export type { EditorFeatureFlags, ResolvedEditorFeatureFlags } from "./core/editor-features";
export type {
  EditorExtension,
  EditorExtensionContext,
  EditorExtensionInitialValueContext,
  EditorExtensionRuntimeContext,
  EditorEventHandlers,
  EditorOverlayProps,
  EditorOverlayItem,
  EditorSchemaSpec,
  EditorToolbarItem,
  EditorToolbarItemProps,
} from "./core/editor-extension";
export {
  createDefaultEditorExtensions,
  createDefaultFormattingExtension,
  createHtmlSourceExtension,
  createImageExtension,
  createTablesExtension,
  composeExtensions,
} from "./extensions";
export type {
  ImageExtensionApi,
  ImageExtensionOptions,
  ImageInsertOptions,
  ImageInsertResult,
  TablesExtensionOptions,
  MaybeEditorExtension,
} from "./extensions";
