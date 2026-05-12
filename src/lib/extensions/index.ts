export { createDefaultEditorExtensions, createDefaultFormattingExtension } from "./default-tools";
export { createImageExtension } from "./images";
export type { ImageExtensionApi, ImageExtensionOptions, ImageInsertOptions, ImageInsertResult } from "./images";
export { createLocalFirstExtension } from "./local-first";
export type { LocalFirstExtensionOptions } from "./local-first";
export { createTablesExtension } from "./tables";
export type { TablesExtensionOptions } from "./tables";
export { composeExtensions } from "./shared/compose-extensions";
export type { MaybeEditorExtension } from "./shared/compose-extensions";
