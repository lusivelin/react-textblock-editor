import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { cn } from "@lib/utils/cn";
import type { DocumentSessionState, SaveStatus } from "@lib/core/document-session";
import { useDocumentSession } from "@lib/hooks/use-document-session";
import { StructuredEditor } from "./prosemirror/structured-editor";
import type { EditorClassNames } from "@lib/core/document-model";
import type { EditorExtension } from "@lib/core/editor-extension";
import {
  notifyExtensionsOfLocalChange,
  resolveExtensionFeatureFlags,
  resolveExtensionSessionPersistence,
  resolveExtensionDependencies,
} from "@lib/core/editor-extension";
import { resolveEditorFeatureFlags } from "@lib/core/editor-features";
import {
  createDefaultEditorExtensions,
  createImageExtension,
  createTablesExtension,
} from "@lib/extensions";

export interface RichTextEditorHandle {
  getExtensionApi: <T = unknown>(extensionId: string) => T | undefined;
}

export interface RichTextEditorFieldProps {
  value?: string;
  onChange?: (html: string) => void;
  onSave?: (html: string) => void | Promise<void>;
  onDiscard?: (html: string) => void | Promise<void>;
  onSaveStatusChange?: (status: SaveStatus) => void;
  persist?: boolean;
  documentId?: string;
  onImageUpload?: (file: File) => Promise<string>;
  extensions?: EditorExtension[];
  placeholder?: string;
  height?: number;
  darkMode?: boolean;
  readOnly?: boolean;
  lazyMount?: boolean;
  emptyLabel?: string;
  filledLabel?: string;
  className?: string;
  classNames?: EditorClassNames;
  theme?: string;
  onLocalChange?: (html: string) => void;
  onSessionStateChange?: (state: DocumentSessionState) => void;
}

export const RichTextEditorField = forwardRef<RichTextEditorHandle, RichTextEditorFieldProps>(function RichTextEditorField({
  value,
  onChange,
  onLocalChange,
  onSave,
  onDiscard,
  onSaveStatusChange,
  persist,
  documentId,
  onImageUpload,
  extensions,
  placeholder = "Start writing…",
  className,
  height = 400,
  darkMode = false,
  readOnly = false,
  lazyMount = true,
  emptyLabel = "Click to add content…",
  filledLabel = "Click to edit…",
  classNames,
  theme,
  onSessionStateChange,
}, ref) {
  const [isEditing, setIsEditing] = useState(!lazyMount);
  const [shouldMount, setShouldMount] = useState(!lazyMount);
  const lastEmittedSessionStateRef = useRef<DocumentSessionState | null>(null);

  const resolvedExtensions = useMemo<EditorExtension[]>(() => {
    const exts =
      extensions && extensions.length > 0
        ? [...extensions]
        : [
            ...createDefaultEditorExtensions(),
            createImageExtension({ onUpload: onImageUpload }),
            createTablesExtension(),
          ];

    if (onImageUpload && !exts.find((e) => e.id === "images")) {
      exts.push(createImageExtension({ onUpload: onImageUpload }));
    }

    resolveExtensionDependencies(exts);
    return exts;
  }, [extensions, onImageUpload]);

  const extensionApis = useMemo(
    () => new Map(resolvedExtensions.map((e) => [e.id, e.getApi?.()] as const)),
    [resolvedExtensions]
  );

  const extensionContext = useMemo(
    () => ({ documentId: documentId ?? "default", featureFlags: resolveEditorFeatureFlags() }),
    [documentId]
  );

  const featureFlags = useMemo(
    () => resolveEditorFeatureFlags(resolveExtensionFeatureFlags(resolvedExtensions, extensionContext)),
    [extensionContext, resolvedExtensions]
  );

  const extensionPersistence = useMemo(
    () => resolveExtensionSessionPersistence(resolvedExtensions, { ...extensionContext, featureFlags }),
    [extensionContext, featureFlags, resolvedExtensions]
  );

  const persistence = useMemo(
    () => extensionPersistence ?? (persist ? { enabled: true } : undefined),
    [extensionPersistence, persist]
  );

  const { localContent, saveStatus, handleLocalChange, handleSave, handleDiscard, sessionState } =
    useDocumentSession({
      value,
      onChange,
      onLocalChange,
      onSave,
      onDiscard,
      onSaveStatusChange,
      documentId,
      featureFlags,
      persistence,
    });

  const handleEditorChange = useCallback((content: string) => {
    handleLocalChange(content);
    void notifyExtensionsOfLocalChange(resolvedExtensions, content, {
      documentId: sessionState.documentId,
      featureFlags: sessionState.featureFlags,
    });
  }, [handleLocalChange, resolvedExtensions, sessionState.documentId, sessionState.featureFlags]);

  useImperativeHandle(ref, () => ({
    getExtensionApi: <T,>(extensionId: string) => extensionApis.get(extensionId) as T | undefined,
  }), [extensionApis]);

  useEffect(() => {
    const prev = lastEmittedSessionStateRef.current;
    const changed =
      !prev ||
      prev.documentId !== sessionState.documentId ||
      prev.savedContent !== sessionState.savedContent ||
      prev.draftContent !== sessionState.draftContent ||
      prev.hasUnsavedChanges !== sessionState.hasUnsavedChanges ||
      prev.hasPersistedDraft !== sessionState.hasPersistedDraft ||
      prev.persistenceKey !== sessionState.persistenceKey;
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

  if (!isEditing) {
    return (
      <button
        type="button"
        onClick={handleOpen}
        className={cn("rtb-pm-trigger", darkMode && "rtb-pm-trigger--dark", className)}
      >
        {localContent && localContent !== "<p><br></p>"
          ? <span className="rtb-pm-trigger-filled">{filledLabel}</span>
          : <span>{emptyLabel}</span>}
      </button>
    );
  }

  if (!shouldMount) return null;

  return (
    <StructuredEditor
      value={localContent || "<p><br></p>"}
      onChange={handleEditorChange}
      onSave={onSave ? handleSave : undefined}
      onDiscard={onDiscard ? handleDiscard : undefined}
      placeholder={placeholder}
      className={className}
      classNames={classNames}
      readOnly={readOnly}
      height={height}
      darkMode={darkMode}
      saveStatus={saveStatus}
      sessionState={sessionState}
      extensions={resolvedExtensions}
      theme={theme}
    />
  );
});
