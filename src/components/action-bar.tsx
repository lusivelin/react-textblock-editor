"use client";

import { Save, Trash2 } from "lucide-react";
import { cn } from "../shadcn/lib/utils";
import { Button } from "../shadcn/ui/button";

interface ActionBarProps {
  darkMode: boolean;
  isFullscreen: boolean;
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  isDiscarding: boolean;
  onSave: () => void;
  onDiscard?: () => void;
}

export function ActionBar({
  darkMode,
  isFullscreen,
  hasUnsavedChanges,
  isSaving,
  isDiscarding,
  onSave,
  onDiscard,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "border-b p-2 flex justify-end gap-2",
        darkMode ? "bg-[#1a1b1e] border-white/[0.08]" : "bg-gray-50 border-gray-200",
        isFullscreen && "flex-shrink-0",
        isFullscreen && (darkMode ? "bg-[#1a1b1e]" : "bg-white")
      )}
    >
      {onDiscard && (
        <Button
          type="button"
          onClick={onDiscard}
          disabled={!hasUnsavedChanges || isDiscarding || isSaving}
          variant="outline"
          className={cn(
            "h-8 px-4 transition-colors",
            darkMode
              ? hasUnsavedChanges && !isDiscarding && !isSaving
                ? "bg-white/[0.05] text-white/60 border-white/[0.2] hover:bg-white/[0.1] hover:text-white hover:border-white/[0.3]"
                : "bg-transparent text-white/20 border-white/[0.08] cursor-not-allowed"
              : hasUnsavedChanges && !isDiscarding && !isSaving
                ? "text-gray-600 border-gray-300 hover:bg-gray-100"
                : "text-gray-400 border-gray-200 cursor-not-allowed"
          )}
        >
          {isDiscarding ? (
            <>
              <span className="h-4 w-4 mr-2 inline-block animate-spin rounded-full border-2 border-current border-t-transparent" />
              Discarding…
            </>
          ) : (
            <>
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </>
          )}
        </Button>
      )}
      <Button
        type="button"
        onClick={onSave}
        disabled={!hasUnsavedChanges || isSaving || isDiscarding}
        className={cn(
          "h-8 px-4 transition-colors",
          darkMode
            ? hasUnsavedChanges && !isSaving && !isDiscarding
              ? "bg-white/[0.1] text-white border border-white/[0.2] hover:bg-white/[0.15] hover:border-white/[0.3]"
              : "bg-transparent text-white/20 border border-white/[0.06] cursor-not-allowed"
            : hasUnsavedChanges && !isSaving && !isDiscarding
              ? "bg-gray-800 text-white hover:bg-gray-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
        )}
      >
        {isSaving ? (
          <>
            <span className="h-4 w-4 mr-2 inline-block animate-spin rounded-full border-2 border-current border-t-transparent" />
            Saving…
          </>
        ) : (
          <>
            <Save className="h-4 w-4 mr-2" />
            {hasUnsavedChanges ? "Save Changes" : "Saved"}
          </>
        )}
      </Button>
    </div>
  );
}
