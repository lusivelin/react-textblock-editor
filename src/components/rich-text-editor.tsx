"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../shadcn/lib/utils";
import {
  useColorState,
  useEditorApplyStyles,
  useEditorBlocks,
  useEditorClickSelection,
  useEditorCopy,
  useEditorFullscreen,
  useEditorHistory,
  useEditorKeyboard,
  useEditorPaste,
  useEditorTable,
  useFormattingState,
  useImageResize,
  useLinkDialog,
  useSelectionState,
  useTableDialog,
} from "../hooks";
import { rgbToHex } from "../utils/editor/colors";
import { lightCleanup } from "../utils/sanitize-rich-text";
import { EditorProvider } from "../core/editor-context";
import type { EditorFeatureFlags } from "../core/editor-features";
import { resolveEditorFeatureFlags } from "../core/editor-features";
import type { EditorPlugin } from "../core/plugin-registry";
import { DEFAULT_PLUGINS } from "../plugins";
import { ActionBar } from "./action-bar";
import { VariablesPanel } from "./variables-panel";
import { Toolbar } from "./toolbar/toolbar";
import { EditorArea } from "./editor-area/editor-area";
// Toolbar behavior is assembled from the plugin list so new controls can be
// added without changing the editor shell itself.

/**
 * The editor keeps an explicit empty paragraph so clicks, focus, and the first
 * keystroke always land inside a block element instead of the contentEditable root.
 */
const EMPTY_PARAGRAPH = "<p><br></p>";

function ensureParagraph(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return EMPTY_PARAGRAPH;

  // Saved editor HTML is expected to start in a block. If only inline noise or
  // stray `<br>` markers remain, rebuild the canonical empty paragraph shell.
  const stripped = trimmed.replace(/<br\s*\/?>(\s*)/gi, "");
  if (!stripped) return EMPTY_PARAGRAPH;

  return trimmed;
}

interface RichTextEditorProps {
  value?: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
  height?: number;
  showVariables?: boolean;
  darkMode?: boolean;
  onImageUpload?: (file: File) => Promise<string>;
  onSave?: () => void;
  onDiscard?: () => void;
  hasUnsavedChanges?: boolean;
  onReady?: () => void;
  isSaving?: boolean;
  isDiscarding?: boolean;
  featureFlags?: EditorFeatureFlags;
  plugins?: EditorPlugin[];
}

