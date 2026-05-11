/**
 * useTableDialog Hook
 *
 * Manages table dialog state and table selection
 */

import { useCallback, useState } from "react";
import { DEFAULT_TABLE_CONFIG } from "../utils/editor/constants";

export interface UseTableDialogReturn {
  isTableDialogOpen: boolean;
  tableRows: string;
  tableCols: string;
  selectedTable: HTMLTableElement | null;
  setIsTableDialogOpen: (open: boolean) => void;
  setTableRows: (rows: string) => void;
  setTableCols: (cols: string) => void;
  setSelectedTable: (table: HTMLTableElement | null) => void;
  openTableDialog: () => void;
  closeTableDialog: () => void;
  resetTableDialog: () => void;
}

/**
 * Hook to manage table dialog state and selected table
 */
export function useTableDialog(): UseTableDialogReturn {
  const [isTableDialogOpen, setIsTableDialogOpen] = useState(false);
  const [tableRows, setTableRows] = useState(String(DEFAULT_TABLE_CONFIG.rows));
  const [tableCols, setTableCols] = useState(String(DEFAULT_TABLE_CONFIG.cols));
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);

  const openTableDialog = useCallback(() => {
    setIsTableDialogOpen(true);
  }, []);

  const closeTableDialog = useCallback(() => {
    setIsTableDialogOpen(false);
  }, []);

  const resetTableDialog = useCallback(() => {
    setTableRows(String(DEFAULT_TABLE_CONFIG.rows));
    setTableCols(String(DEFAULT_TABLE_CONFIG.cols));
    setIsTableDialogOpen(false);
  }, []);

  return {
    isTableDialogOpen,
    tableRows,
    tableCols,
    selectedTable,
    setIsTableDialogOpen,
    setTableRows,
    setTableCols,
    setSelectedTable,
    openTableDialog,
    closeTableDialog,
    resetTableDialog,
  };
}
