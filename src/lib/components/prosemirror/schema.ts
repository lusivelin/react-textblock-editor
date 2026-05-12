import OrderedMap from "orderedmap";
import { Schema } from "prosemirror-model";
import type { MarkSpec, NodeSpec } from "prosemirror-model";
import { marks as basicMarks, nodes as basicNodes } from "prosemirror-schema-basic";
import type { EditorExtension } from "@lib/core/editor-extension";

export function createEditorSchema(extensions: EditorExtension[]): Schema {
  let nodes = OrderedMap.from<NodeSpec>(basicNodes);
  let marks = OrderedMap.from<MarkSpec>(basicMarks);

  for (const extension of extensions) {
    const schema = extension.getSchema?.();
    if (!schema) continue;

    for (const [name, spec] of Object.entries(schema.nodes ?? {})) {
      nodes = nodes.update(name, spec);
    }

    for (const [name, spec] of Object.entries(schema.marks ?? {})) {
      marks = marks.update(name, spec);
    }
  }

  return new Schema({ nodes, marks });
}
