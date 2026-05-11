/**
 * Font Size Utilities for Rich Text Editor
 *
 * Handles font size application and removal
 */

import { FONT_SIZE_MAP, DEFAULT_FONT_SIZE } from "./constants";

/**
 * Applies a font size to the current selection
 */
export function applyFontSize(size: string): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const fontSize = FONT_SIZE_MAP[size] || size;

  // If selection is collapsed, we can't apply formatting
  if (range.collapsed) return;

  // Create a span with the font size
  const span = document.createElement("span");
  span.style.fontSize = fontSize;

  // Extract and wrap the content
  const contents = range.extractContents();
  span.appendChild(contents);
  range.insertNode(span);

  // Restore selection
  range.selectNodeContents(span);
  selection.removeAllRanges();
  selection.addRange(range);
}

/**
 * Removes font size from the current selection
 */
export function removeFontSize(): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  let node = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode as Node;
  }

  // Find parent with font-size and remove it
  while (node && node instanceof HTMLElement) {
    if (node.style.fontSize) {
      node.style.removeProperty("font-size");

      // If no other styles, unwrap the element
      if (!node.getAttribute("style") || node.getAttribute("style") === "") {
        node.removeAttribute("style");
      }

      // If it's an empty span with no attributes, unwrap it
      if (node.tagName.toLowerCase() === "span" && !node.hasAttributes()) {
        const parent = node.parentNode;
        if (parent) {
          while (node.firstChild) {
            parent.insertBefore(node.firstChild, node);
          }
          parent.removeChild(node);
        }
      }
      break;
    }
    node = node.parentNode as Node;
  }
}

/**
 * Gets the current font size at the selection
 */
export function getCurrentFontSize(): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "";

  let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;

  if (node && node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node instanceof HTMLElement) {
    if (node.style && node.style.fontSize) {
      // Find the key in FONT_SIZE_MAP that matches this value
      const currentFontSize = node.style.fontSize;
      const entry = Object.entries(FONT_SIZE_MAP).find(([_, value]) => value === currentFontSize);
      return entry ? entry[0] : currentFontSize;
    }
    node = node.parentNode as HTMLElement | null;
  }

  return "";
}

/**
 * Checks if a given size value is the default size
 */
export function isDefaultFontSize(size: string): boolean {
  return size === DEFAULT_FONT_SIZE || size === "normal" || size === "";
}

/**
 * Maps a CSS font size value back to a size key
 */
export function getFontSizeKey(cssSize: string): string | null {
  const entry = Object.entries(FONT_SIZE_MAP).find(([_, value]) => value === cssSize);
  return entry ? entry[0] : null;
}

/**
 * Handles font size change with default removal logic
 */
export function handleFontSizeChange(newSize: string, editorRef: React.RefObject<HTMLDivElement>): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  // If selecting default/normal, remove all font sizes
  if (newSize === "normal" || newSize === DEFAULT_FONT_SIZE) {
    removeFontSize();

    // Also remove from any spans in the selection
    if (editorRef.current) {
      const selectedSpans = editorRef.current.querySelectorAll("span[style*='font-size']");
      selectedSpans.forEach((span) => {
        if (span instanceof HTMLElement && selection.containsNode(span, true)) {
          span.style.removeProperty("font-size");

          // Unwrap if empty span
          if (!span.getAttribute("style") || span.getAttribute("style") === "") {
            span.removeAttribute("style");
            if (span.tagName.toLowerCase() === "span" && !span.hasAttributes()) {
              const parent = span.parentNode;
              if (parent) {
                while (span.firstChild) {
                  parent.insertBefore(span.firstChild, span);
                }
                parent.removeChild(span);
              }
            }
          }
        }
      });
    }
  } else {
    applyFontSize(newSize);
  }
}
