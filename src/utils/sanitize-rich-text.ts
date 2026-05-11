/**
 * Secure HTML Sanitization for Rich Text
 *
 * Uses DOMPurify on the client for production-grade XSS protection.
 *
 * SSR note: DOMPurify needs a `window`. On the server we fall back to a
 * regex pass that strips obvious editor artifacts. The component tree that
 * consumes this module is `"use client"`, so the renderer always re-runs
 * sanitization on the client before paint and the server pass is purely a
 * defensive layer.
 */

import DOMPurify, { type Config } from "dompurify";

/**
 * Allowed HTML tags for rich text content.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "u",
  "s",
  "span",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "li",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "th",
  "td",
  "img",
  "a",
  "div",
  "blockquote",
  "pre",
  "code",
];

/**
 * Allowed HTML attributes.
 */
const ALLOWED_ATTR = [
  "style",
  "class",
  "src",
  "alt",
  "width",
  "height",
  "href",
  "target",
  "rel",
  "colspan",
  "rowspan",
  "data-*",
];

/**
 * Allowed URL schemes for links and images.
 */
const ALLOWED_URI_REGEXP = /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

/**
 * DOMPurify configuration for rich text.
 */
const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,

  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,

  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,

  SAFE_FOR_TEMPLATES: true,
  WHOLE_DOCUMENT: false,
  FORCE_BODY: false,

  ALLOW_UNKNOWN_PROTOCOLS: false,
  SANITIZE_DOM: true,
  IN_PLACE: false,
};

/**
 * Whether DOMPurify can run in this execution context. DOMPurify v3 needs a
 * `window`; on the server it returns a stub whose `sanitize()` is a no-op,
 * which would silently let XSS through. We detect that and fall back to the
 * regex-only cleanup until the same content is re-sanitized on the client.
 */
function canUseDOMPurify(): boolean {
  return typeof window !== "undefined" && typeof DOMPurify.sanitize === "function" && DOMPurify.isSupported !== false;
}

/**
 * Sanitizes rich text HTML content for safe rendering.
 *
 * @example
 *   const clean = sanitizeRichTextContent('<p>Hi <script>alert(1)</script></p>');
 *   // → '<p>Hi </p>'
 */
export function sanitizeRichTextContent(html: unknown): string {
  if (html == null || html === "") return "";

  const htmlString =
    typeof html === "string" ? html : typeof html === "number" || typeof html === "boolean" ? String(html) : "";

  if (!htmlString) return "";

  if (!canUseDOMPurify()) {
    // Server-side or unsupported environment: best-effort cleanup. The
    // component tree is `"use client"`, so this output is replaced by the
    // real DOMPurify pass on hydrate.
    return cleanupEditorArtifacts(htmlString);
  }

  const sanitized = DOMPurify.sanitize(htmlString, PURIFY_CONFIG) as string;
  return cleanupEditorArtifacts(sanitized);
}

/**
 * Removes editor-specific attributes/classes that DOMPurify legitimately
 * keeps but we don't want shipped to readers (e.g. `contenteditable`,
 * spell-check error markers, raw `--tw-*` CSS variables).
 */
/**
 * Fast regex-only cleanup for editor-saved HTML — no DOMPurify, ~1ms.
 * Use this in the editor's init/value-sync where content is already trusted
 * (typed or paste-sanitized). Full DOMPurify is reserved for paste events.
 */
export function lightCleanup(html: string): string {
  return cleanupEditorArtifacts(html);
}

function cleanupEditorArtifacts(html: string): string {
  return html
    .replace(/\s*contenteditable\s*=\s*["']?[^"'\s>]*["']?/gi, "")
    .replace(/\s*data-spelling-error\s*=\s*["']?[^"'\s>]*["']?/gi, "")
    .replace(/\s*data-grammar-error\s*=\s*["']?[^"'\s>]*["']?/gi, "")
    .replace(/\s*data-markjs\s*=\s*["']?[^"'\s>]*["']?/gi, "")
    .replace(
      /\s*class\s*=\s*["']([^"']*)\s*(Spelling|GrammarError|SpellingErrorV2Themed|ContextualSpellingAndGrammarErrorV2Themed|GrammarErrorV2Themed|selected)\s*([^"']*)["']/gi,
      (_match, before, _editorClass, after) => {
        const cleanClasses = `${before} ${after}`.trim();
        return cleanClasses ? ` class="${cleanClasses}"` : "";
      }
    )
    .replace(/\s*class\s*=\s*[""']\s*[""']/gi, "")
    .replace(/style\s*=\s*["']([^"']*)["']/gi, (_match, styleContent) => {
      const cleanedStyle = styleContent
        .split(";")
        .filter((declaration: string) => {
          const trimmed = declaration.trim();
          return trimmed && !trimmed.startsWith("--");
        })
        .join(";")
        .trim();
      return cleanedStyle ? `style="${cleanedStyle}"` : "";
    })
    .replace(/\s*style\s*=\s*[""']\s*[""']/gi, "");
}

/**
 * Checks if content is safe (passes sanitization without changes).
 */
export function isContentSafe(html: string): boolean {
  return html === sanitizeRichTextContent(html);
}

/**
 * Diff-style report of what sanitization removed; useful for debugging.
 */
export function getSanitizationReport(html: string): {
  original: string;
  sanitized: string;
  changed: boolean;
  removedTags: string[];
} {
  const sanitized = sanitizeRichTextContent(html);
  const changed = html !== sanitized;

  const originalTags = extractTags(html);
  const sanitizedTags = extractTags(sanitized);
  const removedTags = originalTags.filter((tag) => !sanitizedTags.includes(tag));

  return {
    original: html,
    sanitized,
    changed,
    removedTags: Array.from(new Set(removedTags)),
  };
}

function extractTags(html: string): string[] {
  const tagRegex = /<(\w+)[^>]*>/g;
  const tags: string[] = [];
  let match: RegExpExecArray | null;
  // biome-ignore lint/suspicious/noAssignInExpressions: classic regex.exec loop pattern
  while ((match = tagRegex.exec(html)) !== null) {
    if (match[1]) tags.push(match[1].toLowerCase());
  }
  return tags;
}

/**
 * Legacy aliases. Prefer `sanitizeRichTextContent`.
 *
 * @deprecated Use `sanitizeRichTextContent` directly.
 */
export const sanitizeHtml = sanitizeRichTextContent;
/** @deprecated Use `sanitizeRichTextContent` directly. */
export const sanitizeRichText = sanitizeRichTextContent;
