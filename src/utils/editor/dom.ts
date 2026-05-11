/**
 * DOM Utilities for Rich Text Editor
 *
 * Helper functions for DOM manipulation and queries
 */

/**
 * Gets the common ancestor node from the current selection
 */
export function getCommonAncestorNode(): Node | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  let node = range.commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode as Node;
  }

  return node;
}

/**
 * Gets the currently selected node
 */
export function getSelectedNode(): Node | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  return selection.getRangeAt(0).commonAncestorContainer;
}

/**
 * Checks if a node is currently selected
 */
export function isNodeSelected(node: Node): boolean {
  const selection = window.getSelection();
  if (!selection) return false;

  return selection.containsNode(node, true);
}

/**
 * Finds the closest element matching a condition
 * Traverses up the DOM tree until condition is met or root is reached
 */
export function getClosestElement(
  startNode: Node | null,
  predicate: (element: HTMLElement) => boolean,
  root?: HTMLElement
): HTMLElement | null {
  let node = startNode;

  while (node && node !== root) {
    if (node instanceof HTMLElement && predicate(node)) {
      return node;
    }
    node = node.parentNode;
  }

  return null;
}

/**
 * Gets the closest block-level element
 */
export function getClosestBlockElement(node: Node | null, root?: HTMLElement): HTMLElement | null {
  const blockTags = ["p", "h1", "h2", "h3", "h4", "h5", "h6", "div", "blockquote", "pre", "li"];

  return getClosestElement(
    node,
    (el) => blockTags.includes(el.tagName.toLowerCase()),
    root
  );
}

/**
 * Gets information about the current table cell context
 */
export interface CellContext {
  cell: HTMLTableCellElement | null;
  row: HTMLTableRowElement | null;
  table: HTMLTableElement | null;
  rowIndex: number;
  cellIndex: number;
}

export function getCurrentCellContext(): CellContext {
  const selection = window.getSelection();
  const result: CellContext = {
    cell: null,
    row: null,
    table: null,
    rowIndex: -1,
    cellIndex: -1,
  };

  if (!selection || selection.rangeCount === 0) {
    return result;
  }

  let node: Node | null = selection.getRangeAt(0).startContainer;

  // Find the cell
  while (node && !(node instanceof HTMLTableCellElement)) {
    node = node.parentNode;
  }

  if (node instanceof HTMLTableCellElement) {
    result.cell = node;

    // Find the row
    const row = node.parentElement;
    if (row instanceof HTMLTableRowElement) {
      result.row = row;
      result.cellIndex = Array.from(row.cells).indexOf(node);

      // Find the table
      const tbody = row.parentElement;
      if (tbody) {
        const table = tbody.parentElement;
        if (table instanceof HTMLTableElement) {
          result.table = table;
          result.rowIndex = Array.from(table.rows).indexOf(row);
        }
      }
    }
  }

  return result;
}

/**
 * Checks if the current selection is within a specific element type
 */
export function isSelectionInElementType(tagName: string): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;

  while (node) {
    if (node instanceof HTMLElement && node.tagName.toLowerCase() === tagName.toLowerCase()) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

/**
 * Gets all child text nodes recursively
 */
export function getTextNodes(element: Node): Text[] {
  const textNodes: Text[] = [];

  function traverse(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      textNodes.push(node as Text);
    } else {
      node.childNodes.forEach(traverse);
    }
  }

  traverse(element);
  return textNodes;
}

/**
 * Checks if an element contains only whitespace
 */
export function isWhitespaceOnly(node: Node): boolean {
  if (node.nodeType === Node.TEXT_NODE) {
    return !node.textContent || /^\s*$/.test(node.textContent);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as HTMLElement;
    return !element.textContent || /^\s*$/.test(element.textContent);
  }

  return true;
}

/**
 * Removes empty text nodes from an element
 */
export function removeEmptyTextNodes(element: HTMLElement): void {
  const textNodes = getTextNodes(element);

  textNodes.forEach((node) => {
    if (isWhitespaceOnly(node)) {
      node.parentNode?.removeChild(node);
    }
  });
}

/**
 * Unwraps an element, replacing it with its children
 */
export function unwrapElement(element: HTMLElement): void {
  const parent = element.parentNode;
  if (!parent) return;

  while (element.firstChild) {
    parent.insertBefore(element.firstChild, element);
  }

  parent.removeChild(element);
}

/**
 * Wraps a node with a new element
 */
export function wrapNode(node: Node, wrapperTag: string): HTMLElement {
  const wrapper = document.createElement(wrapperTag);
  node.parentNode?.insertBefore(wrapper, node);
  wrapper.appendChild(node);
  return wrapper;
}

/**
 * Gets computed style value for an element
 */
export function getComputedStyleValue(element: HTMLElement, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}
