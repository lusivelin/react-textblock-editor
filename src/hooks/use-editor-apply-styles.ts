import { type RefObject, useCallback } from "react";

interface UseEditorApplyStylesProps {
  editorRef: RefObject<HTMLDivElement | null>;
  handleInput: () => void;
  updateActiveFormats: () => void;
  setCurrentAlignment: (alignment: string) => void;
}

/**
 * Collect every text node that intersects the given range.
 * Used to decide whether an entire selection is already wrapped in a tag.
 */
function collectTextNodesInRange(range: Range): Text[] {
  const root = range.commonAncestorContainer;
  if (root.nodeType === Node.TEXT_NODE) {
    return [root as Text];
  }
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) => (range.intersectsNode(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }
  return nodes;
}

/** Is `node` (or any ancestor up to `stop`) an element of `tagName`? */
function hasAncestorTag(node: Node | null, tagName: string, stop: Node): boolean {
  let current: Node | null = node;
  while (current && current !== stop) {
    if (current instanceof HTMLElement && current.tagName.toLowerCase() === tagName) return true;
    current = current.parentNode;
  }
  return false;
}

/** Find the nearest ancestor element matching `tagName`, stopping at `stop`. */
function findTagAncestor(node: Node | null, tagName: string, stop: Node): HTMLElement | null {
  let current: Node | null = node;
  while (current && current !== stop) {
    if (current instanceof HTMLElement && current.tagName.toLowerCase() === tagName) return current;
    current = current.parentNode;
  }
  return null;
}

/**
 * Isolate the `[start, end]` slice of `textNode` as its own text node and
 * return it. The surrounding characters stay in their own sibling text nodes.
 */
function isolateTextSlice(textNode: Text, start: number, end: number): Text {
  const len = textNode.length;
  const safeStart = Math.max(0, Math.min(start, len));
  const safeEnd = Math.max(safeStart, Math.min(end, len));
  if (safeStart >= safeEnd) return textNode;

  // Split off the "after" portion first so offsets in `textNode` stay valid.
  if (safeEnd < len) textNode.splitText(safeEnd);
  // Split at `safeStart`; the returned node holds the slice we want.
  if (safeStart > 0) return textNode.splitText(safeStart);
  return textNode;
}

/**
 * Wrap a text node in `<tagName>` *at its current position*. The wrapper
 * becomes the text node's new parent, inserted as a sibling where the text
 * node used to live. This never crosses block boundaries — whatever element
 * contained the text node still contains (the wrapper around) it.
 */
function wrapTextNodeInTag(textNode: Text, tagName: string): HTMLElement {
  const parent = textNode.parentNode;
  const wrapper = document.createElement(tagName);
  if (parent) parent.insertBefore(wrapper, textNode);
  wrapper.appendChild(textNode);
  return wrapper;
}

/**
 * Pull `textNode` out of its nearest matching `<tagName>` ancestor, splitting
 * each intermediate wrapper as we climb so siblings before/after stay wrapped
 * exactly as they were. After this runs, `textNode` lives as a direct child
 * of the matching ancestor's former parent; the matching ancestor itself is
 * either removed (if empty) or kept (containing the "before" siblings), with
 * a clone inserted after `textNode` containing the "after" siblings.
 *
 * Intermediate non-matching wrappers (e.g. an `<em>` inside a `<strong>`) are
 * preserved: the text node's pre/post siblings stay wrapped in those tags,
 * but the text node itself does cross them on the way out. Callers that want
 * to re-apply intermediate wrappers can re-wrap after.
 */
