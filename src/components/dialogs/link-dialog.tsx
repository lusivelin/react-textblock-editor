"use client";

import { Button, buttonVariants } from "../../shadcn/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../shadcn/ui/dialog";
import { Input } from "../../shadcn/ui/input";
import { Label } from "../../shadcn/ui/label";
import { cn } from "../../shadcn/lib/utils";
import { Link } from "lucide-react";

interface LinkDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  linkUrl: string;
  linkText: string;
  selectedTextForLink: string;
  onLinkUrlChange: (v: string) => void;
  onLinkTextChange: (v: string) => void;
  onInsert: () => void;
  onCancel: () => void;
  onSaveSelection: () => void;
  onSetSelectedText: (v: string) => void;
  hasLink: boolean;
  onRemoveLink: () => void;
}

export function LinkDialog({
  isOpen,
  onOpenChange,
  linkUrl,
  linkText,
  selectedTextForLink,
  onLinkUrlChange,
  onLinkTextChange,
  onInsert,
  onCancel,
  onSaveSelection,
  onSetSelectedText,
  hasLink,
  onRemoveLink,
}: LinkDialogProps) {
  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (open) {
          onSaveSelection();
        } else {
          onSetSelectedText("");
          onLinkUrlChange("");
          onLinkTextChange("");
        }
        onOpenChange(open);
      }}
    >
      <DialogTrigger
        type="button"
        className={cn(
          buttonVariants({ variant: hasLink ? "default" : "ghost", size: "sm" }),
          "h-8 px-2 cursor-pointer",
          hasLink && "bg-blue-500 text-white hover:bg-blue-600"
        )}
        title={hasLink ? "Remove Link" : "Insert Link"}
        onClick={(e) => {
          if (hasLink) {
            e.preventDefault();
            e.stopPropagation();
            onRemoveLink();
          } else {
            onSaveSelection();
            const selection = window.getSelection();
            const selectedText = selection?.toString() || "";
            onSetSelectedText(selectedText);
            if (selectedText) {
              onLinkTextChange(selectedText);
            }
          }
        }}
      >
        <Link className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Insert Link</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          {!selectedTextForLink && (
            <div>
              <Label>Link Text</Label>
              <Input
                className="text-white bg-gray-700 border-gray-600 hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
                placeholder="Enter link text"
                value={linkText}
                onChange={(e) => onLinkTextChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && linkUrl && linkText) {
                    e.preventDefault();
                    onInsert();
                  }
                }}
              />
            </div>
          )}
          {selectedTextForLink && (
            <div>
              <Label>Selected Text</Label>
              <div className="px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
                {selectedTextForLink}
              </div>
            </div>
          )}
          <div>
            <Label>URL</Label>
            <Input
              className="text-white bg-gray-700 border-gray-600 hover:bg-gray-600 focus:ring-2 focus:ring-blue-500 placeholder:text-gray-400"
              placeholder="https://example.com"
              value={linkUrl}
              onChange={(e) => onLinkUrlChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && linkUrl) {
                  e.preventDefault();
                  onInsert();
                }
              }}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              className="bg-gray-700 text-white border-gray-600 hover:bg-gray-600"
              onClick={onCancel}
            >
              Cancel
            </Button>
            <Button
              className="bg-blue-600 text-white hover:bg-blue-700"
              onClick={onInsert}
              disabled={!linkUrl || (!linkText && !selectedTextForLink)}
            >
              Insert Link
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
