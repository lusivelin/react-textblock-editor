"use client";

import { createContext, useContext, useMemo } from "react";
import { PluginRegistry } from "./plugin-registry";
import type { EditorPlugin } from "./plugin-registry";
import type { ResolvedEditorFeatureFlags } from "./editor-features";
import { resolveEditorFeatureFlags } from "./editor-features";

interface EditorContextValue {
  registry: PluginRegistry;
  editorRef: React.RefObject<HTMLDivElement | null>;
  featureFlags: ResolvedEditorFeatureFlags;
}

const EditorContext = createContext<EditorContextValue | null>(null);

function createRegistry(plugins: EditorPlugin[]): PluginRegistry {
  const registry = new PluginRegistry();
  plugins.forEach((p) => registry.register(p));
  return registry;
}

export function EditorProvider({
  children,
  plugins,
  editorRef,
  featureFlags,
}: {
  children: React.ReactNode;
  plugins: EditorPlugin[];
  editorRef: React.RefObject<HTMLDivElement | null>;
  featureFlags?: ResolvedEditorFeatureFlags;
}) {
  const registry = useMemo<PluginRegistry>(() => createRegistry(plugins), [plugins]);
  const resolvedFeatureFlags = useMemo(() => resolveEditorFeatureFlags(featureFlags), [featureFlags]);

  const value = useMemo(
    () => ({
      registry,
      editorRef,
      featureFlags: resolvedFeatureFlags,
    }),
    [registry, editorRef, resolvedFeatureFlags]
  );

  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditorContext(): EditorContextValue {
  const ctx = useContext(EditorContext);
  if (!ctx) throw new Error("useEditorContext must be used inside EditorProvider");
  return ctx;
}
