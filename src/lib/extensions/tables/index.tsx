import { tableEditing, tableNodes, columnResizing } from "prosemirror-tables";
import type { EditorExtension } from "@lib/core/editor-extension";
import { TableFloatingToolbar } from "@lib/components/prosemirror/table-toolbar";
import { TableInsertPicker, ToolbarSeparator } from "@lib/components/prosemirror/toolbar";

const tableSchemaNodes = tableNodes({ tableGroup: "block", cellContent: "block+", cellAttributes: {} });

export interface TablesExtensionOptions {
  resizableColumns?: boolean;
}

export function createTablesExtension(options: TablesExtensionOptions = {}): EditorExtension {
  return {
    id: "tables",
    getSchema: () => ({
      nodes: {
        table: tableSchemaNodes.table,
        table_row: tableSchemaNodes.table_row,
        table_cell: tableSchemaNodes.table_cell,
        table_header: tableSchemaNodes.table_header,
      },
    }),
    getPlugins: () => [
      ...(options.resizableColumns === false ? [] : [columnResizing()]),
      tableEditing(),
    ],
    getToolbarItems: () => [
      {
        id: "tables:insert",
        group: "insert",
        priority: 20,
        render: ({ view, schema }) => (
          <>
            <TableInsertPicker view={view} schema={schema} />
            <ToolbarSeparator />
          </>
        ),
      },
    ],
    getOverlays: () => [
      {
        id: "tables:floating-toolbar",
        render: ({ view, state, darkMode }) => (
          <TableFloatingToolbar view={view} state={state} darkMode={darkMode} />
        ),
      },
    ],
  };
}
