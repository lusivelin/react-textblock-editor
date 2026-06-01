import { DOMParser as ProseMirrorDOMParser } from "prosemirror-model";
import type { Node as PmNode, Schema } from "prosemirror-model";
import { sanitizeRichTextContent, sanitizeHtmlSource } from "@lib/utils/sanitize-rich-text";

export function parseHtmlToDoc(html: string, schema: Schema): PmNode {
  try {
    const clean = sanitizeRichTextContent(html);
    const container = document.createElement("div");
    container.innerHTML = clean;
    return ProseMirrorDOMParser.fromSchema(schema).parse(container);
  } catch (err) {
    console.warn("[rtb] parseHtmlToDoc failed:", err);
    return schema.nodes.doc.createAndFill() as PmNode;
  }
}

export function parseSourceHtmlToDoc(html: string, schema: Schema): PmNode {
  try {
    const clean = sanitizeHtmlSource(html);
    const container = document.createElement("div");
    container.innerHTML = clean;
    return ProseMirrorDOMParser.fromSchema(schema).parse(container);
  } catch (err) {
    console.warn("[rtb] parseSourceHtmlToDoc failed:", err);
    return schema.nodes.doc.createAndFill() as PmNode;
  }
}
