export interface EditorFeatureFlags {
  comments?: boolean;
  trackedChanges?: boolean;
  collaboration?: boolean;
  offline?: boolean;
  ai?: boolean;
}

export interface ResolvedEditorFeatureFlags {
  comments: boolean;
  trackedChanges: boolean;
  collaboration: boolean;
  offline: boolean;
  ai: boolean;
}

const DEFAULT_EDITOR_FEATURE_FLAGS: ResolvedEditorFeatureFlags = {
  comments: false,
  trackedChanges: false,
  collaboration: false,
  offline: false,
  ai: false,
};

export function resolveEditorFeatureFlags(flags?: EditorFeatureFlags): ResolvedEditorFeatureFlags {
  return {
    ...DEFAULT_EDITOR_FEATURE_FLAGS,
    ...flags,
  };
}

