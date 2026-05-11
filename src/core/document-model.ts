import type React from "react";
import type { DocumentSessionState } from "./document-session";

export type EditorMode = "html" | "structured";

export interface StructuredEditorRenderProps {
  value: string;
  onChange?: (content: string) => void;
  onSave?: () => void;
  onDiscard?: () => void;
  onImageUpload?: (file: File) => Promise<string>;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  height?: number;
  darkMode?: boolean;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isDiscarding?: boolean;
  sessionState: DocumentSessionState;
}

export interface DocumentModelAdapter {
  id: string;
  mode: "structured";
  label?: string;
  description?: string;
  render: (props: StructuredEditorRenderProps) => React.ReactNode;
}

