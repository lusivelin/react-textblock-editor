import type { EditorExtension, EditorExtensionContext, EditorExtensionInitialValueContext } from "@lib/core/editor-extension";
import { createAutoStorage } from "./storage";

export interface LocalFirstExtensionOptions {
  documentId: string;
  storageKey?: string;
  /** Set to true to activate local-first persistence. Default: false. */
  enabled?: boolean;
}

function createContextDocumentId(
  options: LocalFirstExtensionOptions,
  context: EditorExtensionContext | EditorExtensionInitialValueContext
): string {
  return options.documentId || context.documentId;
}

export function createLocalFirstExtension(options: LocalFirstExtensionOptions): EditorExtension | null {
  if (!options.enabled) return null;
  const storage = createAutoStorage();

  return {
    id: "local-first",
    getFeatureFlags: () => ({ offline: true }),
    getSessionPersistence: (context) => ({
      enabled: true,
      storageKey: options.storageKey ?? `loom-editor:draft:${createContextDocumentId(options, context)}`,
    }),
    async getInitialValue(context) {
      const documentId = createContextDocumentId(options, context);
      return (await storage.load(documentId)) ?? context.value;
    },
    async onLocalChange(html, context) {
      const documentId = createContextDocumentId(options, context);
      await storage.save(documentId, html);
    },
  };
}
