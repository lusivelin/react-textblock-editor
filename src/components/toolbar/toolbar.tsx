"use client";

import React, { useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Code2,
  Columns2,
  Image,
  Italic,
  List,
  ListOrdered,
  Maximize,
  Minimize,
  MoreHorizontal,
  Strikethrough,
  Table,
  Trash2,
  Underline,
  Plus,
} from "lucide-react";
import { cn } from "../../shadcn/lib/utils";
import { Button, buttonVariants } from "../../shadcn/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../shadcn/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../shadcn/ui/popover";
import { Separator } from "../../shadcn/ui/separator";
import { LinkDialog } from "../dialogs/link-dialog";
import { TableDialog } from "../dialogs/table-dialog";

interface ToolbarProps {
  darkMode: boolean;
  isFullscreen: boolean;
  readOnly: boolean;
  uniqueId: string;
  currentBlockTag: string;
  currentFontSize: string;
  currentAlignment: string;
  currentListType: string | null;
  currentTextColor: string;
  currentBackgroundColor: string;
  activeFormats: Set<string>;
  hasLink: boolean;
  selectedTable: HTMLTableElement | null;
  selectedColumnLayout: HTMLElement | null;
  isLinkDialogOpen: boolean;
  isTableDialogOpen: boolean;
  linkUrl: string;
  linkText: string;
  selectedTextForLink: string;
  tableRows: string;
  tableCols: string;
  textColorInputRef: React.RefObject<HTMLInputElement | null>;
  backgroundColorInputRef: React.RefObject<HTMLInputElement | null>;
  onFormatBlock: (tag: string) => void;
  onFontSize: (size: string) => void;
  onInlineStyle: (tag: string) => void;
  onAlignment: (align: "left" | "center" | "right") => void;
  onList: (type: "ul" | "ol") => void;
  onInsertColumn: () => void;
  onDeleteColumnLayout: (layout: HTMLElement) => void;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onToggleFullscreen: () => void;
  onSaveSelection: () => void;
  onSetTextColor: (c: string) => void;
  onSetBackgroundColor: (c: string) => void;
  onApplyTextColor: (c: string) => void;
  onApplyBackgroundColor: (c: string) => void;
  onLinkDialogOpenChange: (open: boolean) => void;
  onLinkUrlChange: (v: string) => void;
  onLinkTextChange: (v: string) => void;
  onLinkInsert: () => void;
  onLinkCancel: () => void;
  onSetSelectedText: (v: string) => void;
  onRemoveLink: () => void;
  onTableDialogOpenChange: (open: boolean) => void;
  onTableRowsChange: (v: string) => void;
  onTableColsChange: (v: string) => void;
  onTableInsert: () => void;
  onAddTableRow: (t: HTMLTableElement) => void;
  onAddTableColumn: (t: HTMLTableElement) => void;
  onDeleteTableRow: () => void;
  onDeleteTableColumn: () => void;
  onDeleteTable: (t: HTMLTableElement) => void;
  onRestoreSelection: () => void;
}

