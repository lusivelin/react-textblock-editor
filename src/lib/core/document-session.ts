import type { EditorFeatureFlags, ResolvedEditorFeatureFlags } from "./editor-features";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export interface DocumentSessionPersistenceOptions {
  enabled?: boolean;
  storageKey?: string;
}

export interface DocumentSessionOptions {
  documentId?: string;
  featureFlags?: EditorFeatureFlags;
  persistence?: DocumentSessionPersistenceOptions;
}

export interface StoredDocumentDraft {
  content: string;
  savedContent: string;
  updatedAt: number;
}

export interface DocumentSessionState {
  documentId: string;
  savedContent: string;
  draftContent: string;
  hasUnsavedChanges: boolean;
  hasPersistedDraft: boolean;
  persistenceKey: string | null;
  featureFlags: ResolvedEditorFeatureFlags;
}

const DEFAULT_DOCUMENT_ID = "default";

export function resolveDocumentId(documentId?: string): string {
  return documentId?.trim() || DEFAULT_DOCUMENT_ID;
}

export function createDraftStorageKey(documentId?: string, storageKey?: string): string {
  if (storageKey?.trim()) return storageKey;
  return `rtb-editor:draft:${resolveDocumentId(documentId)}`;
}

export function parseStoredDocumentDraft(raw: string | null): StoredDocumentDraft | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredDocumentDraft>;
    if (typeof parsed.content !== "string" || typeof parsed.savedContent !== "string") {
      return null;
    }

    return {
      content: parsed.content,
      savedContent: parsed.savedContent,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

