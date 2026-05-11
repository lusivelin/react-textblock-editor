import { useCallback } from "react";
import { sanitizeRichTextContent } from "../utils/sanitize-rich-text";

/**
 * Hook to handle paste functionality in the rich text editor.
 *
 * Handles both HTML and plain text paste, preserving formatting and line
 * breaks. Pasted HTML is run through DOMPurify before being inserted so a
 * malicious clipboard payload (e.g. copied from a website with `<script>`
 * tags or `on*` handlers) can't execute inside the Studio.
 */
export function useEditorPaste(handleInput: () => void) {
  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();

      const clipboardData = e.clipboardData;
      if (!clipboardData) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      const htmlContent = clipboardData.getData("text/html");

      if (htmlContent) {
        // Sanitize BEFORE parsing into DOM nodes — otherwise inline event
        // handlers and `javascript:` URLs would be live during the brief
        // window between innerHTML and removal.
        const safeHtml = sanitizeRichTextContent(htmlContent);
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = safeHtml;

        range.deleteContents();

        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }

        range.insertNode(fragment);

        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);

        handleInput();
      } else {
        const text = clipboardData.getData("text/plain");
        if (text) {
          range.deleteContents();

          const lines = text.split("\n");
          const fragment = document.createDocumentFragment();

          for (const line of lines) {
            const p = document.createElement("p");
            if (line.trim()) {
              p.textContent = line;
            } else {
              p.appendChild(document.createElement("br"));
            }
            fragment.appendChild(p);
          }

          range.insertNode(fragment);
          range.collapse(false);
          selection.removeAllRanges();
          selection.addRange(range);

          handleInput();
        }
      }
    },
    [handleInput]
  );

  return { handlePaste };
}
