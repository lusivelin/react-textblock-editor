import { type RefObject, useEffect } from "react";

/**
 * Applies renderer-side DOM cleanup after rich text HTML is injected.
 *
 * Presentation stays in CSS. This hook only removes editor artifacts and adds
 * safe link behavior that should not be stored back into Sanity.
 */
export function useRichTextStyling(containerRef: RefObject<HTMLDivElement | null>, sanitizedContent: string): void {
  useEffect(() => {
    if (!containerRef.current || !sanitizedContent) return;

    const container = containerRef.current;
    cleanupEditorArtifacts(container);
    stripTableEditorAttributes(container);
    makeExternalLinksSafe(container);
  }, [containerRef, sanitizedContent]);
}

/**
 * Remove editing attributes and browser spelling markers that should never be
 * visible in frontend output.
 */
function cleanupEditorArtifacts(container: HTMLElement): void {
  container.querySelectorAll("[contenteditable]").forEach((el) => {
    el.removeAttribute("contenteditable");
  });

  const errorSelectors = [
    '[data-markjs="true"]',
    "[data-spelling-error]",
    "[data-grammar-error]",
    ".Spelling",
    ".GrammarError",
    ".SpellingErrorV2Themed",
    ".ContextualSpellingAndGrammarErrorV2Themed",
    ".GrammarErrorV2Themed",
  ].join(", ");

  container.querySelectorAll(errorSelectors).forEach((el) => {
    const element = el as HTMLElement;
    element.style.removeProperty("background-image");
    element.style.removeProperty("background-position");
    element.style.removeProperty("background-repeat");
    element.style.removeProperty("border-bottom");
    element.className = element.className
      .split(" ")
      .filter((cls) => !cls.includes("Error") && !cls.includes("Spelling"))
      .join(" ");
  });
}

/**
 * Remove table helpers that only exist while editing.
 */
function stripTableEditorAttributes(container: HTMLElement): void {
  container.querySelectorAll("table").forEach((table) => {
    table.removeAttribute("contenteditable");
    (table as HTMLElement).classList.remove("resizable-table");
  });
  container.querySelectorAll("td, th").forEach((cell) => {
    cell.removeAttribute("contenteditable");
  });
}

/**
 * Frontend rich text links should open external destinations in a safe new tab.
 */
function makeExternalLinksSafe(container: HTMLElement): void {
  container.querySelectorAll("a").forEach((link) => {
    if (link.hostname && link.hostname !== window.location.hostname) {
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener noreferrer");
    }
  });
}
