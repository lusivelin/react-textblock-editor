/**
 * Block Formatting Utilities for Rich Text Editor
 *
 * Handles block-level formatting like headings, paragraphs, and text alignment
 */

import { BLOCK_TAGS } from "./constants";

/**
 * Applies text alignment to the current block element
 */
export function applyTextAlignment(
  alignment: "left" | "center" | "right" | "justify",
  editorRef?: HTMLElement,
  callbacks?: {
    handleInput?: () => void;
    setCurrentAlignment?: (alignment: string) => void;
  }
): void {
  if (!editorRef) return;

  editorRef.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const container = range.commonAncestorContainer;

  // Find the block-level parent element
  let blockElement =
    container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);

  while (blockElement && blockElement !== editorRef) {
    const display = window.getComputedStyle(blockElement).display;
    if (display === "block" || blockElement.tagName.match(/^(P|DIV|H[1-6]|LI)$/)) {
      break;
    }
    blockElement = blockElement.parentElement;
  }

  if (blockElement && blockElement !== editorRef) {
    blockElement.style.textAlign = alignment;
  }

  editorRef.focus();
  callbacks?.handleInput?.();

  // Update alignment state immediately
  callbacks?.setCurrentAlignment?.(alignment);
}

/**
 * Formats the current selection as a specific block tag (h1, h2, h3, p)
 */
export function formatBlock(
  tag: string,
  editorRef?: HTMLElement,
  callbacks?: {
    handleInput?: () => void;
    updateActiveFormats?: () => void;
    setCurrentBlockTag?: (tag: string) => void;
  }
): void {
  if (!editorRef) return;

  editorRef.focus();

  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);

  try {
    // If there's no selection (collapsed), don't do anything
    if (range.collapsed) {
      return;
    }

    // Check if the selected text is already wrapped in the target tag or any block tag
    let node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode as Node;
    }

    // Find existing block-level tag (h1, h2, h3, p)
    let existingBlockTag: HTMLElement | null = null;
    let current = node;
    while (current && current !== editorRef) {
      if (current instanceof HTMLElement) {
        const tagName = current.tagName.toLowerCase();
        if (tagName === "h1" || tagName === "h2" || tagName === "h3" || tagName === "p") {
          existingBlockTag = current;
          break;
        }
      }
      current = current.parentNode as Node;
    }

    if (existingBlockTag) {
      const existingTagName = existingBlockTag.tagName.toLowerCase();

      // If clicking the same tag, toggle off to paragraph (except for p)
      if (existingTagName === tag && tag !== "p") {
        const p = document.createElement("p");

        // Copy all children from the heading to the paragraph
        while (existingBlockTag.firstChild) {
          p.appendChild(existingBlockTag.firstChild);
        }

        // Preserve text alignment if it exists
        const computedStyle = window.getComputedStyle(existingBlockTag);
        if (computedStyle.textAlign && computedStyle.textAlign !== "start") {
          p.style.textAlign = computedStyle.textAlign;
        }

        existingBlockTag.parentNode?.replaceChild(p, existingBlockTag);

        // Restore selection
        const newRange = document.createRange();
        newRange.selectNodeContents(p);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Update state immediately after DOM changes
        requestAnimationFrame(() => {
          callbacks?.setCurrentBlockTag?.("p");
        });
      } else {
        // Replace existing block tag with new tag
        const newElement = document.createElement(tag);

        // Copy all children from the existing tag to the new tag
        while (existingBlockTag.firstChild) {
          newElement.appendChild(existingBlockTag.firstChild);
        }

        // Preserve text alignment if it exists
        const computedStyle = window.getComputedStyle(existingBlockTag);
        if (computedStyle.textAlign && computedStyle.textAlign !== "start") {
          newElement.style.textAlign = computedStyle.textAlign;
        }

        existingBlockTag.parentNode?.replaceChild(newElement, existingBlockTag);

        // Restore selection
        const newRange = document.createRange();
        newRange.selectNodeContents(newElement);
        newRange.collapse(false);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Update state immediately after DOM changes
        requestAnimationFrame(() => {
          callbacks?.setCurrentBlockTag?.(tag);
        });
      }
    } else {
      // No existing block tag, create new one
      const element = document.createElement(tag);

      try {
        // Extract the selected content
        const fragment = range.extractContents();
        element.appendChild(fragment);
        range.insertNode(element);

        // Select the new element
        const newRange = document.createRange();
        newRange.selectNodeContents(element);
        selection.removeAllRanges();
        selection.addRange(newRange);

        // Update state immediately after DOM changes
        requestAnimationFrame(() => {
          callbacks?.setCurrentBlockTag?.(tag);
        });
      } catch (error) {
        console.error("Error creating formatted element:", error);
      }
    }
  } catch (error) {
    console.error("formatBlock failed:", error);
  }

  editorRef.focus();
  callbacks?.handleInput?.();

  // Force update active formats after a brief delay
  setTimeout(() => {
    callbacks?.updateActiveFormats?.();
  }, 10);
}

/**
 * Gets the current block tag at the selection
 */
export function getCurrentBlockTag(editorRef?: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "p";

  let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== editorRef) {
    if (node instanceof HTMLElement) {
      const tagName = node.tagName.toLowerCase();
      if (BLOCK_TAGS.includes(tagName as any)) {
        return tagName;
      }
    }
    node = node.parentNode;
  }

  return "p";
}

/**
 * Gets the current text alignment at the selection
 */
export function getCurrentAlignment(editorRef?: HTMLElement): string {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return "left";

  let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== editorRef && node instanceof HTMLElement) {
    const textAlign = window.getComputedStyle(node).textAlign;
    if (textAlign && textAlign !== "start") {
      return textAlign;
    }
    node = node.parentNode;
  }

  return "left";
}

/**
 * Checks if the selection is inside a specific block tag
 */
export function isInBlockTag(tagName: string, editorRef?: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return false;

  let node: Node | null = selection.getRangeAt(0).commonAncestorContainer;

  if (node.nodeType === Node.TEXT_NODE) {
    node = node.parentNode;
  }

  while (node && node !== editorRef) {
    if (node instanceof HTMLElement && node.tagName.toLowerCase() === tagName.toLowerCase()) {
      return true;
    }
    node = node.parentNode;
  }

  return false;
}

/**
 * Finds the closest block element from a node
 */
export function findClosestBlockElement(node: Node | null, editorRef?: HTMLElement): HTMLElement | null {
  let current = node;

  while (current && current !== editorRef) {
    if (current instanceof HTMLElement) {
      const tagName = current.tagName.toLowerCase();
      if (BLOCK_TAGS.includes(tagName as any)) {
        return current;
      }
    }
    current = current.parentNode as Node;
  }

  return null;
}
