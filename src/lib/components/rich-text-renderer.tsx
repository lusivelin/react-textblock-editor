/**
 * Renders HTML produced by this rich text editor.
 *
 * This component is SSR-safe. It only string-sanitizes the incoming HTML and
 * does not depend on `window`, `document`, or post-mount DOM cleanup hooks.
 */
import { cn } from "@lib/utils/cn";
import { sanitizeRichTextContent } from "@lib/utils/sanitize-rich-text";

interface RichTextRendererProps {
  content: string;
  className?: string;
}

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (!content) return null;
  const sanitizedContent = sanitizeRichTextContent(content);

  if (!sanitizedContent) return null;

  return (
    <div
      className={cn("loom-renderer", className)}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      suppressContentEditableWarning
      suppressHydrationWarning
      spellCheck={false}
    />
  );
}
