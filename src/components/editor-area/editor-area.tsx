"use client";

import React from "react";
import { cn } from "../../shadcn/lib/utils";

interface EditorAreaProps {
  editorRef: React.RefObject<HTMLDivElement | null>;
  isFullscreen: boolean;
  readOnly: boolean;
  darkMode?: boolean;
  height: number;
  placeholder: string;
  uniqueId: string;
  selectedImage: HTMLImageElement | null;
  wordCount?: number;
  onInput: () => void;
  onFocus: () => void;
  onBlur: () => void;
  onClick: (e: React.MouseEvent) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  onCopy: (e: React.ClipboardEvent) => void;
  onPaste: (e: React.ClipboardEvent) => void;
  onImageResizeMouseDown: (e: React.MouseEvent, direction: string) => void;
}

export function EditorArea({
  editorRef,
  isFullscreen,
  readOnly,
  darkMode = false,
  height,
  placeholder,
  uniqueId,
  selectedImage,
  wordCount,
  onInput,
  onFocus,
  onBlur,
  onClick,
  onKeyDown,
  onCopy,
  onPaste,
  onImageResizeMouseDown,
}: EditorAreaProps) {
  const FOOTER_HEIGHT = 28;
  const contentHeight = isFullscreen ? undefined : height - FOOTER_HEIGHT;

  return (
    <div
      className={cn(
        "flex flex-col border-t",
        darkMode ? "border-white/[0.08] bg-[#141618]" : "border-gray-200 bg-white",
        isFullscreen && "flex-1"
      )}
      style={!isFullscreen ? { height: `${height}px` } : undefined}
    >
      {/* Scrollable content area */}
      <div
        className="relative overflow-y-auto flex-1"
        style={!isFullscreen && contentHeight !== undefined ? { height: `${contentHeight}px` } : undefined}
      >
        <div
          ref={editorRef}
          contentEditable={!readOnly}
          onInput={onInput}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onClick}
          onKeyDown={onKeyDown}
          onCopy={onCopy}
          onPaste={onPaste}
          data-editor-id={uniqueId}
          className={cn(
            "rich-text-editor-content",
            "p-3 focus:outline-none",
            "prose prose-sm max-w-none",
            "min-h-full",
            readOnly && (darkMode ? "bg-black/20 cursor-not-allowed" : "bg-gray-50 cursor-not-allowed"),
            isFullscreen && "max-w-5xl mx-auto"
          )}
          data-placeholder={placeholder}
          suppressContentEditableWarning={true}
        />

        {selectedImage && !readOnly && (
          <div
            className="image-resize-container absolute pointer-events-none"
            style={{
              left: selectedImage.offsetLeft + "px",
              top: selectedImage.offsetTop + "px",
              width: selectedImage.offsetWidth + "px",
              height: selectedImage.offsetHeight + "px",
            }}
          >
            <div className="resize-handle resize-handle-nw" onMouseDown={(e) => onImageResizeMouseDown(e, "nw")} />
            <div className="resize-handle resize-handle-ne" onMouseDown={(e) => onImageResizeMouseDown(e, "ne")} />
            <div className="resize-handle resize-handle-sw" onMouseDown={(e) => onImageResizeMouseDown(e, "sw")} />
            <div className="resize-handle resize-handle-se" onMouseDown={(e) => onImageResizeMouseDown(e, "se")} />
            <div className="resize-handle resize-handle-w" onMouseDown={(e) => onImageResizeMouseDown(e, "w")} />
            <div className="resize-handle resize-handle-e" onMouseDown={(e) => onImageResizeMouseDown(e, "e")} />
          </div>
        )}
      </div>

      {/* Word count footer */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center px-3 border-t select-none",
          darkMode ? "border-white/[0.06] bg-[#141618]" : "border-gray-100 bg-gray-50/50"
        )}
        style={{ height: `${FOOTER_HEIGHT}px` }}
      >
        <span className={cn("text-[11px]", darkMode ? "text-white/25" : "text-gray-400")}>Words: {wordCount ?? 0}</span>
      </div>
    </div>
  );
}
