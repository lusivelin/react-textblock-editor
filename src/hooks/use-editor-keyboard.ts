import { type MutableRefObject, type RefObject, useCallback } from "react";

interface UseEditorKeyboardProps {
  editorRef: RefObject<HTMLDivElement | null>;
  onChange?: (content: string) => void;
  onSave?: () => void;
  hasUnsavedChanges: boolean;
  undo: () => string | null;
  redo: () => string | null;
  applyInlineStyle: (tag: string) => void;
  addTableRow: (table: HTMLTableElement) => void;
  isUndoRedoRef: MutableRefObject<boolean>;
}

/**
 * Wires editor keyboard behavior that must update DOM and local editor state
 * together: history shortcuts, save, table navigation, and inline formatting.
 */
export function useEditorKeyboard({
  editorRef,
  onChange,
  onSave,
  hasUnsavedChanges,
  undo,
  redo,
  applyInlineStyle,
  addTableRow,
  isUndoRedoRef,
}: UseEditorKeyboardProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        const content = undo();
        if (content !== null && editorRef.current) {
          editorRef.current.innerHTML = content;
          if (onChange) onChange(content);
          // Clear the undo/redo guard before the next input cycle without
          // leaving an extra timer running after unmount.
          queueMicrotask(() => {
            isUndoRedoRef.current = false;
          });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        const content = redo();
        if (content !== null && editorRef.current) {
          editorRef.current.innerHTML = content;
          if (onChange) onChange(content);
          queueMicrotask(() => {
            isUndoRedoRef.current = false;
          });
        }
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (onSave && hasUnsavedChanges) {
          onSave();
        }
        return;
      }

      // Match spreadsheet-style Tab behavior inside editor tables.
      if (e.key === "Tab" && !e.shiftKey) {
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const cell =
            range.startContainer.nodeType === Node.TEXT_NODE
              ? range.startContainer.parentElement?.closest("td, th")
              : (range.startContainer as Element)?.closest("td, th");

          if (cell) {
            e.preventDefault();
            const table = cell.closest("table") as HTMLTableElement;
            const row = cell.parentElement as HTMLTableRowElement;
            const cellIndex = Array.from(row.cells).indexOf(cell as HTMLTableCellElement);
            const rowIndex = Array.from(table.rows).indexOf(row);

            let nextCell: HTMLTableCellElement | null = null;

            if (cellIndex < row.cells.length - 1) {
              nextCell = row.cells[cellIndex + 1] ?? null;
            } else if (rowIndex < table.rows.length - 1) {
              nextCell = table.rows[rowIndex + 1]?.cells[0] ?? null;
            } else {
              addTableRow(table);
              nextCell = table.rows[table.rows.length - 1]?.cells[0] ?? null;
            }

            if (nextCell) {
              const newRange = document.createRange();
              const newSelection = window.getSelection();
              newRange.selectNodeContents(nextCell);
              newRange.collapse(false);
              newSelection?.removeAllRanges();
              newSelection?.addRange(newRange);
              nextCell.focus();
            }
          }
        }
      }

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "b" || e.key === "B") {
          e.preventDefault();
          applyInlineStyle("strong");
          return;
        }
        if (e.key === "i" || e.key === "I") {
          e.preventDefault();
          applyInlineStyle("em");
          return;
        }
        if (e.key === "u" || e.key === "U") {
          e.preventDefault();
          applyInlineStyle("u");
          return;
        }
      }
    },
    [addTableRow, applyInlineStyle, onSave, hasUnsavedChanges, undo, redo, onChange, editorRef, isUndoRedoRef]
  );

  return { handleKeyDown };
}
