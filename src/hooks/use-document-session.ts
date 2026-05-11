import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDraftStorageKey,
  parseStoredDocumentDraft,
  resolveDocumentId,
  type DocumentSessionOptions,
  type DocumentSessionState,
} from "../core/document-session";
import { resolveEditorFeatureFlags } from "../core/editor-features";

interface UseDocumentSessionProps extends DocumentSessionOptions {
  value?: string;
  onSave?: (content: string) => void | Promise<void>;
  onDiscard?: (content: string) => void | Promise<void>;
  onLocalChange?: (content: string) => void;
}

interface UseDocumentSessionReturn {
  localContent: string;
  hasUnsavedChanges: boolean;
  handleLocalChange: (content: string) => void;
  handleSave: () => Promise<void>;
  handleDiscard: () => Promise<void>;
  clearPersistedDraft: () => void;
  sessionState: DocumentSessionState;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function useDocumentSession({
  value,
  onSave,
  onDiscard,
  onLocalChange,
  documentId,
  featureFlags,
  persistence,
}: UseDocumentSessionProps): UseDocumentSessionReturn {
  const currentValue = value || "";
  const resolvedDocumentId = useMemo(() => resolveDocumentId(documentId), [documentId]);
  const resolvedFeatureFlags = useMemo(() => resolveEditorFeatureFlags(featureFlags), [featureFlags]);
  const persistenceEnabled = Boolean(persistence?.enabled ?? resolvedFeatureFlags.offline);
  const persistenceKey = useMemo(
    () => (persistenceEnabled ? createDraftStorageKey(resolvedDocumentId, persistence?.storageKey) : null),
    [persistenceEnabled, persistence?.storageKey, resolvedDocumentId]
  );

  const [localContent, setLocalContent] = useState(currentValue);
  const [lastSavedContent, setLastSavedContent] = useState(currentValue);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasPersistedDraft, setHasPersistedDraft] = useState(false);
  const hydratedDraftKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!persistenceKey || hydratedDraftKeyRef.current === persistenceKey || !canUseLocalStorage()) {
      return;
    }

    hydratedDraftKeyRef.current = persistenceKey;

    const storedDraft = parseStoredDocumentDraft(window.localStorage.getItem(persistenceKey));
    if (!storedDraft) {
      setHasPersistedDraft(false);
      return;
    }

    if (storedDraft.content === currentValue) {
      window.localStorage.removeItem(persistenceKey);
      setHasPersistedDraft(false);
      return;
    }

    setLocalContent(storedDraft.content);
    setLastSavedContent(storedDraft.savedContent);
    setHasUnsavedChanges(true);
    setHasPersistedDraft(true);
  }, [currentValue, persistenceKey]);

  useEffect(() => {
    if (hasUnsavedChanges) return;
    setLocalContent(currentValue);
    setLastSavedContent(currentValue);
  }, [currentValue, hasUnsavedChanges]);

  useEffect(() => {
    if (!persistenceKey || !canUseLocalStorage()) {
      setHasPersistedDraft(false);
      return;
    }

    if (!persistenceEnabled || !hasUnsavedChanges) {
      window.localStorage.removeItem(persistenceKey);
      setHasPersistedDraft(false);
      return;
    }

    const nextDraft = JSON.stringify({
      content: localContent,
      savedContent: lastSavedContent,
      updatedAt: Date.now(),
    });
    window.localStorage.setItem(persistenceKey, nextDraft);
    setHasPersistedDraft(true);
  }, [hasUnsavedChanges, lastSavedContent, localContent, persistenceEnabled, persistenceKey]);

  const clearPersistedDraft = useCallback(() => {
    if (!persistenceKey || !canUseLocalStorage()) return;
    window.localStorage.removeItem(persistenceKey);
    setHasPersistedDraft(false);
  }, [persistenceKey]);

  const handleLocalChange = useCallback(
    (content: string) => {
      setLocalContent(content);
      setHasUnsavedChanges(true);
      onLocalChange?.(content);
    },
    [onLocalChange]
  );

  const handleSave = useCallback(async () => {
    await onSave?.(localContent);
    setLastSavedContent(localContent);
    setHasUnsavedChanges(false);
    clearPersistedDraft();
  }, [clearPersistedDraft, localContent, onSave]);

  const handleDiscard = useCallback(async () => {
    const nextContent = currentValue;
    await onDiscard?.(nextContent);
    setLocalContent(nextContent);
    setLastSavedContent(nextContent);
    setHasUnsavedChanges(false);
    clearPersistedDraft();
  }, [clearPersistedDraft, currentValue, onDiscard]);

  const sessionState = useMemo<DocumentSessionState>(
    () => ({
      documentId: resolvedDocumentId,
      savedContent: lastSavedContent,
      draftContent: localContent,
      hasUnsavedChanges,
      hasPersistedDraft,
      persistenceKey,
      featureFlags: resolvedFeatureFlags,
    }),
    [
      hasPersistedDraft,
      hasUnsavedChanges,
      lastSavedContent,
      localContent,
      persistenceKey,
      resolvedDocumentId,
      resolvedFeatureFlags,
    ]
  );

  return {
    localContent,
    hasUnsavedChanges,
    handleLocalChange,
    handleSave,
    handleDiscard,
    clearPersistedDraft,
    sessionState,
  };
}
