import DOMPurify, { type Config } from "dompurify";

export const ALLOWED_TAGS = [
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

export const ALLOWED_ATTR = [
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

export const ALLOWED_URI_REGEXP =
  /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i;

const PURIFY_CONFIG: Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR,
  ALLOWED_URI_REGEXP,

  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,

  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,

  WHOLE_DOCUMENT: false,
  FORCE_BODY: false,

  ALLOW_UNKNOWN_PROTOCOLS: false,
  SANITIZE_DOM: true,
  IN_PLACE: false,
};

const SOURCE_PURIFY_CONFIG: Config = {
  ALLOWED_URI_REGEXP,
  ALLOW_DATA_ATTR: true,
  KEEP_CONTENT: true,
  FORCE_BODY: false,
  FORBID_TAGS: ["script", "style", "iframe", "frame", "frameset", "object", "embed", "form"],
  FORBID_ATTR: ["onerror", "onload", "onclick", "ondblclick", "onmouseover", "onmouseout",
    "onmousedown", "onmouseup", "onkeydown", "onkeyup", "onkeypress", "onfocus",
    "onblur", "onchange", "onsubmit", "onreset", "onselect", "onabort"],
};

function canUseDOMPurify(): boolean {
  return typeof window !== "undefined" && typeof DOMPurify.sanitize === "function" && DOMPurify.isSupported !== false;
}

export function sanitizeHtmlSource(html: string): string {
  if (!html) return "";
  if (!canUseDOMPurify()) return html;
  return DOMPurify.sanitize(html, SOURCE_PURIFY_CONFIG) as string;
}

export function sanitizeRichTextContent(html: unknown): string {
  if (html == null || html === "") return "";

  const htmlString =
    typeof html === "string" ? html : typeof html === "number" || typeof html === "boolean" ? String(html) : "";

  if (!htmlString) return "";

  if (!canUseDOMPurify()) {
    return cleanupEditorArtifacts(htmlString);
  }

  const sanitized = DOMPurify.sanitize(htmlString, PURIFY_CONFIG) as string;
  return cleanupEditorArtifacts(sanitized);
}

export function cleanupEditorArtifacts(html: string): string {
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

export function isContentSafe(html: string): boolean {
  return html === sanitizeRichTextContent(html);
}

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
