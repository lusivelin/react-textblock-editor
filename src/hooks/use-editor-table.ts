import { type RefObject, useCallback } from "react";

interface UseEditorTableProps {
  editorRef: RefObject<HTMLDivElement | null>;
  handleInput: () => void;
  tableRows: string;
  tableCols: string;
  setIsTableDialogOpen: (open: boolean) => void;
  selectedTable: HTMLTableElement | null;
  setSelectedTable: (table: HTMLTableElement | null) => void;
}

/**
 * Hook for managing table operations in the rich text editor
 * Handles table creation, row/column addition/removal, and cell context
 */
export function useEditorTable({
  editorRef,
  handleInput,
  tableRows,
  tableCols,
  setIsTableDialogOpen,
  selectedTable,
  setSelectedTable,
}: UseEditorTableProps) {
  const addTableRow = useCallback(
    (table: HTMLTableElement, atEnd = true) => {
      const newRow = document.createElement("tr");
      const colCount = table.rows[0]?.cells.length || 1;

      for (let j = 0; j < colCount; j++) {
        const cell = document.createElement("td");
        cell.style.border = "1px solid #ccc";
        cell.style.padding = "8px";
        cell.style.minWidth = "80px";
        cell.setAttribute("contenteditable", "true");
        cell.innerHTML = "&nbsp;";
        newRow.appendChild(cell);
      }

      if (atEnd) {
        table.appendChild(newRow);
      } else {
        table.insertBefore(newRow, table.firstChild);
      }
      handleInput();
    },
    [handleInput]
  );

  const addTableColumn = useCallback(
    (table: HTMLTableElement, atEnd = true) => {
      const rows = table.querySelectorAll("tr");
      rows.forEach((row) => {
        const cell = document.createElement("td");
        cell.style.border = "1px solid #ccc";
        cell.style.padding = "8px";
        cell.style.minWidth = "80px";
        cell.setAttribute("contenteditable", "true");
        cell.innerHTML = "&nbsp;";

        if (atEnd) {
          row.appendChild(cell);
        } else {
          row.insertBefore(cell, row.firstChild);
        }
      });
      handleInput();
    },
    [handleInput]
  );

  const removeTableRow = useCallback(
    (table: HTMLTableElement, rowIndex: number) => {
      if (table.rows.length > 1 && rowIndex >= 0 && rowIndex < table.rows.length) {
        table.deleteRow(rowIndex);
        handleInput();
      }
    },
    [handleInput]
  );

  const removeTableColumn = useCallback(
    (table: HTMLTableElement, colIndex: number) => {
      const rows = table.querySelectorAll("tr");
      if ((rows[0]?.cells.length ?? 0) > 1) {
        rows.forEach((row) => {
          if (row.cells[colIndex]) {
            row.deleteCell(colIndex);
          }
        });
        handleInput();
      }
    },
    [handleInput]
  );

  const deleteTable = useCallback(
    (table: HTMLTableElement) => {
      table.remove();
      setSelectedTable(null);
      handleInput();
    },
    [handleInput, setSelectedTable]
  );

  const handleTableInsert = useCallback(() => {
    const rows = parseInt(tableRows);
    const cols = parseInt(tableCols);

    if (rows > 0 && cols > 0) {
      editorRef.current?.focus();

      const table = document.createElement("table");
      table.style.borderCollapse = "collapse";
      table.style.width = "100%";
      table.style.border = "1px solid #ccc";
      table.style.resize = "both";
      table.style.overflow = "auto";
      table.className = "resizable-table";
      table.setAttribute("contenteditable", "true");

      for (let i = 0; i < rows; i++) {
        const row = document.createElement("tr");
        for (let j = 0; j < cols; j++) {
          const cell = document.createElement("td");
          cell.style.border = "1px solid #ccc";
          cell.style.padding = "8px";
          cell.style.minWidth = "80px";
          cell.setAttribute("contenteditable", "true");
          cell.innerHTML = "&nbsp;";
          row.appendChild(cell);
        }
        table.appendChild(row);
      }

      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(table);
        range.setStartAfter(table);
        range.setEndAfter(table);
        selection.removeAllRanges();
        selection.addRange(range);
      } else if (editorRef.current) {
        editorRef.current.appendChild(table);
      }

      handleInput();
    }
    setIsTableDialogOpen(false);
  }, [editorRef, tableRows, tableCols, handleInput, setIsTableDialogOpen]);

  const getCurrentCellContext = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const cell =
        range.startContainer.nodeType === Node.TEXT_NODE
          ? range.startContainer.parentElement?.closest("td, th")
          : (range.startContainer as Element)?.closest("td, th");

      if (cell) {
        const row = cell.parentElement as HTMLTableRowElement;
        const table = cell.closest("table") as HTMLTableElement;
        const cellIndex = Array.from(row.cells).indexOf(cell as HTMLTableCellElement);
        const rowIndex = Array.from(table.rows).indexOf(row);

        return { table, row, cell, cellIndex, rowIndex };
      }
    }
    return null;
  }, []);

  const deleteCurrentRow = useCallback(() => {
    const context = getCurrentCellContext();
    if (context && selectedTable) {
      removeTableRow(selectedTable, context.rowIndex);
    }
  }, [getCurrentCellContext, selectedTable, removeTableRow]);

  const deleteCurrentColumn = useCallback(() => {
    const context = getCurrentCellContext();
    if (context && selectedTable) {
      removeTableColumn(selectedTable, context.cellIndex);
    }
  }, [getCurrentCellContext, selectedTable, removeTableColumn]);

  return {
    addTableRow,
    addTableColumn,
    removeTableRow,
    removeTableColumn,
    deleteTable,
    handleTableInsert,
    getCurrentCellContext,
    deleteCurrentRow,
    deleteCurrentColumn,
  };
}
