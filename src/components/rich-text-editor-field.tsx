"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "../shadcn/lib/utils";
import type { DocumentModelAdapter, EditorMode } from "../core/document-model";
import type { DocumentSessionState } from "../core/document-session";
import type { EditorFeatureFlags } from "../core/editor-features";
import { useDocumentSession } from "../hooks/use-document-session";
import { RichTextEditor } from "./rich-text-editor";
import { StructuredEditorFallback } from "./structured-editor-fallback";

type Status = "idle" | "opening" | "saving" | "discarding";

interface RichTextEditorFieldProps {
  value?: string;
  onSave?: (content: string) => void | Promise<void>;
  onDiscard?: (content: string) => void | Promise<void>;
  onLocalChange?: (content: string) => void;
  onSessionStateChange?: (state: DocumentSessionState) => void;
  onImageUpload?: (file: File) => Promise<string>;
  editorPlaceholder?: string;
  className?: string;
  height?: number;
  showVariables?: boolean;
  darkMode?: boolean;
  readOnly?: boolean;
  lazyMount?: boolean;
  emptyLabel?: string;
  filledLabel?: string;
  documentId?: string;
  featureFlags?: EditorFeatureFlags;
  persistLocalDrafts?: boolean;
  draftStorageKey?: string;
  editorMode?: EditorMode;
  documentModelAdapter?: DocumentModelAdapter;
}

/**
 * Reusable field wrapper for the custom rich text editor outside Sanity.
 *
 * It provides the same buffered save/discard behavior as the Studio input but
 * exposes plain HTML callbacks so other app surfaces can adopt the editor.
 */
