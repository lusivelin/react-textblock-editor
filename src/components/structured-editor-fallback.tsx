"use client";

import { cn } from "../shadcn/lib/utils";
import { ActionBar } from "./action-bar";

interface StructuredEditorFallbackProps {
  className?: string;
  darkMode?: boolean;
  height?: number;
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  isDiscarding?: boolean;
  onSave?: () => void;
  onDiscard?: () => void;
}

export function StructuredEditorFallback({
  className,
  darkMode = false,
  height = 400,
  hasUnsavedChanges = false,
  isSaving = false,
  isDiscarding = false,
  onSave,
  onDiscard,
}: StructuredEditorFallbackProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded border shadow-sm",
        darkMode ? "border-white/[0.08] bg-[#141618] text-white" : "border-gray-200 bg-white text-gray-900",
        className
      )}
    >
      {onSave && (
        <ActionBar
          darkMode={darkMode}
          isFullscreen={false}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isDiscarding={isDiscarding}
          onSave={onSave}
          onDiscard={onDiscard}
        />
      )}

      <div
        className={cn("grid content-start gap-4 p-6", darkMode ? "bg-[#141618]" : "bg-white")}
        style={{ minHeight: `${height}px` }}
      >
        <div>
          <p className={cn("m-0 text-xs font-semibold uppercase tracking-[0.22em]", darkMode ? "text-cyan-300" : "text-sky-700")}>
            Structured Mode
          </p>
          <h3 className="m-0 mt-2 text-xl tracking-[-0.03em]">No structured editor adapter is configured yet.</h3>
          <p className={cn("m-0 mt-3 max-w-2xl text-sm leading-6", darkMode ? "text-white/65" : "text-slate-600")}>
            This mode is reserved for a ProseMirror or Automerge-backed editor implementation. The package boundary is in place, but the structured editor engine still needs to be injected through a
            document-model adapter.
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl border p-4 text-sm leading-6",
            darkMode ? "border-white/[0.08] bg-black/20 text-white/75" : "border-slate-200 bg-slate-50 text-slate-700"
          )}
        >
          Recommended next step: provide a `DocumentModelAdapter` that renders a ProseMirror-based editor and treats saved HTML as a derived snapshot rather than the live editing source of truth.
        </div>
      </div>
    </div>
  );
}

