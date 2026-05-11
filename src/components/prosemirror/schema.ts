import OrderedMap from "orderedmap";
import { Schema } from "prosemirror-model";
import type { NodeSpec, MarkSpec } from "prosemirror-model";
import { nodes as basicNodes, marks as basicMarks } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { tableNodes } from "prosemirror-tables";

// Extended image node: adds width/height attrs for resize support
const imageNodeSpec: NodeSpec = {
  inline: true,
  attrs: {
    src: {},
    alt: { default: "" },
    title: { default: null },
    width: { default: null },
    height: { default: null },
  },
  group: "inline",
  draggable: true,
  parseDOM: [{
    tag: "img[src]",
    getAttrs(dom) {
      const el = dom as HTMLElement;
      return {
        src: el.getAttribute("src"),
        alt: el.getAttribute("alt") ?? "",
        title: el.getAttribute("title"),
        width: el.style.width || el.getAttribute("width") || null,
        height: el.style.height || el.getAttribute("height") || null,
      };
    },
  }],
  toDOM(node) {
    const { src, alt, title, width, height } = node.attrs as {
      src: string; alt: string; title: string | null; width: string | null; height: string | null;
    };
    const attrs: Record<string, string> = { src };
    if (alt) attrs.alt = alt;
    if (title) attrs.title = title;
    const style: string[] = [];
    if (width) style.push(`width:${width}`);
    if (height) style.push(`height:${height}`);
    if (style.length) attrs.style = style.join(";");
    return ["img", attrs];
  },
};

// Nodes: basic (doc, paragraph, heading, blockquote, code_block, image, hard_break, text, horizontal_rule)
//        + bullet_list, ordered_list, list_item (prosemirror-schema-list)
//        + table, table_row, table_cell, table_header (prosemirror-tables)
// Locked to ALLOWED_TAGS in src/utils/sanitize-rich-text.ts
const nodes = addListNodes(
  OrderedMap.from<NodeSpec>(basicNodes).update("image", imageNodeSpec),
  "paragraph block*",
  "block"
).append(tableNodes({ tableGroup: "block", cellContent: "block+", cellAttributes: {} }));

// Marks: basic (link, em, strong, code) + underline + strike
const marks = OrderedMap.from<MarkSpec>(basicMarks)
  .addToEnd("underline", {
    parseDOM: [{ tag: "u" }],
    toDOM() {
      return ["u", 0];
    },
  })
  .addToEnd("strike", {
    parseDOM: [{ tag: "s" }, { tag: "del" }],
    toDOM() {
      return ["s", 0];
    },
  });

export const schema = new Schema({ nodes, marks });