export function RichTextEditorField({
  value,
  onSave,
  onDiscard,
  onLocalChange,
  onSessionStateChange,
  onImageUpload,
  editorPlaceholder = "Enter rich text content...",
  className,
  height = 400,
  showVariables = false,
  darkMode = false,
  readOnly = false,
  lazyMount = true,
  emptyLabel = "Click to add rich text content…",
  filledLabel = "Click to edit rich text content…",
  documentId,
  featureFlags,
  persistLocalDrafts,
  draftStorageKey,
  editorMode = "html",
  documentModelAdapter,
}: RichTextEditorFieldProps) {
  const [isEditing, setIsEditing] = useState(!lazyMount);
  const [shouldMount, setShouldMount] = useState(!lazyMount);
  const [status, setStatus] = useState<Status>(lazyMount ? "idle" : "opening");
  const lastEmittedSessionStateRef = useRef<DocumentSessionState | null>(null);
  const { localContent, hasUnsavedChanges, handleLocalChange, handleSave, handleDiscard, sessionState } =
    useDocumentSession({
      value,
      onSave,
      onDiscard,
      onLocalChange,
      documentId,
      featureFlags,
      persistence: {
        enabled: persistLocalDrafts,
        storageKey: draftStorageKey,
      },
    });

  useEffect(() => {
    const previousState = lastEmittedSessionStateRef.current;
    const hasChanged =
      !previousState ||
      previousState.documentId !== sessionState.documentId ||
      previousState.savedContent !== sessionState.savedContent ||
      previousState.draftContent !== sessionState.draftContent ||
      previousState.hasUnsavedChanges !== sessionState.hasUnsavedChanges ||
      previousState.hasPersistedDraft !== sessionState.hasPersistedDraft ||
      previousState.persistenceKey !== sessionState.persistenceKey ||
      previousState.featureFlags.offline !== sessionState.featureFlags.offline ||
      previousState.featureFlags.comments !== sessionState.featureFlags.comments ||
      previousState.featureFlags.trackedChanges !== sessionState.featureFlags.trackedChanges ||
      previousState.featureFlags.collaboration !== sessionState.featureFlags.collaboration ||
      previousState.featureFlags.ai !== sessionState.featureFlags.ai;

    if (!hasChanged) return;

    lastEmittedSessionStateRef.current = sessionState;
    onSessionStateChange?.(sessionState);
  }, [onSessionStateChange, sessionState]);

  useEffect(() => {
    if (!lazyMount || !isEditing || shouldMount) return;
    const id = setTimeout(() => setShouldMount(true), 0);
    return () => clearTimeout(id);
  }, [isEditing, lazyMount, shouldMount]);

  useEffect(() => {
    if (shouldMount && editorMode === "structured" && status === "opening") {
      setStatus("idle");
    }
  }, [editorMode, shouldMount, status]);

  const handleOpen = useCallback(() => {
    setIsEditing(true);
    setStatus("opening");
  }, []);

  const handleReady = useCallback(() => {
    setStatus("idle");
  }, []);

  const wrappedHandleSave = useCallback(async () => {
    setStatus("saving");
    try {
      await handleSave();
    } finally {
      setStatus("idle");
    }
  }, [handleSave]);

  const wrappedHandleDiscard = useCallback(async () => {
    setStatus("discarding");
    try {
      await handleDiscard();
    } finally {
      setStatus("idle");
    }
  }, [handleDiscard]);

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "w-full min-h-[80px] px-4 py-3 text-left border rounded cursor-text text-[14px] transition-colors",
          darkMode
            ? "border-dashed border-white/[0.12] bg-[#141618] text-white/40 shadow-[0_2px_8px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.04)] hover:border-white/[0.2] hover:text-white/50"
            : "border-dashed border-slate-300 bg-slate-50 text-slate-500 hover:border-slate-400",
          className
        )}
      >
        {localContent && localContent !== "<p><br></p>" ? (
          <span className={darkMode ? "text-slate-200" : "text-gray-700"}>{filledLabel}</span>
        ) : (
          <span>{emptyLabel}</span>
        )}
      </button>
    );
  }

  return (
    <div className={cn("rich-text-editor-field relative", className)}>
      {(status === "opening" || !shouldMount) && (
        <div
          className={cn(
            "absolute inset-0 z-10 flex items-center justify-center gap-[10px] rounded text-[14px] min-h-[80px]",
            darkMode ? "bg-[rgba(15,23,42,0.85)] text-slate-400" : "bg-[rgba(248,250,252,0.9)] text-slate-600"
          )}
        >
          <span className="w-[18px] h-[18px] rounded-full border-2 border-current border-t-transparent inline-block animate-spin" />
          Opening editor…
        </div>
      )}
      {shouldMount && (
        <>
          {editorMode === "structured" ? (
            documentModelAdapter ? (
              documentModelAdapter.render({
                value: localContent || "<p><br></p>",
                onChange: handleLocalChange,
                placeholder: editorPlaceholder,
                className,
                readOnly,
                height,
                darkMode,
                onSave: onSave ? () => void wrappedHandleSave() : undefined,
                onDiscard: onDiscard ? () => void wrappedHandleDiscard() : undefined,
                hasUnsavedChanges,
                isSaving: status === "saving",
                isDiscarding: status === "discarding",
                sessionState,
              })
            ) : (
              <StructuredEditorFallback
                className={className}
                darkMode={darkMode}
                height={height}
                hasUnsavedChanges={hasUnsavedChanges}
                isSaving={status === "saving"}
                isDiscarding={status === "discarding"}
                onSave={onSave ? () => void wrappedHandleSave() : undefined}
                onDiscard={onDiscard ? () => void wrappedHandleDiscard() : undefined}
              />
            )
          ) : (
            <RichTextEditor
              value={localContent || "<p><br></p>"}
              onChange={handleLocalChange}
              onImageUpload={onImageUpload}
              placeholder={editorPlaceholder}
              className={className}
              readOnly={readOnly}
              height={height}
              showVariables={showVariables}
              darkMode={darkMode}
              onReady={handleReady}
              isSaving={status === "saving"}
              isDiscarding={status === "discarding"}
              onSave={() => {
                void wrappedHandleSave();
              }}
              onDiscard={() => {
                void wrappedHandleDiscard();
              }}
              hasUnsavedChanges={hasUnsavedChanges}
              featureFlags={sessionState.featureFlags}
            />
          )}
        </>
      )}
    </div>
  );
}
