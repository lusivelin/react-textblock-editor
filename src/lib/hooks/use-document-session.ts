import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDraftStorageKey,
  parseStoredDocumentDraft,
  resolveDocumentId,
  type DocumentSessionOptions,
  type DocumentSessionState,
  type SaveStatus,
} from "@lib/core/document-session";

import { resolveEditorFeatureFlags } from "@lib/core/editor-features";

interface UseDocumentSessionProps extends DocumentSessionOptions {
  value?: string;
  /** Fires on every keystroke. */
  onChange?: (content: string) => void;
  onLocalChange?: (content: string) => void;
  onSave?: (content: string) => void | Promise<void>;
  onDiscard?: (content: string) => void | Promise<void>;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

interface UseDocumentSessionReturn {
  localContent: string;
  saveStatus: SaveStatus;
  handleLocalChange: (content: string) => void;
  handleSave: () => Promise<void>;
  handleDiscard: () => Promise<void>;
  sessionState: DocumentSessionState;
}

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function useDocumentSession({
  value,
  onChange,
  onLocalChange,
  onSave,
  onDiscard,
  onSaveStatusChange,
  documentId,
  featureFlags,
  persistence,
}: UseDocumentSessionProps): UseDocumentSessionReturn {
  const currentValue = value || "";
  const resolvedDocumentId = useMemo(() => resolveDocumentId(documentId), [documentId]);
  const resolvedFeatureFlags = useMemo(() => resolveEditorFeatureFlags(featureFlags), [featureFlags]);
  const persistenceEnabled = Boolean(persistence?.enabled);
  const persistenceKey = useMemo(
    () => (persistenceEnabled ? createDraftStorageKey(resolvedDocumentId, persistence?.storageKey) : null),
    [persistenceEnabled, persistence?.storageKey, resolvedDocumentId]
  );

  const [localContent, setLocalContent] = useState(currentValue);
  const [lastSavedContent, setLastSavedContent] = useState(currentValue);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [hasPersistedDraft, setHasPersistedDraft] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const hydratedDraftKeyRef = useRef<string | null>(null);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveStatusChangeRef = useRef(onSaveStatusChange);
  onSaveStatusChangeRef.current = onSaveStatusChange;
  const onDiscardRef = useRef(onDiscard);
  onDiscardRef.current = onDiscard;

  const prevStatusRef = useRef<SaveStatus>("idle");
  useEffect(() => {
    if (saveStatus === prevStatusRef.current) return;
    prevStatusRef.current = saveStatus;
    onSaveStatusChangeRef.current?.(saveStatus);
  }, [saveStatus]);

  useEffect(() => {
    if (!persistenceKey || hydratedDraftKeyRef.current === persistenceKey || !canUseLocalStorage()) return;
    hydratedDraftKeyRef.current = persistenceKey;

    const storedDraft = parseStoredDocumentDraft(window.localStorage.getItem(persistenceKey));
    if (!storedDraft) { setHasPersistedDraft(false); return; }
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
    if (!persistenceKey || !canUseLocalStorage()) { setHasPersistedDraft(false); return; }
    if (!persistenceEnabled || !hasUnsavedChanges) {
      window.localStorage.removeItem(persistenceKey);
      setHasPersistedDraft(false);
      return;
    }
    window.localStorage.setItem(persistenceKey, JSON.stringify({
      content: localContent,
      savedContent: lastSavedContent,
      updatedAt: Date.now(),
    }));
    setHasPersistedDraft(true);
  }, [hasUnsavedChanges, lastSavedContent, localContent, persistenceEnabled, persistenceKey]);

  const clearPersistedDraft = useCallback(() => {
    if (!persistenceKey || !canUseLocalStorage()) return;
    window.localStorage.removeItem(persistenceKey);
    setHasPersistedDraft(false);
  }, [persistenceKey]);

  const handleLocalChange = useCallback((content: string) => {
    setLocalContent(content);
    setHasUnsavedChanges(true);
    (onChange ?? onLocalChange)?.(content);
  }, [onChange, onLocalChange]);

  const handleSave = useCallback(async () => {
    if (!onSave) return;
    setSaveStatus("saving");
    try {
      await onSave(localContent);
    } catch {
      setSaveStatus("error");
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = setTimeout(() => setSaveStatus("idle"), 3000);
      return;
    }
    setLastSavedContent(localContent);
    setHasUnsavedChanges(false);
    clearPersistedDraft();
    setSaveStatus("saved");
    if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
    savedResetTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
  }, [clearPersistedDraft, localContent, onSave]);

  const handleDiscard = useCallback(async () => {
    setLocalContent(currentValue);
    setLastSavedContent(currentValue);
    setHasUnsavedChanges(false);
    clearPersistedDraft();
    await onDiscardRef.current?.(currentValue);
  }, [clearPersistedDraft, currentValue]);

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
    [hasPersistedDraft, hasUnsavedChanges, lastSavedContent, localContent, persistenceKey, resolvedDocumentId, resolvedFeatureFlags]
  );

  return { localContent, saveStatus, handleLocalChange, handleSave, handleDiscard, sessionState };
}
