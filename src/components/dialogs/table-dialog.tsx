"use client";

import { Plus, Table, Trash2 } from "lucide-react";
import { Button } from "../../shadcn/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../shadcn/ui/dialog";
import { Label } from "../../shadcn/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shadcn/ui/select";
import { Separator } from "../../shadcn/ui/separator";

interface TableDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tableRows: string;
  tableCols: string;
  onTableRowsChange: (v: string) => void;
  onTableColsChange: (v: string) => void;
  onInsert: () => void;
  selectedTable: HTMLTableElement | null;
  onAddRow: (t: HTMLTableElement) => void;
  onAddColumn: (t: HTMLTableElement) => void;
  onDeleteRow: () => void;
  onDeleteColumn: () => void;
  onDeleteTable: (t: HTMLTableElement) => void;
}

export function TableDialog({
  isOpen,
  onOpenChange,
  tableRows,
  tableCols,
  onTableRowsChange,
  onTableColsChange,
  onInsert,
  selectedTable,
  onAddRow,
  onAddColumn,
  onDeleteRow,
  onDeleteColumn,
  onDeleteTable,
}: TableDialogProps) {
  if (selectedTable) {
    return (
      <div className="flex items-center gap-1 bg-gray-800 px-2 py-1 rounded-md border border-gray-600">
        <span className="text-xs font-medium text-blue-400 mr-1">Table:</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddRow(selectedTable);
          }}
          className="h-7 px-2 text-white hover:bg-gray-700 transition-colors"
          title="Add Row at End"
        >
          <Plus className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">Row</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onAddColumn(selectedTable);
          }}
          className="h-7 px-2 text-white hover:bg-gray-700 transition-colors"
          title="Add Column at End"
        >
          <Plus className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">Col</span>
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1 bg-gray-600" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onDeleteRow();
          }}
          className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-gray-700 transition-colors"
          title="Delete Current Row (click in a cell first)"
          disabled={selectedTable.rows.length <= 1}
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">Row</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onDeleteColumn();
          }}
          className="h-7 px-2 text-orange-400 hover:text-orange-300 hover:bg-gray-700 transition-colors"
          title="Delete Current Column (click in a cell first)"
          disabled={(selectedTable.rows[0]?.cells.length ?? 0) <= 1}
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">Col</span>
        </Button>
        <Separator orientation="vertical" className="h-5 mx-1 bg-gray-600" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onMouseDown={(e) => {
            e.preventDefault();
            onDeleteTable(selectedTable);
          }}
          className="h-7 px-2 text-red-400 hover:text-red-300 hover:bg-gray-700 transition-colors"
          title="Delete Entire Table"
        >
          <Trash2 className="h-4 w-4" />
          <span className="ml-1 text-xs font-medium">Table</span>
        </Button>
      </div>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      {/* No visible trigger — opened programmatically from the toolbar overflow menu */}
      <DialogContent className="sm:max-w-md bg-gray-800 border-gray-600 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Insert Table</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <Label className="text-white">Rows</Label>
            <Select value={tableRows} onValueChange={onTableRowsChange}>
              <SelectTrigger className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 focus:ring-2 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border border-gray-600 shadow-2xl z-50">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer transition-colors"
                  >
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-white">Columns</Label>
            <Select value={tableCols} onValueChange={onTableColsChange}>
              <SelectTrigger className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600 focus:ring-2 focus:ring-blue-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border border-gray-600 shadow-2xl z-50">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                  <SelectItem
                    key={num}
                    value={num.toString()}
                    className="text-white hover:bg-gray-700 focus:bg-gray-700 cursor-pointer transition-colors"
                  >
                    {num}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
            >
              Cancel
            </Button>
            <Button onClick={onInsert} className="bg-blue-600 text-white hover:bg-blue-700">
              Insert Table
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
