import type React from "react";
import type { EditorCommand } from "./editor-command";
import type { ResolvedEditorFeatureFlags } from "./editor-features";

export type ToolbarItemKind = "toggle" | "dropdown" | "dialog" | "color-picker" | "custom" | "separator";

export interface ToolbarToggleItem {
  kind: "toggle";
  commandId: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  group?: string;
}

export interface ToolbarSeparatorItem {
  kind: "separator";
  group?: string;
}

export type ToolbarItem = ToolbarToggleItem | ToolbarSeparatorItem;

export interface KeyboardShortcut {
  key: string;
  commandId: string;
  args?: unknown;
}

export interface PluginPanelContribution {
  id: string;
  slot: "sidebar" | "footer" | "floating";
  render: React.ComponentType;
}

export interface PluginOverlayContribution {
  id: string;
  render: React.ComponentType;
}

export interface EditorPlugin {
  id: string;
  requiredFeatures?: Array<keyof ResolvedEditorFeatureFlags>;
  isEnabled?: (features: ResolvedEditorFeatureFlags) => boolean;
  toolbarItems?: ToolbarItem[];
  keyboardShortcuts?: KeyboardShortcut[];
  panels?: PluginPanelContribution[];
  overlays?: PluginOverlayContribution[];
}

export class PluginRegistry {
  private plugins: EditorPlugin[] = [];
  private commands: Map<string, EditorCommand<unknown>> = new Map();

  register(plugin: EditorPlugin): void {
    this.plugins.push(plugin);
  }

  registerCommand<TArgs>(command: EditorCommand<TArgs>): void {
    this.commands.set(command.id, command as EditorCommand<unknown>);
  }

  getCommand<TArgs>(id: string): EditorCommand<TArgs> | undefined {
    return this.commands.get(id) as EditorCommand<TArgs> | undefined;
  }

  getAllPlugins(): EditorPlugin[] {
    return this.plugins;
  }

  getEnabledPlugins(features: ResolvedEditorFeatureFlags): EditorPlugin[] {
    return this.plugins.filter((plugin) => {
      if (plugin.requiredFeatures?.some((feature) => !features[feature])) {
        return false;
      }

      return plugin.isEnabled ? plugin.isEnabled(features) : true;
    });
  }

  getAllToolbarItems(features: ResolvedEditorFeatureFlags): ToolbarItem[] {
    return this.getEnabledPlugins(features).flatMap((p) => p.toolbarItems ?? []);
  }

  getAllKeyboardShortcuts(features: ResolvedEditorFeatureFlags): KeyboardShortcut[] {
    return this.getEnabledPlugins(features).flatMap((p) => p.keyboardShortcuts ?? []);
  }

  getAllPanels(features: ResolvedEditorFeatureFlags): PluginPanelContribution[] {
    return this.getEnabledPlugins(features).flatMap((p) => p.panels ?? []);
  }

  getAllOverlays(features: ResolvedEditorFeatureFlags): PluginOverlayContribution[] {
    return this.getEnabledPlugins(features).flatMap((p) => p.overlays ?? []);
  }
}
