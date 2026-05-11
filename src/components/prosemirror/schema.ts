import OrderedMap from "orderedmap";
import { Schema } from "prosemirror-model";
import type { NodeSpec, MarkSpec } from "prosemirror-model";
import { nodes as basicNodes, marks as basicMarks } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";
import { tableNodes } from "prosemirror-tables";

// Nodes: basic (doc, paragraph, heading, blockquote, code_block, image, hard_break, text, horizontal_rule)
//        + bullet_list, ordered_list, list_item (prosemirror-schema-list)
//        + table, table_row, table_cell, table_header (prosemirror-tables)
// Locked to ALLOWED_TAGS in src/utils/sanitize-rich-text.ts
const nodes = addListNodes(
  OrderedMap.from<NodeSpec>(basicNodes),
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
