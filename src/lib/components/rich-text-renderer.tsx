import parse, { Element, domToReact, type HTMLReactParserOptions } from "html-react-parser";
import { cn } from "@lib/utils/cn";
import {
  ALLOWED_ATTR,
  ALLOWED_TAGS,
  ALLOWED_URI_REGEXP,
  cleanupEditorArtifacts,
} from "@lib/utils/sanitize-rich-text";

export interface RichTextRendererProps {
  content: string;
  className?: string;
}

const ALLOWED_TAG_SET = new Set(ALLOWED_TAGS);
const ALLOWED_ATTR_SET = new Set(ALLOWED_ATTR);

const DANGEROUS_TAG_SET = new Set([
  "script",
  "style",
  "iframe",
  "frame",
  "frameset",
  "object",
  "embed",
  "form",
  "noscript",
  "template",
  "title",
]);

// `data:` URIs are safe for embedded media (<img src>) but a navigation/script
// vector on links (<a href="data:text/html,…">), so they are allowed per-attr.
const URL_ATTRS = new Set(["href", "src"]);
const DATA_URI_ALLOWED_ATTRS = new Set(["src"]);
const DATA_URI_REGEXP = /^\s*data:/i;

function isAllowedAttribute(name: string): boolean {
  // Never allow inline event handlers.
  if (name.startsWith("on")) return false;
  // Data attributes are allowed (mirrors ALLOW_DATA_ATTR in the sanitizer).
  if (name.startsWith("data-")) return true;
  return ALLOWED_ATTR_SET.has(name);
}

const parserOptions: HTMLReactParserOptions = {
  replace: (node) => {
    // Note: <script>/<style> are Element instances but report type "script"/
    // "style" (not "tag") in domhandler, so we must not gate on node.type here.
    if (!(node instanceof Element) || !node.name) return undefined;

    const tagName = node.name.toLowerCase();

    if (!ALLOWED_TAG_SET.has(tagName)) {
      // Strip <script>/<style>/<iframe>/etc. entirely — content and all.
      if (DANGEROUS_TAG_SET.has(tagName)) return <></>;
      // Any other unknown tag (e.g. <section>, custom elements) is unwrapped:
      // drop the tag but keep its (recursively filtered) children.
      return <>{domToReact(node.children as never, parserOptions)}</>;
    }

    // Keep only allow-listed, safe attributes. Mutating `attribs` and returning
    // undefined lets html-react-parser do the React mapping (class -> className,
    // style string -> object) for us.
    const filtered: Record<string, string> = {};
    for (const [rawName, value] of Object.entries(node.attribs ?? {})) {
      const name = rawName.toLowerCase();
      if (!isAllowedAttribute(name)) continue;
      if (URL_ATTRS.has(name)) {
        if (!ALLOWED_URI_REGEXP.test(value)) continue;
        // Block `data:` everywhere except media src (blocks data: links).
        if (DATA_URI_REGEXP.test(value) && !DATA_URI_ALLOWED_ATTRS.has(name)) continue;
      }
      filtered[rawName] = value;
    }

    // Defend against reverse-tabnabbing: any link that opens a new tab must not
    // hand the opener a live `window` reference.
    if (tagName === "a" && filtered.target === "_blank") {
      const rel = new Set((filtered.rel ?? "").split(/\s+/).filter(Boolean));
      rel.add("noopener");
      rel.add("noreferrer");
      filtered.rel = Array.from(rel).join(" ");
    }

    node.attribs = filtered;

    return undefined;
  },
};

export function RichTextRenderer({ content, className }: RichTextRendererProps) {
  if (!content) return null;

  const cleaned = cleanupEditorArtifacts(content);
  if (!cleaned) return null;

  return (
    <div className={cn("rtb-renderer", className)} spellCheck={false}>
      {parse(cleaned, parserOptions)}
    </div>
  );
}