export function Toolbar({
  darkMode,
  isFullscreen,
  readOnly,
  uniqueId,
  currentBlockTag,
  currentFontSize,
  currentAlignment,
  currentListType,
  currentTextColor,
  currentBackgroundColor,
  activeFormats,
  hasLink,
  selectedTable,
  selectedColumnLayout,
  isLinkDialogOpen,
  isTableDialogOpen,
  linkUrl,
  linkText,
  selectedTextForLink,
  tableRows,
  tableCols,
  textColorInputRef,
  backgroundColorInputRef,
  onFormatBlock,
  onFontSize,
  onInlineStyle,
  onAlignment,
  onList,
  onInsertColumn,
  onDeleteColumnLayout,
  onImageUpload,
  onToggleFullscreen,
  onSaveSelection,
  onSetTextColor,
  onSetBackgroundColor,
  onApplyTextColor,
  onApplyBackgroundColor,
  onLinkDialogOpenChange,
  onLinkUrlChange,
  onLinkTextChange,
  onLinkInsert,
  onLinkCancel,
  onSetSelectedText,
  onRemoveLink,
  onTableDialogOpenChange,
  onTableRowsChange,
  onTableColsChange,
  onTableInsert,
  onAddTableRow,
  onAddTableColumn,
  onDeleteTableRow,
  onDeleteTableColumn,
  onDeleteTable,
  onRestoreSelection,
}: ToolbarProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  if (readOnly) return null;

  const fontSizeValue = currentFontSize
    ? (() => {
        const sizeMap: { [key: string]: string } = {
          "clamp(0.5rem, 1vw, 0.75rem)": "1",
          "clamp(0.625rem, 1.2vw, 0.875rem)": "2",
          "clamp(0.75rem, 1.5vw, 1rem)": "3",
          "clamp(0.875rem, 1.8vw, 1.125rem)": "4",
          "clamp(1.125rem, 2.2vw, 1.5rem)": "5",
          "clamp(1.5rem, 3vw, 2rem)": "6",
          "clamp(2.25rem, 4vw, 3rem)": "7",
        };
        return sizeMap[currentFontSize] || "";
      })()
    : "";

  const tb = (active = false) =>
    cn(
      "h-7 w-7 p-0 rounded cursor-pointer flex-shrink-0",
      darkMode
        ? active
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "text-white/65 hover:text-white hover:bg-white/[0.08]"
        : active
          ? "bg-blue-500 text-white hover:bg-blue-600"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
    );

  const sep = <div className={cn("w-px h-4 mx-1 flex-shrink-0", darkMode ? "bg-white/[0.1]" : "bg-gray-300")} />;

  const labelCls = cn("text-[11px] w-14 flex-shrink-0", darkMode ? "text-white/40" : "text-gray-400");

  const selectItemCls = darkMode
    ? "text-white hover:bg-white/[0.08] focus:bg-white/[0.08] cursor-pointer"
    : "cursor-pointer";

  return (
    <div
      className={cn(
        "px-2 py-1.5 border-b flex items-center gap-0.5 flex-wrap",
        darkMode ? "bg-[#1a1b1e] border-white/[0.08]" : "bg-gray-50 border-gray-200",
        isFullscreen && "flex-shrink-0",
        isFullscreen && (darkMode ? "bg-[#1a1b1e]" : "bg-white shadow-sm")
      )}
    >
      {/* Block type select */}
      <Select
        value={currentBlockTag || "p"}
        onValueChange={(val) => {
          onRestoreSelection();
          onFormatBlock(val);
        }}
        onOpenChange={(open) => {
          if (open) onSaveSelection();
        }}
      >
        <SelectTrigger
          className={cn(
            "h-7 w-[100px] text-xs border-0 focus:ring-0 focus:ring-offset-0 shadow-none flex-shrink-0",
            darkMode ? "bg-white/[0.06] text-white hover:bg-white/[0.1]" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          )}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={cn("z-[1000000000]", darkMode ? "bg-[#1a1b1e] border-white/[0.1]" : "")}>
          <SelectItem value="p" className={selectItemCls}>
            Normal
          </SelectItem>
          <SelectItem value="h1" className={selectItemCls}>
            Heading 1
          </SelectItem>
          <SelectItem value="h2" className={selectItemCls}>
            Heading 2
          </SelectItem>
          <SelectItem value="h3" className={selectItemCls}>
            Heading 3
          </SelectItem>
        </SelectContent>
      </Select>

      {sep}

      {/* Bold */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onInlineStyle("strong");
        }}
        className={tb(activeFormats.has("bold"))}
        title="Bold (Ctrl+B)"
      >
        <Bold className="h-3.5 w-3.5" />
      </Button>

      {/* Italic */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onInlineStyle("em");
        }}
        className={tb(activeFormats.has("italic"))}
        title="Italic (Ctrl+I)"
      >
        <Italic className="h-3.5 w-3.5" />
      </Button>

      {/* Inline code */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onInlineStyle("code");
        }}
        className={tb(activeFormats.has("code"))}
        title="Inline Code"
      >
        <Code2 className="h-3.5 w-3.5" />
      </Button>

      {/* Underline */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onInlineStyle("u");
        }}
        className={tb(activeFormats.has("underline"))}
        title="Underline (Ctrl+U)"
      >
        <Underline className="h-3.5 w-3.5" />
      </Button>

      {/* Strikethrough */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onInlineStyle("s");
        }}
        className={tb(activeFormats.has("strikethrough"))}
        title="Strikethrough"
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </Button>

      {/* Bullet list */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onMouseDown={(e) => {
          e.preventDefault();
          onList("ul");
        }}
        className={tb(currentListType === "ul")}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </Button>

      {/* More options */}
      <Popover open={moreOpen} onOpenChange={setMoreOpen}>
        <PopoverTrigger
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            onSaveSelection();
          }}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), tb())}
          title="More options"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className={cn(
            "w-64 p-3 space-y-3 z-[1000000000]",
            darkMode ? "bg-[#1a1b1e] border-white/[0.1] text-white" : ""
          )}
        >
          {/* Alignment */}
          <div className="flex items-center gap-2">
            <span className={labelCls}>Align</span>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((align) => (
                <Button
                  key={align}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onRestoreSelection();
                    onAlignment(align);
                  }}
                  className={tb(currentAlignment === align)}
                  title={`Align ${align}`}
                >
                  {align === "left" ? (
                    <AlignLeft className="h-3.5 w-3.5" />
                  ) : align === "center" ? (
                    <AlignCenter className="h-3.5 w-3.5" />
                  ) : (
                    <AlignRight className="h-3.5 w-3.5" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          {/* Ordered list */}
          <div className="flex items-center gap-2">
            <span className={labelCls}>Lists</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onMouseDown={(e) => {
                e.preventDefault();
                onList("ol");
              }}
              className={tb(currentListType === "ol")}
              title="Numbered List"
            >
              <ListOrdered className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Font size */}
          <div className="flex items-center gap-2">
            <span className={labelCls}>Size</span>
            <Select
              value={fontSizeValue}
              onValueChange={onFontSize}
              onOpenChange={(open) => {
                if (open) onSaveSelection();
              }}
            >
              <SelectTrigger
                className={cn(
                  "h-7 w-28 text-xs",
                  darkMode ? "bg-white/[0.06] text-white border-white/[0.1] hover:bg-white/[0.1]" : ""
                )}
              >
                <SelectValue placeholder="Default" />
              </SelectTrigger>
              <SelectContent className={cn("z-[1000000000]", darkMode ? "bg-[#1a1b1e] border-white/[0.1]" : "")}>
                <SelectItem value="default" className={selectItemCls}>
                  Default
                </SelectItem>
                <SelectItem value="1" className={selectItemCls}>
                  Tiny
                </SelectItem>
                <SelectItem value="2" className={selectItemCls}>
                  Small
                </SelectItem>
                <SelectItem value="3" className={selectItemCls}>
                  Normal
                </SelectItem>
                <SelectItem value="4" className={selectItemCls}>
                  Medium
                </SelectItem>
                <SelectItem value="5" className={selectItemCls}>
                  Large
                </SelectItem>
                <SelectItem value="6" className={selectItemCls}>
                  X-Large
                </SelectItem>
                <SelectItem value="7" className={selectItemCls}>
                  Huge
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Colors */}
          <div className="flex items-center gap-2">
            <span className={labelCls}>Colors</span>
            <div className="flex gap-2 items-center">
              <div className="relative" title={currentTextColor ? `Text Color (${currentTextColor})` : "Text Color"}>
                <input
                  ref={textColorInputRef}
                  type="color"
                  defaultValue="#000000"
                  className={cn(
                    "h-7 w-7 rounded border cursor-pointer transition-colors",
                    currentTextColor
                      ? "border-blue-500 ring-1 ring-blue-400"
                      : darkMode
                        ? "border-white/[0.2] hover:border-white/[0.4]"
                        : "border-gray-300 hover:border-gray-400"
                  )}
                  onMouseDown={() => onSaveSelection()}
                  onInput={(e) => onSetTextColor((e.target as HTMLInputElement).value)}
                  onChange={(e) => onSetTextColor(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      onRestoreSelection();
                      onApplyTextColor(e.target.value);
                    }
                  }}
                />
                {currentTextColor && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded border-2 border-blue-500"
                    style={{ backgroundColor: currentTextColor, opacity: 0.3 }}
                  />
                )}
              </div>
              <div
                className="relative"
                title={currentBackgroundColor ? `BG Color (${currentBackgroundColor})` : "Background Color"}
              >
                <input
                  ref={backgroundColorInputRef}
                  type="color"
                  defaultValue="#ffff00"
                  className={cn(
                    "h-7 w-7 rounded border cursor-pointer transition-colors",
                    currentBackgroundColor
                      ? "border-blue-500 ring-1 ring-blue-400"
                      : darkMode
                        ? "border-white/[0.2] hover:border-white/[0.4]"
                        : "border-gray-300 hover:border-gray-400"
                  )}
                  onMouseDown={() => onSaveSelection()}
                  onInput={(e) => onSetBackgroundColor((e.target as HTMLInputElement).value)}
                  onChange={(e) => onSetBackgroundColor(e.target.value)}
                  onBlur={(e) => {
                    if (e.target.value) {
                      onRestoreSelection();
                      onApplyBackgroundColor(e.target.value);
                    }
                  }}
                />
                {currentBackgroundColor && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded border-2 border-blue-500"
                    style={{ backgroundColor: currentBackgroundColor, opacity: 0.3 }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className={cn("border-t", darkMode ? "border-white/[0.08]" : "border-gray-200")} />

          {/* Insert tools */}
          <div className="flex items-start gap-2">
            <span className={cn(labelCls, "mt-1.5")}>Insert</span>
            <div className="flex flex-wrap gap-1.5">
              <LinkDialog
                isOpen={isLinkDialogOpen}
                onOpenChange={onLinkDialogOpenChange}
                linkUrl={linkUrl}
                linkText={linkText}
                selectedTextForLink={selectedTextForLink}
                onLinkUrlChange={onLinkUrlChange}
                onLinkTextChange={onLinkTextChange}
                onInsert={onLinkInsert}
                onCancel={onLinkCancel}
                onSaveSelection={onSaveSelection}
                onSetSelectedText={onSetSelectedText}
                hasLink={hasLink}
                onRemoveLink={onRemoveLink}
              />

              {/* Table insert button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSaveSelection();
                  onTableDialogOpenChange(true);
                  setMoreOpen(false);
                }}
                className={cn(
                  "h-7 px-2 text-xs gap-1 cursor-pointer",
                  darkMode ? "text-white/70 hover:text-white hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Insert Table"
              >
                <Table className="h-3.5 w-3.5" />
                Table
              </Button>

              {/* Columns */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onInsertColumn();
                  setMoreOpen(false);
                }}
                className={cn(
                  "h-7 px-2 text-xs gap-1 cursor-pointer",
                  darkMode ? "text-white/70 hover:text-white hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"
                )}
                title="Insert 2-Column Layout"
              >
                <Columns2 className="h-3.5 w-3.5" />
                Columns
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Table insert dialog (rendered here, triggered from popover) */}
      {!selectedTable && (
        <TableDialog
          isOpen={isTableDialogOpen}
          onOpenChange={onTableDialogOpenChange}
          tableRows={tableRows}
          tableCols={tableCols}
          onTableRowsChange={onTableRowsChange}
          onTableColsChange={onTableColsChange}
          onInsert={onTableInsert}
          selectedTable={null}
          onAddRow={onAddTableRow}
          onAddColumn={onAddTableColumn}
          onDeleteRow={onDeleteTableRow}
          onDeleteColumn={onDeleteTableColumn}
          onDeleteTable={onDeleteTable}
        />
      )}

      {sep}

      {/* Image upload */}
      <input
        type="file"
        id={`image-upload-${uniqueId}`}
        accept="image/*"
        multiple
        className="hidden"
        onChange={onImageUpload}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2.5 gap-1.5 text-xs cursor-pointer flex-shrink-0",
          darkMode ? "text-white/65 hover:text-white hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"
        )}
        title="Upload Image"
        onClick={() => document.getElementById(`image-upload-${uniqueId}`)?.click()}
      >
        <Image className="h-3.5 w-3.5" />
        Image
      </Button>

      {sep}

      {/* Selected table controls */}
      {selectedTable && (
        <div
          className={cn(
            "flex items-center gap-0.5 px-2 py-1 rounded border",
            darkMode ? "bg-white/[0.05] border-white/[0.12]" : "bg-gray-100 border-gray-300"
          )}
        >
          <span className={cn("text-[11px] font-medium mr-1", darkMode ? "text-blue-400" : "text-blue-600")}>
            Table:
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onAddTableRow(selectedTable);
            }}
            className={cn(
              "h-6 w-6 p-0",
              darkMode ? "text-white/70 hover:text-white hover:bg-white/[0.1]" : "hover:bg-gray-200"
            )}
            title="Add Row"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className={cn("text-[10px]", darkMode ? "text-white/30" : "text-gray-400")}>R</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onAddTableColumn(selectedTable);
            }}
            className={cn(
              "h-6 w-6 p-0 ml-1",
              darkMode ? "text-white/70 hover:text-white hover:bg-white/[0.1]" : "hover:bg-gray-200"
            )}
            title="Add Column"
          >
            <Plus className="h-3 w-3" />
          </Button>
          <span className={cn("text-[10px]", darkMode ? "text-white/30" : "text-gray-400")}>C</span>
          <div className={cn("w-px h-4 mx-1", darkMode ? "bg-white/[0.1]" : "bg-gray-300")} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onDeleteTableRow();
            }}
            className={cn(
              "h-6 px-1 text-[10px] gap-0.5",
              darkMode ? "text-orange-400 hover:bg-white/[0.08]" : "text-orange-600 hover:bg-orange-50"
            )}
            title="Delete Row"
            disabled={selectedTable.rows.length <= 1}
          >
            <Trash2 className="h-2.5 w-2.5" />R
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onDeleteTableColumn();
            }}
            className={cn(
              "h-6 px-1 text-[10px] gap-0.5",
              darkMode ? "text-orange-400 hover:bg-white/[0.08]" : "text-orange-600 hover:bg-orange-50"
            )}
            title="Delete Column"
            disabled={(selectedTable.rows[0]?.cells.length ?? 0) <= 1}
          >
            <Trash2 className="h-2.5 w-2.5" />C
          </Button>
          <div className={cn("w-px h-4 mx-1", darkMode ? "bg-white/[0.1]" : "bg-gray-300")} />
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onDeleteTable(selectedTable);
            }}
            className={cn(
              "h-6 px-1 text-[10px] gap-0.5",
              darkMode ? "text-red-400 hover:bg-white/[0.08]" : "text-red-600 hover:bg-red-50"
            )}
            title="Delete Table"
          >
            <Trash2 className="h-2.5 w-2.5" />
            Del
          </Button>
        </div>
      )}

      {/* Selected column layout controls */}
      {selectedColumnLayout && (
        <div
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded border",
            darkMode ? "bg-white/[0.05] border-white/[0.12]" : "bg-gray-100 border-gray-300"
          )}
        >
          <span className={cn("text-[11px] font-medium mr-1", darkMode ? "text-blue-400" : "text-blue-600")}>
            Columns:
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onDeleteColumnLayout(selectedColumnLayout);
            }}
            className={cn(
              "h-6 px-1.5 text-[10px] gap-0.5",
              darkMode ? "text-red-400 hover:bg-white/[0.08]" : "text-red-600 hover:bg-red-50"
            )}
            title="Delete Column Layout"
          >
            <Trash2 className="h-2.5 w-2.5" />
            Delete
          </Button>
        </div>
      )}

      {/* Fullscreen toggle - pushed to right */}
      <div className="ml-auto">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleFullscreen}
          className={cn(
            "h-7 w-7 p-0 rounded cursor-pointer",
            darkMode ? "text-white/65 hover:text-white hover:bg-white/[0.08]" : "text-gray-600 hover:bg-gray-100"
          )}
          title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
        >
          {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
