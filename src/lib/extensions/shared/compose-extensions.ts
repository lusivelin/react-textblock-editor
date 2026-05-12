import type { EditorExtension } from "@lib/core/editor-extension";

export type MaybeEditorExtension = EditorExtension | null | false | undefined;

export function composeExtensions(...extensions: MaybeEditorExtension[]): EditorExtension[] {
  return extensions.filter((extension): extension is EditorExtension => Boolean(extension));
}