export function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Enter your content here...",
  className,
  readOnly = false,
  height = 200,
  showVariables = true,
  darkMode = false,
  onImageUpload,
  onSave,
  onDiscard,
  hasUnsavedChanges = false,
  onReady,
  isSaving = false,
  isDiscarding = false,
  featureFlags,
  plugins,
}: RichTextEditorProps) {
  const uniqueId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const isTypingRef = useRef(false);
  const isTypingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isInitializedRef = useRef(false);
  const savedSelectionRef = useRef<Range | null>(null);
  const onChangeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // The editor emits HTML through `onChange` and later receives it back as the
  // controlled `value`. Remember the last emitted string so the sync effect can
  // ignore that round-trip and preserve the caret.
  const lastEmittedValueRef = useRef<string>("");

  const resolvedFeatureFlags = resolveEditorFeatureFlags(featureFlags);
  const editorPlugins = plugins ?? DEFAULT_PLUGINS;

  const colorState = useColorState();
  const {
    currentTextColor,
    currentBackgroundColor,
    textColorInputRef,
    backgroundColorInputRef,
    setCurrentTextColor,
    setCurrentBackgroundColor,
  } = colorState;

  const formattingState = useFormattingState();
  const {
    activeFormats,
    currentAlignment,
    currentBlockTag,
    currentFontSize,
    currentListType,
    hasLink,
    setCurrentAlignment,
    setCurrentFontSize,
  } = formattingState;

  const linkDialog = useLinkDialog();
  const {
    isLinkDialogOpen,
    linkUrl,
    linkText,
    selectedTextForLink,
    setIsLinkDialogOpen,
    setLinkUrl,
    setLinkText,
    setSelectedTextForLink,
  } = linkDialog;

  const tableDialog = useTableDialog();
  const {
    isTableDialogOpen,
    tableRows,
    tableCols,
    selectedTable,
    setIsTableDialogOpen,
    setTableRows,
    setTableCols,
    setSelectedTable,
  } = tableDialog;

  const selectionState = useSelectionState();
  const { selectedColumnLayout, setSelectedColumnLayout } = selectionState;

  const [wordCount, setWordCount] = useState(0);

  const imageResize = useImageResize();
  const { selectedImage, setSelectedImage, handleMouseDown } = imageResize;

  const editorHistory = useEditorHistory(value);
  const { addContent, undo, redo, resetHistory, isUndoRedoRef } = editorHistory;

  const { isFullscreen, toggleFullscreen } = useEditorFullscreen({
    editorRef,
    value,
    onChange,
  });

  const { handleEditorClick } = useEditorClickSelection({
    editorRef,
    selectedImage,
    selectedTable,
    selectedColumnLayout,
    setSelectedImage,
    setSelectedTable,
    setSelectedColumnLayout,
  });

  const cleanupListStyles = useCallback(() => {
    if (!editorRef.current) return;

    // List styling is renderer CSS-driven; strip editor inline styles from
    // saved DOM so fullscreen and rerenders stay visually consistent.
    const lists = editorRef.current.querySelectorAll("ul, ol");
    lists.forEach((list) => {
      if (list instanceof HTMLElement) {
        list.removeAttribute("style");
      }
    });

    // Column layout images should render without editor-specific utility classes.
    const columnImages = editorRef.current.querySelectorAll(".column-layout img, .column-left img, .column-right img");
    columnImages.forEach((img) => {
      if (img instanceof HTMLElement) {
        img.classList.remove("shadow-sm");
      }
    });
  }, []);

  useEffect(() => {
    return () => {
      if (onChangeTimeoutRef.current) clearTimeout(onChangeTimeoutRef.current);
      if (isTypingTimeoutRef.current) clearTimeout(isTypingTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      if (!isInitializedRef.current) {
        document.execCommand("defaultParagraphSeparator", false, "p");
        isInitializedRef.current = true;

        // Paint a working editor shell immediately, then replace it with the
        // current field value once the initial cleanup step finishes.
        editorRef.current.innerHTML = EMPTY_PARAGRAPH;

        const editorEl = editorRef.current;
        // Input loaded from Sanity was already sanitized on paste/save. Here we
        // only remove lightweight editor artifacts before the first render.
        const initialContent = ensureParagraph(lightCleanup(value || ""));
        editorEl.innerHTML = initialContent;
        lastEmittedValueRef.current = initialContent;
        addContent(initialContent);
        setTimeout(() => cleanupListStyles(), 0);
        onReady?.();
        return;
      }

      // Ignore the normal controlled round-trip after local typing.
      if (value === lastEmittedValueRef.current) return;

      // Do not replace DOM while the cursor is active inside the editor.
      if (
        isTypingRef.current ||
        document.activeElement === editorRef.current ||
        editorRef.current.contains(document.activeElement)
      ) {
        return;
      }

      const nextContent = ensureParagraph(lightCleanup(value || ""));
      if (editorRef.current.innerHTML !== nextContent) {
        editorRef.current.innerHTML = nextContent;
        lastEmittedValueRef.current = nextContent;
        resetHistory(nextContent);
        setTimeout(() => cleanupListStyles(), 0);
      }
    }
  }, [value, cleanupListStyles, addContent, resetHistory, onReady]);

  const handleInput = useCallback(() => {
    isTypingRef.current = true;
    if (editorRef.current) {
      const rawContent = editorRef.current.innerHTML;

      // If the user deletes the last block, restore the editor's empty
      // paragraph shell so the next keystroke still lands inside a block.
      let content = rawContent;
      if (ensureParagraph(rawContent) === EMPTY_PARAGRAPH && rawContent !== EMPTY_PARAGRAPH) {
        editorRef.current.innerHTML = EMPTY_PARAGRAPH;
        content = EMPTY_PARAGRAPH;

        const p = editorRef.current.firstChild;
        if (p) {
          const selection = window.getSelection();
          if (selection) {
            const range = document.createRange();
            range.setStart(p, 0);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
          }
        }
      }

      // History batching happens inside the hook; the editor always forwards
      // the latest HTML immediately.
      if (!isUndoRedoRef.current) {
        addContent(content);
      }

      // Footer word count follows visible plain text only.
      const text = editorRef.current?.textContent ?? "";
      setWordCount(text.trim() ? text.trim().split(/\s+/).length : 0);

      // Debounce the controlled update so the Studio field does not rerender on
      // every DOM mutation while typing.
      if (onChange) {
        if (onChangeTimeoutRef.current) {
          clearTimeout(onChangeTimeoutRef.current);
        }
        onChangeTimeoutRef.current = setTimeout(() => {
          // Record the exact HTML being emitted so the value-sync effect can
          // no-op when this same string comes back as the `value` prop.
          lastEmittedValueRef.current = content;
          onChange(content);
          onChangeTimeoutRef.current = null;
        }, 150); // Debounce onChange by 150ms
      }
    }
    if (isTypingTimeoutRef.current) {
      clearTimeout(isTypingTimeoutRef.current);
    }
    // Keep the typing flag alive comfortably longer than the onChange debounce
    // (150ms) so the re-render triggered by onChange always sees
    // isTypingRef === true and skips the DOM resync.
    isTypingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      isTypingTimeoutRef.current = null;
    }, 500);
  }, [onChange, addContent, isUndoRedoRef]);

  // Thin updateActiveFormats wrapper — calls the hook's method then handles colors
  const updateActiveFormats = useCallback(() => {
    formattingState.updateFormatsFromSelection(editorRef);

    // Color detection (not in formattingState since color state is separate)
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      setCurrentTextColor("");
      setCurrentBackgroundColor("");
      return;
    }
    const range = selection.getRangeAt(0);
    let node: Node = range.commonAncestorContainer;
    if (node.nodeType === Node.TEXT_NODE) node = node.parentNode as Node;
    let textColor = "";
    let backgroundColor = "";
    while (node && node !== editorRef.current) {
      if (node instanceof HTMLElement) {
        const tagName = node.tagName.toLowerCase();
        if (!textColor) {
          if (node.style.color) textColor = node.style.color;
          else if (tagName === "font" && node.hasAttribute("color")) textColor = node.getAttribute("color") || "";
        }
        if (!backgroundColor && node.style.backgroundColor) backgroundColor = node.style.backgroundColor;
      }
      node = node.parentNode as Node;
    }
    setCurrentTextColor(rgbToHex(textColor));
    setCurrentBackgroundColor(rgbToHex(backgroundColor));
  }, [formattingState, editorRef, setCurrentTextColor, setCurrentBackgroundColor]);

  useEffect(() => {
    const handleClickOutside = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "IMG" && !target.closest(".image-resize-container")) {
        setSelectedImage(null);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [setSelectedImage]);

  useEffect(() => {
    const handleSelectionChange = () => {
      if (
        editorRef.current &&
        (document.activeElement === editorRef.current || editorRef.current.contains(document.activeElement))
      ) {
        updateActiveFormats();
      }
    };

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateActiveFormats]);

  // MutationObserver to clean up list styles whenever DOM changes
  useEffect(() => {
    if (!editorRef.current) return;

    const observer = new MutationObserver(() => {
      cleanupListStyles();
    });

    observer.observe(editorRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });

    return () => observer.disconnect();
  }, [cleanupListStyles]);

  // Table hook for table operations
  const { addTableRow, addTableColumn, deleteTable, handleTableInsert, deleteCurrentRow, deleteCurrentColumn } =
    useEditorTable({
      editorRef,
      handleInput,
      tableRows,
      tableCols,
      setIsTableDialogOpen,
      selectedTable,
      setSelectedTable,
    });

  const handleFocus = useCallback(() => {
    isTypingRef.current = true;
    if (editorRef.current) {
      const content = editorRef.current.innerHTML.trim();
      if (!content || content === "<br>") {
        const p = document.createElement("p");
        p.innerHTML = "<br>";
        editorRef.current.innerHTML = "";
        editorRef.current.appendChild(p);
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStart(p, 0);
        range.collapse(true);
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
    }
  }, []);

  const handleBlur = useCallback(() => {
    if (isTypingTimeoutRef.current) {
      clearTimeout(isTypingTimeoutRef.current);
    }
    isTypingTimeoutRef.current = setTimeout(() => {
      isTypingRef.current = false;
      isTypingTimeoutRef.current = null;
    }, 300);
  }, []);

  // Apply styles hook
  const { applyInlineStyle, applyTextAlignment, applyTextColor, applyBackgroundColor } = useEditorApplyStyles({
    editorRef,
    handleInput,
    updateActiveFormats,
    setCurrentAlignment,
  });

  // Event handlers from custom hooks
  const { handleCopy } = useEditorCopy();
  const { handlePaste } = useEditorPaste(handleInput);
  const { handleKeyDown } = useEditorKeyboard({
    editorRef,
    onChange,
    onSave,
    hasUnsavedChanges,
    undo,
    redo,
    applyInlineStyle,
    addTableRow,
    isUndoRedoRef,
  });

  // Blocks hook for block-level formatting
  const { formatBlock, saveSelection, restoreSelection } = useEditorBlocks({
    editorRef,
    handleInput,
    updateActiveFormats,
    setCurrentBlockTag: formattingState.setCurrentBlockTag,
    savedSelectionRef,
  });

  const handleRemoveLink = useCallback(() => {
    if (!editorRef.current) {
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      return;
    }

    let node = selection.anchorNode;
    let linkElement: HTMLAnchorElement | null = null;

    // Find the parent link element
    while (node && node !== editorRef.current) {
      if (node.nodeName === "A") {
        linkElement = node as HTMLAnchorElement;
        break;
      }
      node = node.parentNode;
    }

    if (linkElement && linkElement.parentNode) {
      // Remove the link but keep the text
      const fragment = document.createDocumentFragment();
      while (linkElement.firstChild) {
        fragment.appendChild(linkElement.firstChild);
      }
      linkElement.parentNode.replaceChild(fragment, linkElement);
      handleInput();
      updateActiveFormats();
    }
  }, [handleInput, updateActiveFormats]);

  const handleLinkInsert = useCallback(() => {
    if (!linkUrl) {
      return;
    }

    if (!editorRef.current) {
      return;
    }

    if (savedSelectionRef.current) {
      restoreSelection();
      const selection = window.getSelection();

      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);

        // Get selected text or use provided linkText
        const selectedText = range.toString();
        const textToUse = selectedText || linkText || linkUrl;

        const link = document.createElement("a");
        link.href = linkUrl.startsWith("http://") || linkUrl.startsWith("https://") ? linkUrl : `https://${linkUrl}`;
        link.textContent = textToUse;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.style.color = "#3b82f6";
        link.style.textDecoration = "underline";

        range.deleteContents();
        range.insertNode(link);

        const space = document.createTextNode(" ");
        range.setStartAfter(link);
        range.insertNode(space);

        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);
      }
    }

    handleInput();
    setLinkUrl("");
    setLinkText("");
    setIsLinkDialogOpen(false);
    savedSelectionRef.current = null;
  }, [linkUrl, linkText, handleInput, restoreSelection, setIsLinkDialogOpen, setLinkText, setLinkUrl]);

  const handleLinkCancel = useCallback(() => {
    setLinkUrl("");
    setLinkText("");
    setSelectedTextForLink("");
    setIsLinkDialogOpen(false);
    savedSelectionRef.current = null;
  }, [setIsLinkDialogOpen, setLinkText, setLinkUrl, setSelectedTextForLink]);

  const insertVariable = useCallback(
    (variable: string) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      let range: Range | null = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

      // If the click moved focus away or the selection is outside our editor,
      // fall back to inserting at the very end of the editor so the variable
      // still lands somewhere useful.
      if (!range || !editorRef.current.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
      }

      range.deleteContents();
      const span = document.createElement("span");
      span.textContent = variable;
      span.className = "bg-blue-100 px-1 rounded font-mono text-sm";
      range.insertNode(span);

      // Drop the caret right after the inserted variable so the user can keep
      // typing without re-clicking.
      const after = document.createRange();
      after.setStartAfter(span);
      after.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(after);

      handleInput();
    },
    [handleInput]
  );

  const insertImageIntoEditor = useCallback(
    (imageUrl: string, altText: string = "") => {
      if (!editorRef.current) return;

      const img = document.createElement("img");
      img.src = imageUrl;
      img.alt = altText;
      img.style.maxWidth = "100%";
      img.style.height = "auto";
      img.style.display = "inline-block";
      img.style.verticalAlign = "middle";
      img.style.margin = "0 4px";
      img.style.cursor = "pointer";
      img.className = "resizable-image";

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0 && editorRef.current) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(img);

        // Add space after image
        const space = document.createTextNode(" ");
        range.setStartAfter(img);
        range.insertNode(space);
        range.setStartAfter(space);
        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
      } else if (editorRef.current) {
        editorRef.current.appendChild(img);
      }

      handleInput();
    },
    [handleInput]
  );

  const handleImageUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      editorRef.current?.focus();

      for (const file of Array.from(files)) {
        if (file.type.startsWith("image/")) {
          let imageUrl: string;

          if (onImageUpload) {
            try {
              imageUrl = await onImageUpload(file);
            } catch (error) {
              console.error("Failed to upload image:", error);
              continue;
            }
          } else {
            imageUrl = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = (event) => {
                resolve(event.target?.result as string);
              };
              reader.readAsDataURL(file);
            });
          }

          insertImageIntoEditor(imageUrl, file.name);
        }
      }
    },
    [onImageUpload, insertImageIntoEditor]
  );

  const deleteColumnLayout = useCallback(
    (layout: HTMLElement) => {
      layout.remove();
      setSelectedColumnLayout(null);
      handleInput();
    },
    [handleInput, setSelectedColumnLayout]
  );

  const handleFontSize = useCallback(
    (size: string) => {
      if (!editorRef.current) return;

      // Handle "default" - remove custom font size
      if (size === "default") {
        editorRef.current.focus();

        // Try to get current selection or use saved selection
        const selection = window.getSelection();

        if (savedSelectionRef.current && selection) {
          selection.removeAllRanges();
          selection.addRange(savedSelectionRef.current);
        }

        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        let node = range.startContainer;

        if (node.nodeType === Node.TEXT_NODE) {
          node = node.parentNode as Node;
        }

        // Find the closest span with font-size OR the closest block element with spans inside
        let targetSpan: HTMLElement | null = null;
        let blockElement: HTMLElement | null = null;
        let current = node;

        while (current && current !== editorRef.current) {
          if (current instanceof HTMLElement) {
            const tagName = current.tagName.toLowerCase();

            // Check if this is a span with font-size
            if (tagName === "span" && current.style.fontSize) {
              targetSpan = current;
              break;
            }

            // Check if this is a block element (h1, h2, h3, p)
            if (tagName === "h1" || tagName === "h2" || tagName === "h3" || tagName === "p") {
              blockElement = current;
            }
          }
          current = current.parentNode as Node;
        }

        // If we found a span with font-size, remove it
        if (targetSpan) {
          // Remove the font-size style
          targetSpan.style.removeProperty("font-size");

          // If span has no more styles or classes, unwrap it
          if (!targetSpan.style.cssText && !targetSpan.className) {
            const parent = targetSpan.parentNode;
            if (parent) {
              const textContent = targetSpan.textContent;
              const textNode = document.createTextNode(textContent || "");
              parent.replaceChild(textNode, targetSpan);
            }
          }

          handleInput();
          setCurrentFontSize("");

          requestAnimationFrame(() => {
            updateActiveFormats();
          });

          editorRef.current.focus();
        }
        // If no specific span found but we're in a block element, remove all font-sizes in that block
        else if (blockElement) {
          const spans = blockElement.querySelectorAll('span[style*="font-size"]');

          spans.forEach((span) => {
            if (span instanceof HTMLElement && span.style.fontSize) {
              span.style.removeProperty("font-size");

              // If span has no more styles or classes, unwrap it
              if (!span.style.cssText && !span.className) {
                const parent = span.parentNode;
                if (parent) {
                  while (span.firstChild) {
                    parent.insertBefore(span.firstChild, span);
                  }
                  parent.removeChild(span);
                }
              }
            }
          });

          handleInput();
          setCurrentFontSize("");

          requestAnimationFrame(() => {
            updateActiveFormats();
          });

          editorRef.current.focus();
        }

        return;
      }

      const sizeMap: { [key: string]: string } = {
        "1": "clamp(0.5rem, 1vw, 0.75rem)",
        "2": "clamp(0.625rem, 1.2vw, 0.875rem)",
        "3": "clamp(0.75rem, 1.5vw, 1rem)",
        "4": "clamp(0.875rem, 1.8vw, 1.125rem)",
        "5": "clamp(1.125rem, 2.2vw, 1.5rem)",
        "6": "clamp(1.5rem, 3vw, 2rem)",
        "7": "clamp(2.25rem, 4vw, 3rem)",
      };

      const fontSize = sizeMap[size] || size;

      // Restore selection if available
      if (savedSelectionRef.current) {
        editorRef.current.focus();
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(savedSelectionRef.current);

        // Now apply the font size
        const range = selection?.getRangeAt(0);
        if (range) {
          // If collapsed (no selection), just set the state for future typing
          if (range.collapsed) {
            setCurrentFontSize(fontSize);
            editorRef.current.focus();
            return;
          }

          const span = document.createElement("span");
          span.style.fontSize = fontSize;

          try {
            range.surroundContents(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          } catch {
            const fragment = range.extractContents();
            span.appendChild(fragment);
            range.insertNode(span);
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            selection?.removeAllRanges();
            selection?.addRange(newRange);
          }

          handleInput();

          // Update current font size state immediately
          setCurrentFontSize(fontSize);

          editorRef.current.focus();
        }
      }
    },
    [handleInput, updateActiveFormats, setCurrentFontSize]
  );

  const handleTextColor = useCallback(
    (color: string) => {
      applyTextColor(color);
    },
    [applyTextColor]
  );

  const handleBackgroundColor = useCallback(
    (color: string) => {
      applyBackgroundColor(color);
    },
    [applyBackgroundColor]
  );

  const insertColumnLayout = useCallback(() => {
    if (!editorRef.current) return;

    editorRef.current.focus();

    const columnContainer = document.createElement("div");
    columnContainer.className = "column-layout";
    columnContainer.style.cssText = "display: flex; gap: 1rem; margin: 1rem 0; align-items: flex-start;";

    const leftColumn = document.createElement("div");
    leftColumn.className = "column-left";
    leftColumn.style.cssText = "flex: 0 0 auto; min-width: 100px;";
    leftColumn.innerHTML = "<p style='color: inherit; font-size: inherit; margin: 0;'>Left column (e.g., image)</p>";

    const rightColumn = document.createElement("div");
    rightColumn.className = "column-right";
    rightColumn.style.cssText = "flex: 1; min-width: 200px;";
    rightColumn.innerHTML = "<p style='color: inherit; font-size: inherit; margin: 0;'>Right column (e.g., text)</p>";

    columnContainer.appendChild(leftColumn);
    columnContainer.appendChild(rightColumn);

    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(columnContainer);
      range.setStartAfter(columnContainer);
      range.setEndAfter(columnContainer);
      selection.removeAllRanges();
      selection.addRange(range);
    } else {
      editorRef.current.appendChild(columnContainer);
    }

    handleInput();
  }, [handleInput]);

  const handleList = useCallback(
    (type: "ul" | "ol") => {
      if (!editorRef.current) return;

      editorRef.current.focus();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      try {
        const range = selection.getRangeAt(0);

        // Get the common ancestor
        const container = range.commonAncestorContainer;
        const containerElement =
          container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);

        // Find all block-level elements within the selection
        let blockElements: HTMLElement[] = [];

        // Helper: when cursor is at the editor level (bare text), wrap it in a <p>
        const resolveBlock = (node: Node): HTMLElement | null => {
          let block = node.nodeType === Node.TEXT_NODE ? node.parentElement : (node as HTMLElement);
          while (block && block !== editorRef.current && !block.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
            block = block.parentElement;
          }
          if (!block || block === editorRef.current) {
            // Bare text or cursor directly in editor — wrap in <p>
            let target: Node | null = node;
            while (target && target.parentNode !== editorRef.current) {
              target = target.parentNode;
            }
            if (target && editorRef.current) {
              if (target.nodeType === Node.TEXT_NODE) {
                const p = document.createElement("p");
                editorRef.current.insertBefore(p, target);
                p.appendChild(target);
                return p;
              }
              if (target.nodeType === Node.ELEMENT_NODE) {
                return target as HTMLElement;
              }
            }
            return null;
          }
          return block;
        };

        if (containerElement) {
          const startBlock = resolveBlock(range.startContainer);
          const endBlock = resolveBlock(range.endContainer);

          // Collect all blocks between start and end
          if (startBlock && startBlock === endBlock) {
            blockElements = [startBlock];
          } else if (startBlock && endBlock) {
            let current: Element | null = startBlock;
            blockElements.push(startBlock);

            while (current && current !== endBlock) {
              let next: Element | null = current.nextElementSibling;
              if (!next) {
                current = current.parentElement;
                if (current) next = current.nextElementSibling;
              }

              current = next;

              if (current?.tagName?.match(/^(P|DIV|H[1-6]|LI)$/)) {
                blockElements.push(current as HTMLElement);
                if (current === endBlock) break;
              }
            }
          }
        }

        blockElements = blockElements.filter((el) => el !== editorRef.current);
        if (blockElements.length === 0) return;

        // Check if we're toggling off lists
        const firstBlock = blockElements[0];
        if (firstBlock && firstBlock.tagName === "LI") {
          const parentList = firstBlock.parentElement;
          if (parentList && (parentList.tagName === "UL" || parentList.tagName === "OL")) {
            if ((type === "ul" && parentList.tagName === "UL") || (type === "ol" && parentList.tagName === "OL")) {
              // Toggle-off: convert selected <li>s back to <p>s while preserving
              // document order.
              const listTag = parentList.tagName;
              const listParent = parentList.parentNode;
              if (listParent) {
                const selectedLis = new Set(
                  blockElements.filter((b) => b.tagName === "LI" && b.parentElement === parentList)
                );

                type Group = { kind: "list"; items: HTMLElement[] } | { kind: "p"; item: HTMLElement };
                const groups: Group[] = [];
                for (const child of Array.from(parentList.children)) {
                  if (child.tagName !== "LI") continue;
                  const li = child as HTMLElement;
                  if (selectedLis.has(li)) {
                    groups.push({ kind: "p", item: li });
                  } else {
                    const last = groups[groups.length - 1];
                    if (last && last.kind === "list") last.items.push(li);
                    else groups.push({ kind: "list", items: [li] });
                  }
                }

                const anchor = parentList.nextSibling;
                parentList.remove();

                let lastPlaced: HTMLElement | null = null;
                for (const g of groups) {
                  if (g.kind === "list") {
                    const newList = document.createElement(listTag);
                    for (const li of g.items) newList.appendChild(li);
                    listParent.insertBefore(newList, anchor);
                    lastPlaced = newList;
                  } else {
                    const p = document.createElement("p");
                    while (g.item.firstChild) p.appendChild(g.item.firstChild);
                    // Preserve empty items as <p><br></p> so the caret has somewhere to land.
                    if (!p.firstChild) p.appendChild(document.createElement("br"));
                    listParent.insertBefore(p, anchor);
                    lastPlaced = p;
                  }
                }

                // Drop the caret at the end of the last placed block so the
                // editor doesn't lose focus context.
                if (lastPlaced) {
                  const newRange = document.createRange();
                  newRange.selectNodeContents(lastPlaced);
                  newRange.collapse(false);
                  selection.removeAllRanges();
                  selection.addRange(newRange);
                }
              }

              handleInput();
              return;
            } else {
              // Switch list type
              const newList = document.createElement(type);
              while (parentList.firstChild) {
                newList.appendChild(parentList.firstChild);
              }
              parentList.parentNode?.replaceChild(newList, parentList);
              handleInput();
              return;
            }
          }
        }

        // Create a new list with all selected blocks as list items
        const list = document.createElement(type);

        blockElements.forEach((block, index) => {
          const listItem = document.createElement("li");

          // Move content from block to list item
          while (block.firstChild) {
            listItem.appendChild(block.firstChild);
          }

          list.appendChild(listItem);

          // Remove the original block
          if (index === 0) {
            block.parentNode?.replaceChild(list, block);
          } else {
            block.remove();
          }
        });

        // Restore selection
        if (list.lastElementChild) {
          const newRange = document.createRange();
          const lastItem = list.lastElementChild;
          newRange.selectNodeContents(lastItem);
          newRange.collapse(false);
          selection.removeAllRanges();
          selection.addRange(newRange);
        }

        handleInput();
      } catch (error) {
        console.error("handleList failed:", error);
      }

      editorRef.current.focus();
    },
    [handleInput]
  );

  const editorContent = (
    <div
      className={cn(
        "rich-text-editor overflow-hidden",
        darkMode
          ? "dark border border-blue-500/40 rounded shadow-[0_2px_16px_rgba(0,0,0,0.6)] bg-[#141618] text-white"
          : "border border-blue-400/30 rounded shadow-sm bg-white text-gray-900",
        isFullscreen &&
          "fixed inset-0 z-[999999999] rounded-none border-0 shadow-none flex flex-col overflow-y-auto font-sans",
        isFullscreen && (darkMode ? "bg-[#141618] text-white" : "bg-white text-gray-900"),
        !isFullscreen && className
      )}
    >
      {onSave && (
        <ActionBar
          darkMode={darkMode}
          isFullscreen={isFullscreen}
          hasUnsavedChanges={hasUnsavedChanges}
          isSaving={isSaving}
          isDiscarding={isDiscarding}
          onSave={onSave}
          onDiscard={onDiscard}
        />
      )}

      {showVariables && !isFullscreen && <VariablesPanel darkMode={darkMode} onInsertVariable={insertVariable} />}

      <Toolbar
        darkMode={darkMode}
        isFullscreen={isFullscreen}
        readOnly={readOnly}
        uniqueId={uniqueId}
        currentBlockTag={currentBlockTag}
        currentFontSize={currentFontSize}
        currentAlignment={currentAlignment}
        currentListType={currentListType}
        currentTextColor={currentTextColor}
        currentBackgroundColor={currentBackgroundColor}
        activeFormats={activeFormats}
        hasLink={hasLink}
        selectedTable={selectedTable}
        selectedColumnLayout={selectedColumnLayout}
        isLinkDialogOpen={isLinkDialogOpen}
        isTableDialogOpen={isTableDialogOpen}
        linkUrl={linkUrl}
        linkText={linkText}
        selectedTextForLink={selectedTextForLink}
        tableRows={tableRows}
        tableCols={tableCols}
        textColorInputRef={textColorInputRef}
        backgroundColorInputRef={backgroundColorInputRef}
        onFormatBlock={formatBlock}
        onFontSize={handleFontSize}
        onInlineStyle={applyInlineStyle}
        onAlignment={applyTextAlignment}
        onList={handleList}
        onInsertColumn={insertColumnLayout}
        onDeleteColumnLayout={deleteColumnLayout}
        onImageUpload={handleImageUpload}
        onToggleFullscreen={toggleFullscreen}
        onSaveSelection={saveSelection}
        onSetTextColor={setCurrentTextColor}
        onSetBackgroundColor={setCurrentBackgroundColor}
        onApplyTextColor={handleTextColor}
        onApplyBackgroundColor={handleBackgroundColor}
        onLinkDialogOpenChange={setIsLinkDialogOpen}
        onLinkUrlChange={setLinkUrl}
        onLinkTextChange={setLinkText}
        onLinkInsert={handleLinkInsert}
        onLinkCancel={handleLinkCancel}
        onSetSelectedText={setSelectedTextForLink}
        onRemoveLink={handleRemoveLink}
        onTableDialogOpenChange={setIsTableDialogOpen}
        onTableRowsChange={setTableRows}
        onTableColsChange={setTableCols}
        onTableInsert={handleTableInsert}
        onAddTableRow={addTableRow}
        onAddTableColumn={addTableColumn}
        onDeleteTableRow={deleteCurrentRow}
        onDeleteTableColumn={deleteCurrentColumn}
        onDeleteTable={deleteTable}
        onRestoreSelection={restoreSelection}
      />

      <EditorArea
        editorRef={editorRef}
        isFullscreen={isFullscreen}
        readOnly={readOnly}
        darkMode={darkMode}
        height={height}
        wordCount={wordCount}
        placeholder={placeholder}
        uniqueId={uniqueId}
        selectedImage={selectedImage}
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleEditorClick}
        onKeyDown={handleKeyDown}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onImageResizeMouseDown={handleMouseDown}
      />
    </div>
  );

  return (
    <EditorProvider plugins={editorPlugins} editorRef={editorRef} featureFlags={resolvedFeatureFlags}>
      {/* Normal mode - render directly */}
      {!isFullscreen && editorContent}

      {/* Fullscreen mode - render in portal */}
      {isFullscreen &&
        createPortal(
          <>
            {/* Fullscreen backdrop */}
            <div
              className="fixed inset-0 z-[999999998] bg-black/50"
              onClick={(e) => {
                e.stopPropagation();
                toggleFullscreen();
              }}
            />
            {/* Editor content */}
            {editorContent}
          </>,
          document.body
        )}
    </EditorProvider>
  );
}
