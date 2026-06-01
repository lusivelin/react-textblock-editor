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
  onSessionStateChange?: (state: DocumentSessionState) => void;
  persist?: boolean;
  documentId?: string;
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
}

export const RichTextEditorField = forwardRef<RichTextEditorHandle, RichTextEditorFieldProps>(
  function RichTextEditorField(
    {
      value,
      onChange,
      onLocalChange,
      onSave,
      onDiscard,
      onSaveStatusChange,
      onSessionStateChange,
      persist,
      documentId,
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
    },
    ref
  ) {
    const [mounted, setMounted] = useState(!lazyMount);

    const resolvedExtensions = useMemo<EditorExtension[]>(() => {
      const exts = extensions?.length
        ? [...extensions]
        : [...createDefaultEditorExtensions(), createImageExtension(), createTablesExtension()];
      resolveExtensionDependencies(exts);
      return exts;
    }, [extensions]);

    const extensionApis = useMemo(
      () => new Map(resolvedExtensions.map((e) => [e.id, e.getApi?.()])),
      [resolvedExtensions]
    );

    const { featureFlags, persistence } = useMemo(() => {
      const ctx = { documentId: documentId ?? "default", featureFlags: resolveEditorFeatureFlags() };
      const flags = resolveEditorFeatureFlags(resolveExtensionFeatureFlags(resolvedExtensions, ctx));
      const extPersistence = resolveExtensionSessionPersistence(resolvedExtensions, { ...ctx, featureFlags: flags });
      return {
        featureFlags: flags,
        persistence: extPersistence ?? (persist ? { enabled: true } : undefined),
      };
    }, [documentId, persist, resolvedExtensions]);

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

    const handleEditorChange = useCallback(
      (content: string) => {
        handleLocalChange(content);
        void notifyExtensionsOfLocalChange(resolvedExtensions, content, {
          documentId: sessionState.documentId,
          featureFlags: sessionState.featureFlags,
        });
      },
      [handleLocalChange, resolvedExtensions, sessionState.documentId, sessionState.featureFlags]
    );

    useImperativeHandle(
      ref,
      () => ({ getExtensionApi: <T,>(id: string) => extensionApis.get(id) as T | undefined }),
      [extensionApis]
    );

    useEffect(() => {
      onSessionStateChange?.(sessionState);
    }, [onSessionStateChange, sessionState]);

    if (!mounted) {
      return (
        <button
          type="button"
          onClick={() => setMounted(true)}
          className={cn("rtb-pm-trigger", darkMode && "rtb-pm-trigger--dark", className)}
        >
          {localContent && localContent !== "<p><br></p>" ? (
            <span className="rtb-pm-trigger-filled">{filledLabel}</span>
          ) : (
            <span>{emptyLabel}</span>
          )}
        </button>
      );
    }

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
  }
);