function unwrapTextFromNearestTag(textNode: Text, tagName: string, stopAt: Node): void {
  const ancestor = findTagAncestor(textNode, tagName, stopAt);
  if (!ancestor) return;

  // `current` stays the same *node*, but its `.parentNode` shifts up one level
  // on each iteration because we move it out of its immediate wrapper.
  const current: Node = textNode;
  while (current.parentNode && current !== ancestor) {
    const parent = current.parentNode as HTMLElement;
    const grandParent = parent.parentNode;
    if (!grandParent) break;

    const hasAfterSiblings = !!current.nextSibling;
    if (hasAfterSiblings) {
      // Clone the wrapper and move everything after `current` into the clone.
      const clone = parent.cloneNode(false) as HTMLElement;
      let next = current.nextSibling;
      while (next) {
        const toMove = next;
        next = next.nextSibling as ChildNode;
        clone.appendChild(toMove);
      }
      if (parent.nextSibling) grandParent.insertBefore(clone, parent.nextSibling);
      else grandParent.appendChild(clone);
    }

    const hasBeforeSiblings = !!current.previousSibling;
    if (hasBeforeSiblings) {
      // Move `current` out, leaving the "before" siblings behind in `parent`.
      if (parent.nextSibling) grandParent.insertBefore(current, parent.nextSibling);
      else grandParent.appendChild(current);
    } else {
      // `current` was the only/first child of `parent` — move it before
      // `parent` and drop `parent` entirely if now empty.
      grandParent.insertBefore(current, parent);
      if (!parent.hasChildNodes()) grandParent.removeChild(parent);
    }

    if (parent === ancestor) break;
    // Keep climbing: `current` is now a sibling at the grandparent level.
  }
}

/**
 * If `slice`'s parent is a `<tagName>` element, merge any same-tag siblings
 * immediately before/after that wrapper into it. Children (including our
 * `slice` reference) survive the merge because they're *moved*, not cloned.
 */
function mergeAdjacentSameTagSiblings(slice: Text, tagName: string): void {
  const wrapper = slice.parentElement;
  if (!wrapper || wrapper.tagName.toLowerCase() !== tagName) return;

  const prev = wrapper.previousSibling;
  if (prev instanceof HTMLElement && prev.tagName.toLowerCase() === tagName) {
    // Collect prev's children into a fragment first so relative order
    // is preserved when we prepend them to the surviving wrapper.
    const frag = document.createDocumentFragment();
    while (prev.firstChild) frag.appendChild(prev.firstChild);
    wrapper.insertBefore(frag, wrapper.firstChild);
    prev.remove();
  }
  const next = wrapper.nextSibling;
  if (next instanceof HTMLElement && next.tagName.toLowerCase() === tagName) {
    while (next.firstChild) wrapper.appendChild(next.firstChild);
    next.remove();
  }
}

/**
 * Toggle an inline formatting tag (strong/em/u) for the current range.
 *
 * The key invariant: all wrapping/unwrapping happens at the *text-node* level.
 * That guarantees the wrapper is always a sibling of the text it wraps,
 * which is inside the same block element (`<li>`, `<p>`, `<h*>`, etc.) — so
 * we never create invalid HTML like `<strong><li>…</li></strong>`, even when
 * the selection spans multiple list items or paragraphs.
 *
 * Behavior:
 * - If every text node in the range is already inside a matching ancestor,
 *   each text node's in-range slice is pulled out of that ancestor (toggle OFF).
 * - Otherwise each text node's in-range slice is wrapped in a fresh `<tagName>`.
 *   Slices already under a matching ancestor are skipped to avoid nesting.
 *
 * Headings are treated identically to paragraphs — bold is a semantic
 * `<strong>` wrapper, not a property of the heading itself.
 */
function toggleInlineFormat({
  tagName,
  range,
  selection,
  editor,
}: {
  tagName: string;
  range: Range;
  selection: Selection;
  editor: HTMLElement;
}) {
  const textNodes = collectTextNodesInRange(range);
  if (textNodes.length === 0) return;

  // Snapshot the range boundaries before any DOM mutations.
  const startContainer = range.startContainer;
  const startOffset = range.startOffset;
  const endContainer = range.endContainer;
  const endOffset = range.endOffset;

  const unwrapping = textNodes.every((tn) => hasAncestorTag(tn, tagName, editor));

  // Compute, for each text node, the [start, end] portion that's in range.
  // Do this BEFORE any splitting since splitTexts will mutate `length`s.
  type Slice = { node: Text; start: number; end: number };
  const slices: Slice[] = [];
  for (const node of textNodes) {
    const s = node === startContainer ? startOffset : 0;
    const e = node === endContainer ? endOffset : node.length;
    if (s < e) slices.push({ node, start: s, end: e });
  }
  if (slices.length === 0) return;

  // Process in REVERSE document order so splits never shift earlier offsets.
  const processedSlices: Text[] = [];
  for (let i = slices.length - 1; i >= 0; i--) {
    const { node, start, end } = slices[i]!;
    const slice = isolateTextSlice(node, start, end);

    if (unwrapping) {
      unwrapTextFromNearestTag(slice, tagName, editor);
    } else if (!hasAncestorTag(slice, tagName, editor)) {
      wrapTextNodeInTag(slice, tagName);
    }

    processedSlices.unshift(slice); // restore document order
  }

  // Coalesce adjacent same-tag wrappers that wrapping may have produced.
  // Example: wrapping across `<li>A<strong>B</strong>C</li>` would produce
  // `<li><strong>A</strong><strong>B</strong><strong>C</strong></li>`; this
  // pass merges them into a single `<strong>ABC</strong>`. Text-node
  // references inside the wrappers survive the merge, so our selection
  // restoration below still works.
  for (const slice of processedSlices) {
    mergeAdjacentSameTagSiblings(slice, tagName);
  }

  // Restore selection spanning the first..last processed slice.
  try {
    const first = processedSlices[0];
    const last = processedSlices[processedSlices.length - 1];
    if (first && last) {
      const newRange = document.createRange();
      newRange.setStartBefore(first);
      newRange.setEndAfter(last);
      selection.removeAllRanges();
      selection.addRange(newRange);
    }
  } catch {
    // Selection restoration is best-effort; browsers are strict about
    // disconnected nodes in certain edge cases.
  }
}

