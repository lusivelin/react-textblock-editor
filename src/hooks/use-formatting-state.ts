/**
 * useFormattingState Hook
 *
 * Consolidates all formatting-related state for the rich text editor
 */

import { useCallback, useState } from "react";

export interface UseFormattingStateReturn {
  activeFormats: Set<string>;
  currentAlignment: string;
  currentBlockTag: string;
  currentFontSize: string;
  currentListType: string | null;
  hasLink: boolean;
  setActiveFormats: (formats: Set<string>) => void;
  setCurrentAlignment: (alignment: string) => void;
  setCurrentBlockTag: (tag: string) => void;
  setCurrentFontSize: (size: string) => void;
  setCurrentListType: (type: string | null) => void;
  setHasLink: (hasLink: boolean) => void;
  updateFormatsFromSelection: (editorRef: React.RefObject<HTMLDivElement | null>) => void;
  resetFormats: () => void;
}

/**
 * Hook to manage all formatting state for the editor
 * Consolidates multiple state variables into a single hook
 */
export function useFormattingState(): UseFormattingStateReturn {
  const [activeFormats, setActiveFormats] = useState<Set<string>>(new Set());
  const [currentAlignment, setCurrentAlignment] = useState<string>("left");
  const [currentBlockTag, setCurrentBlockTag] = useState<string>("p");
  const [currentFontSize, setCurrentFontSize] = useState<string>("");
  const [currentListType, setCurrentListType] = useState<string | null>(null);
  const [hasLink, setHasLink] = useState(false);

  const resetFormats = useCallback(() => {
    setActiveFormats(new Set());
    setCurrentAlignment("left");
    setCurrentBlockTag("p");
    setCurrentFontSize("");
    setCurrentListType(null);
    setHasLink(false);
  }, []);

  const updateFormatsFromSelection = useCallback(
    (editorRef: React.RefObject<HTMLDivElement | null>) => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        resetFormats();
        return;
      }

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;

      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode as Node;
      }

      const formats = new Set<string>();
      let alignment = "left";
      let blockTag = "";
      let fontSize = "";
      let listType: string | null = null;
      let linkDetected = false;

      while (node && node !== editorRef.current) {
        if (node instanceof HTMLElement) {
          const tagName = node.tagName.toLowerCase();

          if (tagName === "strong" || tagName === "b") {
            formats.add("bold");
          }
          if (tagName === "em" || tagName === "i") {
            formats.add("italic");
          }
          if (tagName === "u") {
            formats.add("underline");
          }
          if (tagName === "s" || tagName === "del") {
            formats.add("strikethrough");
          }
          if (tagName === "code") {
            formats.add("code");
          }

          // Check for links
          if (tagName === "a") {
            linkDetected = true;
          }

          // Check for block-level tags (headings, paragraphs, and divs)
          if (tagName === "h1" || tagName === "h2" || tagName === "h3" || tagName === "p" || tagName === "div") {
            blockTag = tagName;
          }

          // Check for list types
          if (tagName === "ul") {
            listType = "ul";
          }
          if (tagName === "ol") {
            listType = "ol";
          }

          // Check text alignment
          const textAlign = window.getComputedStyle(node).textAlign;
          if (textAlign && textAlign !== "start") {
            alignment = textAlign;
          }

          // Check font size
          if (tagName === "span" && node.style.fontSize) {
            fontSize = node.style.fontSize;
          }
        }
        node = node.parentNode as Node;
      }

      setActiveFormats(formats);
      setCurrentAlignment(alignment);
      setCurrentBlockTag(blockTag);
      setCurrentFontSize(fontSize);
      setCurrentListType(listType);
      setHasLink(linkDetected);
    },
    [resetFormats]
  );

  return {
    activeFormats,
    currentAlignment,
    currentBlockTag,
    currentFontSize,
    currentListType,
    hasLink,
    setActiveFormats,
    setCurrentAlignment,
    setCurrentBlockTag,
    setCurrentFontSize,
    setCurrentListType,
    setHasLink,
    updateFormatsFromSelection,
    resetFormats,
  };
}
