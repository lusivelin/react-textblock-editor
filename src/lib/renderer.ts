/**
 * SSR-safe entry point.
 *
 * Exposes only the HTML renderer + sanitizer. Its module graph deliberately
 * contains **no ProseMirror** (no editor field / extensions / themes), so it can
 * be imported from a server component (Next.js RSC, etc.) without evaluating the
 * editor's client-only classes — which crash during SSR module evaluation with
 * "Class extends value undefined".
 *
 * Import the editor itself from the package root ("."); import this from servers:
 *   import { RichTextRenderer } from "@linhtetpaing9/react-textblock-editor/renderer";
 */
export { RichTextRenderer } from "./components/rich-text-renderer";
export type { RichTextRendererProps } from "./components/rich-text-renderer";

export { sanitizeRichTextContent, isContentSafe, getSanitizationReport } from "./utils/sanitize-rich-text";
