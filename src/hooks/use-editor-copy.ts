import { useCallback } from "react";

/**
 * Hook to handle copy functionality in the rich text editor
 * Preserves both HTML formatting and plain text when copying
 */
export function useEditorCopy() {
  const handleCopy = useCallback((e: React.ClipboardEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const container = document.createElement("div");
    container.appendChild(range.cloneContents());

    // Get the HTML content including images and formatting
    const html = container.innerHTML;
    const text = container.textContent || "";

    // Set both HTML and plain text in clipboard
    if (e.clipboardData) {
      e.clipboardData.setData("text/html", html);
      e.clipboardData.setData("text/plain", text);
      e.preventDefault();
    }
  }, []);

  return { handleCopy };
}
