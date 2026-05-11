/**
 * Renders HTML produced by this rich text editor.
 *
 * Stored content is already sanitized before it reaches the frontend, so this
 * component focuses on rendering and post-render cleanup for editor-only DOM
 * artifacts such as contentEditable flags and table helper classes.
 */

"use client";

import { useRef } from "react";
import { cn } from "../shadcn/lib/utils";
import { useRichTextStyling } from "../hooks/use-rich-text-styling";
import { useSanitizedContent } from "../hooks/use-sanitized-content";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Frontend rendering trusts the stored HTML contract and only normalizes
  // editor-only artifacts through the hook layer.
  const { sanitizedContent, isLoading } = useSanitizedContent(content);

  // Renderer CSS handles presentation; this hook only patches DOM details the
  // editor left behind in saved HTML.
  useRichTextStyling(containerRef, sanitizedContent);

  if (!content) return null;

  if (isLoading) {
    return (
      <div className={cn("rich-text-renderer", className)}>
        <RichTextSkeleton />
      </div>
    );
  }

  if (!sanitizedContent) return null;

  return (
    <div
      ref={containerRef}
      className={cn("rich-text-renderer", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      suppressContentEditableWarning
      suppressHydrationWarning
      spellCheck={false}
    />
  );
}

/**
 * Placeholder used while the renderer waits on content preparation.
 */
function RichTextSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 bg-slate-200 rounded w-3/4"></div>

      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
        <div className="h-4 bg-slate-200 rounded w-4/6"></div>
      </div>

      <div className="space-y-2">
        <div className="h-4 bg-slate-200 rounded"></div>
        <div className="h-4 bg-slate-200 rounded w-5/6"></div>
      </div>
    </div>
  );
}
