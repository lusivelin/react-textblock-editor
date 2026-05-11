/**
 * Selection utilities for rich text editor
 */

/**
 * Save the current selection range
 */
export function saveSelection(): Range | null {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0);
  }
  return null;
}

/**
 * Restore a previously saved selection range
 */
export function restoreSelection(range: Range | null): void {
  if (!range) return;

  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

/**
 * Get the selected text
 */
export function getSelectedText(): string {
  const selection = window.getSelection();
  return selection?.toString() || "";
}

/**
 * Check if selection is within an element
 */
export function isSelectionInElement(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  const range = selection.getRangeAt(0);
  return element.contains(range.commonAncestorContainer);
}