/**
 * Hook for applying inline styles and formatting to the rich text editor
 * Handles text color, background color, font size, alignment, and inline formatting
 */
export function useEditorApplyStyles({
  editorRef,
  handleInput,
  updateActiveFormats,
  setCurrentAlignment,
}: UseEditorApplyStylesProps) {
  const applyInlineStyle = useCallback(
    (tagName: string, style?: { [key: string]: string }) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);

      if (range.collapsed) {
        return;
      }

      try {
        if (style && Object.keys(style).length > 0) {
          // Handle inline styles (color, backgroundColor, fontSize)
          const element = document.createElement(tagName);

          Object.entries(style).forEach(([key, value]) => {
            // Use direct property assignment for camelCase properties
            (element.style as unknown as Record<string, string>)[key] = value;
          });

          try {
            range.surroundContents(element);

            // Keep selection on the new element
            const newRange = document.createRange();
            newRange.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(newRange);
          } catch {
            // If surroundContents fails, use extraction method
            const fragment = range.extractContents();
            element.appendChild(fragment);
            range.insertNode(element);

            // Select the new element
            const newRange = document.createRange();
            newRange.selectNodeContents(element);
            selection.removeAllRanges();
            selection.addRange(newRange);
          }
        } else {
          // Formatting tags (bold, italic, underline): toggle smoothly.
          toggleInlineFormat({
            tagName: tagName.toLowerCase(),
            range,
            selection,
            editor: editorRef.current,
          });
        }
      } catch (error) {
        console.error("applyInlineStyle failed:", error);
      }

      handleInput();

      // Update formats immediately
      requestAnimationFrame(() => {
        updateActiveFormats();
      });
    },
    [editorRef, handleInput, updateActiveFormats]
  );

  const applyTextAlignment = useCallback(
    (alignment: "left" | "center" | "right" | "justify") => {
      if (!editorRef.current) return;

      editorRef.current.focus();

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      const container = range.commonAncestorContainer;

      // Find the block-level parent element
      let blockElement = container.nodeType === Node.TEXT_NODE ? container.parentElement : (container as HTMLElement);

      while (blockElement && blockElement !== editorRef.current) {
        const display = window.getComputedStyle(blockElement).display;
        if (display === "block" || blockElement.tagName.match(/^(P|DIV|H[1-6]|LI)$/)) {
          break;
        }
        blockElement = blockElement.parentElement;
      }

      if (blockElement && blockElement !== editorRef.current) {
        blockElement.style.textAlign = alignment;
      } else if (editorRef.current) {
        // Selection spans multiple blocks (e.g. Cmd+A) — align every block that intersects the range
        const blocks = editorRef.current.querySelectorAll("p, div, h1, h2, h3, h4, h5, h6, li");
        let applied = false;

        blocks.forEach((block) => {
          if (block instanceof HTMLElement && block !== editorRef.current && range.intersectsNode(block)) {
            block.style.textAlign = alignment;
            applied = true;
          }
        });

        if (!applied) {
          // No block children found — bare text or empty editor
          const p = document.createElement("p");
          p.style.textAlign = alignment;

          if (container.nodeType === Node.TEXT_NODE && container.parentElement === editorRef.current) {
            editorRef.current.replaceChild(p, container);
            p.appendChild(container);
          } else if (!editorRef.current.textContent?.trim()) {
            p.innerHTML = "<br>";
            editorRef.current.innerHTML = "";
            editorRef.current.appendChild(p);
          }
        }
      }

      editorRef.current.focus();
      handleInput();

      // Update alignment state immediately
      setCurrentAlignment(alignment);
    },
    [editorRef, handleInput, setCurrentAlignment]
  );

  const removeInlineStyle = useCallback(
    (styleProperty: string) => {
      if (!editorRef.current) return;

      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;

      const range = selection.getRangeAt(0);
      let node = range.commonAncestorContainer;

      if (node.nodeType === Node.TEXT_NODE) {
        node = node.parentNode as Node;
      }

      // Convert camelCase to kebab-case for CSS property lookup
      const kebabCase = styleProperty.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();

      // Find the span/font with the style property
      let styleSpan: HTMLElement | null = null;
      let current = node;

      while (current && current !== editorRef.current) {
        if (current instanceof HTMLElement) {
          const tagName = current.tagName.toLowerCase();
          if (tagName === "span" || tagName === "font") {
            // Check both camelCase and kebab-case, and font color attribute
            const hasStyle =
              current.style.getPropertyValue(kebabCase) ||
              (current.style as unknown as Record<string, string>)[styleProperty] ||
              (tagName === "font" && styleProperty === "color" && current.hasAttribute("color"));
            if (hasStyle) {
              styleSpan = current;
              break;
            }
          }
        }
        current = current.parentNode as Node;
      }

      if (styleSpan) {
        const tagName = styleSpan.tagName.toLowerCase();

        // Remove the style property (both formats)
        styleSpan.style.removeProperty(kebabCase);
        styleSpan.style.removeProperty(styleProperty);
        (styleSpan.style as unknown as Record<string, string>)[styleProperty] = "";

        // Remove font color attribute if it exists
        if (tagName === "font" && styleProperty === "color") {
          styleSpan.removeAttribute("color");
        }

        // Drop the now-empty `style=""` and `class=""` attributes so the
        // tidy-up below doesn't see them and decide the wrapper is still
        // "meaningful". Without this, a `<span>` with no remaining styles
        // could survive as `<span style="" class="">…</span>`.
        if (styleSpan.style.length === 0) styleSpan.removeAttribute("style");
        if (!styleSpan.className) styleSpan.removeAttribute("class");

        // Unwrap when the only thing left is the tag itself (no styles, no
        // class, no other meaningful attributes).
        const isBareSpan = styleSpan.tagName.toLowerCase() === "span" || styleSpan.tagName.toLowerCase() === "font";
        if (isBareSpan && styleSpan.attributes.length === 0) {
          const parent = styleSpan.parentNode;
          if (parent) {
            const fragment = document.createDocumentFragment();
            while (styleSpan.firstChild) {
              fragment.appendChild(styleSpan.firstChild);
            }
            parent.replaceChild(fragment, styleSpan);
          }
        }
        handleInput();
        requestAnimationFrame(() => {
          updateActiveFormats();
        });
      }
    },
    [editorRef, handleInput, updateActiveFormats]
  );

  const applyTextColor = useCallback(
    (color: string) => {
      if (!color) {
        // Remove color style
        removeInlineStyle("color");
      } else {
        applyInlineStyle("span", { color });
      }
      requestAnimationFrame(() => {
        updateActiveFormats();
      });
    },
    [applyInlineStyle, removeInlineStyle, updateActiveFormats]
  );

  const applyBackgroundColor = useCallback(
    (backgroundColor: string) => {
      if (!backgroundColor) {
        // Remove background color style
        removeInlineStyle("backgroundColor");
      } else {
        applyInlineStyle("span", { backgroundColor });
      }
      requestAnimationFrame(() => {
        updateActiveFormats();
      });
    },
    [applyInlineStyle, removeInlineStyle, updateActiveFormats]
  );

  const applyFontSize = useCallback(
    (size: string) => {
      const sizeMap: { [key: string]: string } = {
        "1": "0.5rem",
        "2": "0.625rem",
        "3": "0.75rem",
        "4": "0.875rem",
        "5": "1.125rem",
        "6": "1.5rem",
        "7": "2.25rem",
      };

      const fontSize = sizeMap[size] || size;
      applyInlineStyle("span", { fontSize });
    },
    [applyInlineStyle]
  );

  const resetAllStyles = useCallback(() => {
    if (!editorRef.current) return;

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Don't do anything if there's no selection
    if (range.collapsed) return;

    try {
      // Save the text content and basic structure
      const fragment = range.cloneContents();
      const tempDiv = document.createElement("div");
      tempDiv.appendChild(fragment);

      // Function to recursively unwrap inline formatting elements and strip all styles
      const cleanNode = (node: Node): Node | DocumentFragment => {
        // Text nodes are returned as-is
        if (node.nodeType === Node.TEXT_NODE) {
          return node.cloneNode(false);
        }

        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toLowerCase();

          // List of block elements to preserve (but strip their styles)
          const blockElements = ["p", "div", "h1", "h2", "h3", "br", "ul", "ol", "li"];

          // List of inline formatting elements to unwrap completely
          const inlineFormattingElements = [
            "strong",
            "b",
            "em",
            "i",
            "u",
            "s",
            "strike",
            "del",
            "span",
            "font",
            "a",
            "mark",
            "small",
            "sub",
            "sup",
            "code",
          ];

          if (blockElements.includes(tagName)) {
            // Keep the block element but remove all attributes and clean children
            const newElement = document.createElement(tagName);

            // Recursively clean all children
            Array.from(element.childNodes).forEach((child) => {
              const cleanedChild = cleanNode(child);
              if (cleanedChild instanceof DocumentFragment) {
                newElement.appendChild(cleanedChild);
              } else {
                newElement.appendChild(cleanedChild);
              }
            });

            return newElement;
          } else if (inlineFormattingElements.includes(tagName)) {
            // Unwrap inline formatting - just return the cleaned children
            const fragment = document.createDocumentFragment();
            Array.from(element.childNodes).forEach((child) => {
              const cleanedChild = cleanNode(child);
              if (cleanedChild instanceof DocumentFragment) {
                fragment.appendChild(cleanedChild);
              } else {
                fragment.appendChild(cleanedChild);
              }
            });
            return fragment;
          } else {
            // For any other elements (img, table, etc.), preserve them but remove attributes
            const newElement = document.createElement(tagName);

            // For images, keep src and alt only
            if (tagName === "img") {
              const src = element.getAttribute("src");
              const alt = element.getAttribute("alt");
              if (src) newElement.setAttribute("src", src);
              if (alt) newElement.setAttribute("alt", alt);
            }

            // Recursively clean children
            Array.from(element.childNodes).forEach((child) => {
              const cleanedChild = cleanNode(child);
              if (cleanedChild instanceof DocumentFragment) {
                newElement.appendChild(cleanedChild);
              } else {
                newElement.appendChild(cleanedChild);
              }
            });

            return newElement;
          }
        }

        // For other node types, return as-is
        return node.cloneNode(false);
      };

      // Clean all nodes in the temp div
      const cleanedDiv = document.createElement("div");
      Array.from(tempDiv.childNodes).forEach((child) => {
        const cleanedChild = cleanNode(child);
        if (cleanedChild instanceof DocumentFragment) {
          cleanedDiv.appendChild(cleanedChild);
        } else {
          cleanedDiv.appendChild(cleanedChild);
        }
      });

      // Delete the original selection
      range.deleteContents();

      // Insert the cleaned content
      const cleanedFragment = document.createDocumentFragment();
      while (cleanedDiv.firstChild) {
        cleanedFragment.appendChild(cleanedDiv.firstChild);
      }
      range.insertNode(cleanedFragment);

      // Collapse selection to end
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);

      handleInput();
      requestAnimationFrame(() => {
        updateActiveFormats();
      });
    } catch (error) {
      console.error("resetAllStyles failed:", error);
    }
  }, [editorRef, handleInput, updateActiveFormats]);

  return {
    applyInlineStyle,
    applyTextAlignment,
    removeInlineStyle,
    applyTextColor,
    applyBackgroundColor,
    applyFontSize,
    resetAllStyles,
  };
}
