import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import type { Node, Schema } from "prosemirror-model";
import { sanitizeRichTextContent } from "@lib/utils/sanitize-rich-text";

export function parseHtmlToDoc(html: string, schema: Schema): Node {
  const clean = sanitizeRichTextContent(html);
  const container = document.createElement("div");
  container.innerHTML = clean;
  return ProseMirrorDOMParser.fromSchema(schema).parse(container);
}
