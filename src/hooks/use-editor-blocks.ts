/* eslint-disable */

import { type MutableRefObject, type RefObject, useCallback, useRef } from "react";

interface UseEditorBlocksProps {
  editorRef: RefObject<HTMLDivElement | null>;
  handleInput: () => void;
  updateActiveFormats: () => void;
  setCurrentBlockTag: (tag: string) => void;
  savedSelectionRef?: MutableRefObject<Range | null>;
}

/**
 * Hook for managing block-level formatting (headings, paragraphs)
 * and selection save/restore functionality
 */
export function useEditorBlocks({
  editorRef,
  handleInput,
  updateActiveFormats,
  setCurrentBlockTag,
  savedSelectionRef: externalSavedSelectionRef,
}: UseEditorBlocksProps) {
  const internalSavedSelectionRef = useRef<Range | null>(null);
  const savedSelectionRef = externalSavedSelectionRef || internalSavedSelectionRef;

  const formatBlock = useCallback(
    (tag: string) => {
      if (!editorRef.current) return;

      editorRef.current.focus();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      try {
        // Check if the selected text is already wrapped in the target tag or any block tag
        let node = range.commonAncestorContainer;
        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode as Node;
        }

        // Find existing block-level tag (h1, h2, h3, p)
        let existingBlockTag: HTMLElement | null = null;
        let current = node;
        while (current && current !== editorRef.current) {
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

          // If clicking the same tag, toggle it off
          if (existingTagName === tag) {
            if (tag === "p") {
              // For paragraph, toggle back to plain text by converting to div
              // But we'll set the state back to "p" to avoid confusion
              // The div will be detected as a div by updateFormatsFromSelection
              const div = document.createElement("div");

              // Copy all children from the paragraph to the div
              while (existingBlockTag.firstChild) {
                div.appendChild(existingBlockTag.firstChild);
              }

              // Preserve text alignment if it exists
              const computedStyle = window.getComputedStyle(existingBlockTag);
              if (computedStyle.textAlign && computedStyle.textAlign !== "start") {
                div.style.textAlign = computedStyle.textAlign;
              }

              existingBlockTag.parentNode?.replaceChild(div, existingBlockTag);

              // Restore selection
              const newRange = document.createRange();
              newRange.selectNodeContents(div);
              newRange.collapse(false);
              selection.removeAllRanges();
              selection.addRange(newRange);

              // Note: We don't set currentBlockTag here - let updateFormatsFromSelection handle it
            } else {
              // For headings, toggle off to paragraph
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
                setCurrentBlockTag("p");
              });
            }
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
              setCurrentBlockTag(tag);
            });
          }
        } else {
          // No existing block tag, create new one
          const element = document.createElement(tag);

          try {
            if (range.collapsed) {
              // Collapsed cursor with no block parent: wrap the direct-child node in the new tag
              let target: Node | null = range.startContainer;
              while (target && target.parentNode !== editorRef.current) {
                target = target.parentNode;
              }
              if (target && editorRef.current) {
                const offset = range.startOffset;
                editorRef.current.insertBefore(element, target);
                element.appendChild(target);
                // Restore cursor position inside the new element
                const newRange = document.createRange();
                try {
                  const textNode = element.childNodes[0];
                  if (textNode?.nodeType === Node.TEXT_NODE) {
                    newRange.setStart(textNode, Math.min(offset, textNode.textContent?.length || 0));
                  } else {
                    newRange.selectNodeContents(element);
                  }
                } catch {
                  newRange.selectNodeContents(element);
                }
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
              }
            } else {
              const fragment = range.extractContents();
              element.appendChild(fragment);
              range.insertNode(element);

              const newRange = document.createRange();
              newRange.selectNodeContents(element);
              selection.removeAllRanges();
              selection.addRange(newRange);
            }

            requestAnimationFrame(() => {
              setCurrentBlockTag(tag);
            });
          } catch (error) {
            console.error("Error creating formatted element:", error);
          }
        }
      } catch (error) {
        console.error("formatBlock failed:", error);
      }

      editorRef.current.focus();
      handleInput();

      // Force update active formats after a brief delay
      setTimeout(() => {
        updateActiveFormats();
      }, 10);
    },
    [editorRef, handleInput, updateActiveFormats, setCurrentBlockTag]
  );

  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      if (editorRef.current?.contains(range.commonAncestorContainer)) {
        savedSelectionRef.current = range.cloneRange();
      }
    }
  }, [editorRef, savedSelectionRef]);

  const restoreSelection = useCallback(() => {
    if (savedSelectionRef.current && editorRef.current) {
      editorRef.current.focus();
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(savedSelectionRef.current);
    }
  }, [editorRef, savedSelectionRef]);

  return {
    formatBlock,
    saveSelection,
    restoreSelection,
  };
}
