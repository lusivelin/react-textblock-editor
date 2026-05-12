import type { DocumentSessionPersistenceOptions } from "./document-session";
import type { ResolvedEditorFeatureFlags } from "./editor-features";
import type { Command, EditorState, Plugin } from "prosemirror-state";
import type { MarkSpec, NodeSpec, Schema } from "prosemirror-model";
import type React from "react";
import type { DirectEditorProps, EditorView } from "prosemirror-view";

type MaybePromise<T> = T | Promise<T>;
type ProseMirrorNodeViews = NonNullable<DirectEditorProps["nodeViews"]>;

export interface EditorExtensionContext {
  documentId: string;
  featureFlags: ResolvedEditorFeatureFlags;
}

export interface EditorExtensionInitialValueContext extends EditorExtensionContext {
  value?: string;
}

export interface EditorToolbarItemProps {
  view: EditorView;
  state: EditorState;
  schema: Schema;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

export interface EditorOverlayProps extends EditorToolbarItemProps {
  darkMode?: boolean;
}

export interface EditorToolbarItem {
  id: string;
  group: "history" | "inline" | "block" | "insert" | "view" | string;
  priority?: number;
  render: (props: EditorToolbarItemProps) => React.ReactNode;
}

export interface EditorOverlayItem {
  id: string;
  render: (props: EditorOverlayProps) => React.ReactNode;
}

export interface EditorSchemaSpec {
  nodes?: Record<string, NodeSpec>;
  marks?: Record<string, MarkSpec>;
}

export interface EditorExtensionRuntimeContext extends EditorExtensionContext {
  schema: Schema;
}

export interface EditorExtension {
  id: string;
  dependsOn?: string[];
  getFeatureFlags?: (context: EditorExtensionContext) => Partial<ResolvedEditorFeatureFlags>;
  getSessionPersistence?: (context: EditorExtensionContext) => DocumentSessionPersistenceOptions | undefined;
  getInitialValue?: (context: EditorExtensionInitialValueContext) => MaybePromise<string | undefined>;
  onLocalChange?: (html: string, context: EditorExtensionContext) => MaybePromise<void>;
  getApi?: () => unknown;
  getSchema?: () => EditorSchemaSpec | undefined;
  getPlugins?: (context: EditorExtensionRuntimeContext) => Plugin[];
  getKeymap?: (context: EditorExtensionRuntimeContext) => Record<string, Command>;
  getNodeViews?: (context: EditorExtensionRuntimeContext) => ProseMirrorNodeViews | undefined;
  getToolbarItems?: (context: EditorExtensionRuntimeContext) => EditorToolbarItem[];
  getOverlays?: (context: EditorExtensionRuntimeContext) => EditorOverlayItem[];
}

export function resolveExtensionDependencies(extensions: EditorExtension[]): void {
  const extensionIds = new Set(extensions.map((extension) => extension.id));
  for (const extension of extensions) {
    for (const dependency of extension.dependsOn ?? []) {
      if (!extensionIds.has(dependency)) {
        throw new Error(`Editor extension "${extension.id}" requires missing dependency "${dependency}".`);
      }
    }
  }
}

export function resolveExtensionFeatureFlags(
  extensions: EditorExtension[],
  context: EditorExtensionContext
): Partial<ResolvedEditorFeatureFlags> {
  return extensions.reduce<Partial<ResolvedEditorFeatureFlags>>((acc, extension) => {
    return {
      ...acc,
      ...extension.getFeatureFlags?.(context),
    };
  }, {});
}

export function resolveExtensionSessionPersistence(
  extensions: EditorExtension[],
  context: EditorExtensionContext
): DocumentSessionPersistenceOptions | undefined {
  return extensions.reduce<DocumentSessionPersistenceOptions | undefined>((acc, extension) => {
    return extension.getSessionPersistence?.(context) ?? acc;
  }, undefined);
}

export async function notifyExtensionsOfLocalChange(
  extensions: EditorExtension[],
  html: string,
  context: EditorExtensionContext
): Promise<void> {
  for (const extension of extensions) {
    await extension.onLocalChange?.(html, context);
  }
}
