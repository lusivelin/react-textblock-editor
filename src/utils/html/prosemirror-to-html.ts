import { DOMSerializer } from "prosemirror-model";
import type { Node, Schema } from "prosemirror-model";
import { sanitizeRichTextContent } from "../sanitize-rich-text";

export function serializeDocToHtml(doc: Node, schema: Schema): string {
  const serializer = DOMSerializer.fromSchema(schema);
  const container = document.createElement("div");
  const fragment = serializer.serializeFragment(doc.content, { document });
  container.appendChild(fragment);
  return sanitizeRichTextContent(container.innerHTML);
}
