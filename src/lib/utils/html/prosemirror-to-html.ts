import { DOMSerializer } from "prosemirror-model";
import type { Node as PmNode, Schema } from "prosemirror-model";
import { sanitizeRichTextContent } from "@lib/utils/sanitize-rich-text";

export function serializeDocToHtml(doc: PmNode, schema: Schema): string {
  try {
    const serializer = DOMSerializer.fromSchema(schema);
    const container = document.createElement("div");
    const fragment = serializer.serializeFragment(doc.content, { document });
    container.appendChild(fragment);
    return sanitizeRichTextContent(container.innerHTML);
  } catch (err) {
    console.warn("[rtb] serializeDocToHtml failed:", err);
    return "";
  }
}

const INLINE_TAGS = new Set([
  "a","abbr","b","bdi","bdo","br","cite","code","data","dfn","em","i",
  "kbd","mark","q","rp","rt","ruby","s","samp","small","span","strong",
  "sub","sup","time","u","var","wbr",
]);

const VOID_TAGS = new Set([
  "area","base","br","col","embed","hr","img","input","link","meta",
  "param","source","track","wbr",
]);

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

function walkNode(node: ChildNode, depth: number, out: string[]): void {
  const indent = "  ".repeat(depth);

  if (node.nodeType === TEXT_NODE) {
    const text = (node.textContent ?? "").trim();
    if (text) out.push(`${indent}${text}`);
    return;
  }

  if (node.nodeType !== ELEMENT_NODE) return;

  const el = node as Element;
  const tag = el.tagName.toLowerCase();
  const attrs = Array.from(el.attributes).map((a) => ` ${a.name}="${a.value}"`).join("");

  if (VOID_TAGS.has(tag)) {
    out.push(`${indent}<${tag}${attrs}>`);
    return;
  }

  const childNodes = Array.from(el.childNodes);
  const allInline = childNodes.every(
    (c) =>
      c.nodeType === TEXT_NODE ||
      (c.nodeType === ELEMENT_NODE && INLINE_TAGS.has((c as Element).tagName.toLowerCase()))
  );

  if (allInline || INLINE_TAGS.has(tag)) {
    out.push(`${indent}<${tag}${attrs}>${el.innerHTML}</${tag}>`);
    return;
  }

  out.push(`${indent}<${tag}${attrs}>`);
  for (const child of childNodes) {
    walkNode(child, depth + 1, out);
  }
  out.push(`${indent}</${tag}>`);
}

export function formatHtmlForDisplay(html: string): string {
  try {
    const container = document.createElement("div");
    container.innerHTML = html;
    const lines: string[] = [];
    for (const child of Array.from(container.childNodes)) {
      walkNode(child, 0, lines);
    }
    return lines.join("\n");
  } catch {
    return html;
  }
}
