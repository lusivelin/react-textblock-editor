"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../shadcn/lib/utils";
import type { DocumentSessionState } from "../core/document-session";
import type { EditorFeatureFlags } from "../core/editor-features";
import { useDocumentSession } from "../hooks/use-document-session";
import { StructuredEditor } from "./prosemirror/structured-editor";
import type { PersistenceConfig } from "./prosemirror/adapter";
import { loadHtml as amLoad, saveHtml as amSave } from "./prosemirror/automerge/automerge-persistence";

type Status = "idle" | "saving" | "discarding";

export interface RichTextEditorFieldProps {
  value?: string;
  onSave?: (content: string) => void | Promise<void>;
  onDiscard?: (content: string) => void | Promise<void>;
  onLocalChange?: (content: string) => void;
  onSessionStateChange?: (state: DocumentSessionState) => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
  height?: number;
  darkMode?: boolean;
  readOnly?: boolean;
  lazyMount?: boolean;
  emptyLabel?: string;
  filledLabel?: string;
  documentId?: string;
  featureFlags?: EditorFeatureFlags;
  persistence?: PersistenceConfig;
}

export function RichTextEditorField({
  value,
  onSave,
  onDiscard,
  onLocalChange,
  onSessionStateChange,
  onImageUpload,
  placeholder = "Start writing…",
  className,
  height = 400,
  darkMode = false,
  readOnly = false,
  lazyMount = true,
  emptyLabel = "Click to add content…",
  filledLabel = "Click to edit…",
  documentId,
  featureFlags,
  persistence = { kind: "none" },
}: RichTextEditorFieldProps) {
  const [isEditing, setIsEditing] = useState(!lazyMount);
  const [shouldMount, setShouldMount] = useState(!lazyMount);
  const [status, setStatus] = useState<Status>("idle");
  const lastEmittedSessionStateRef = useRef<DocumentSessionState | null>(null);

  // For automerge persistence, load stored HTML once per documentId mount.
  const amInitRef = useRef<{ docId: string; html: string } | null>(null);
  if (persistence.kind === "automerge") {
    const docId = persistence.documentId;
    if (!amInitRef.current || amInitRef.current.docId !== docId) {
      amInitRef.current = { docId, html: amLoad(docId) ?? value ?? "" };
    }
  }

  const effectiveValue =
    persistence.kind === "automerge" && amInitRef.current
      ? amInitRef.current.html
      : value;

  const { localContent, hasUnsavedChanges, handleLocalChange, handleSave, handleDiscard, sessionState } =
    useDocumentSession({
      value: effectiveValue,
      onSave,
      onDiscard,
      onLocalChange,
      documentId,
      featureFlags,
    });

  const handleChangeWithPersist = useCallback(
    (html: string) => {
      if (persistence.kind === "automerge") {
        amSave(persistence.documentId, html);
        // Keep ref in sync so effectiveValue reflects current content after save.
        if (amInitRef.current) amInitRef.current.html = html;
      }
      handleLocalChange(html);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [persistence.kind === "automerge" ? persistence.documentId : null, handleLocalChange]
  );

  useEffect(() => {
    const prev = lastEmittedSessionStateRef.current;
    const changed =
      !prev ||
      prev.documentId !== sessionState.documentId ||
      prev.savedContent !== sessionState.savedContent ||
      prev.draftContent !== sessionState.draftContent ||
      prev.hasUnsavedChanges !== sessionState.hasUnsavedChanges ||
      prev.hasPersistedDraft !== sessionState.hasPersistedDraft ||
      prev.persistenceKey !== sessionState.persistenceKey ||
      prev.featureFlags.offline !== sessionState.featureFlags.offline ||
      prev.featureFlags.comments !== sessionState.featureFlags.comments ||
      prev.featureFlags.trackedChanges !== sessionState.featureFlags.trackedChanges ||
      prev.featureFlags.collaboration !== sessionState.featureFlags.collaboration ||
      prev.featureFlags.ai !== sessionState.featureFlags.ai;
    if (!changed) return;
    lastEmittedSessionStateRef.current = sessionState;
    onSessionStateChange?.(sessionState);
  }, [onSessionStateChange, sessionState]);

  useEffect(() => {
    if (!lazyMount || !isEditing || shouldMount) return;
    const id = setTimeout(() => setShouldMount(true), 0);
    return () => clearTimeout(id);
  }, [isEditing, lazyMount, shouldMount]);

  const handleOpen = useCallback(() => {
    setIsEditing(true);
    setShouldMount(true);
  }, []);

  const wrappedHandleSave = useCallback(async () => {
    setStatus("saving");
    try { await handleSave(); } finally { setStatus("idle"); }
  }, [handleSave]);

  const wrappedHandleDiscard = useCallback(async () => {
    setStatus("discarding");
    try { await handleDiscard(); } finally { setStatus("idle"); }
  }, [handleDiscard]);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full min-h-[80px] px-4 py-3 text-left border rounded cursor-text text-[14px] transition-colors",
          darkMode
            ? "border-dashed border-white/[0.12] bg-[#141618] text-white/40 hover:border-white/[0.2] hover:text-white/50"
            : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400",
          className
        )}
      >
        {localContent && localContent !== "<p><br></p>"
          ? <span className={darkMode ? "text-slate-200" : "text-gray-700"}>{filledLabel}</span>
          : <span>{emptyLabel}</span>}
      </button>
    );
  }

  if (!shouldMount) return null;

  return (
    <StructuredEditor
      value={localContent || "<p><br></p>"}
      onChange={handleChangeWithPersist}
      onImageUpload={onImageUpload}
      placeholder={placeholder}
      className={className}
      readOnly={readOnly}
      height={height}
      darkMode={darkMode}
      onSave={onSave ? () => void wrappedHandleSave() : undefined}
      onDiscard={onDiscard ? () => void wrappedHandleDiscard() : undefined}
      hasUnsavedChanges={hasUnsavedChanges}
      isSaving={status === "saving"}
      isDiscarding={status === "discarding"}
      sessionState={sessionState}
    />
  );
}
