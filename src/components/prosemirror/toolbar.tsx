"use client";

import { useRef } from "react";
import {
  Bold,
  Code,
  ImagePlus,
  Italic,
  List,
  ListOrdered,
  Quote,
  Redo,
  Strikethrough,
  Table2,
  Underline,
  Undo,
} from "lucide-react";
import { toggleMark, setBlockType, wrapIn } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import { wrapInList } from "prosemirror-schema-list";
import type { EditorView } from "prosemirror-view";
import type { EditorState, Command } from "prosemirror-state";
import type { MarkType, NodeType } from "prosemirror-model";
import { schema } from "./schema";
import { cn } from "../../shadcn/lib/utils";

interface ProseMirrorToolbarProps {
  view: EditorView | null;
  state: EditorState | null;
  darkMode: boolean;
  onImageUpload?: (file: File) => Promise<string>;
}

function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!markType.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, markType);
}

function isBlockActive(state: EditorState, nodeType: NodeType, attrs?: Record<string, unknown>): boolean {
  const { $from, to } = state.selection;
  return to <= $from.end() && $from.parent.hasMarkup(nodeType, attrs);
}

function isListActive(state: EditorState, listType: NodeType): boolean {
  const { $from } = state.selection;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d).type === listType) return true;
  }
  return false;
}

function run(view: EditorView, cmd: Command) {
  cmd(view.state, view.dispatch, view);
  view.focus();
}

const insertTableCmd: Command = (state, dispatch) => {
  const { table, table_row, table_cell, table_header } = schema.nodes;
  if (!table || !table_row || !table_cell) return false;
  const cell = (hdr: boolean) => (hdr && table_header ? table_header : table_cell).createAndFill()!;
  const row = (hdr: boolean) => table_row.create(null, [cell(hdr), cell(hdr), cell(hdr)]);
  const tbl = table.create(null, [row(true), row(false), row(false)]);
  if (dispatch) dispatch(state.tr.replaceSelectionWith(tbl).scrollIntoView());
  return true;
};

function insertImageCmd(src: string, alt = ""): Command {
  return (state, dispatch) => {
    const img = schema.nodes.image.create({ src, alt });
    if (dispatch) dispatch(state.tr.replaceSelectionWith(img).scrollIntoView());
    return true;
  };
}

export function ProseMirrorToolbar({ view, state, darkMode, onImageUpload }: ProseMirrorToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!view || !state) return null;

  const btnCls = (active: boolean) =>
    cn(
      "flex h-7 items-center justify-center rounded px-1.5 text-xs transition-colors",
      darkMode
        ? active
          ? "bg-white/20 text-white"
          : "text-white/60 hover:bg-white/10 hover:text-white"
        : active
          ? "bg-slate-200 text-slate-900"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
    );

  const btn = (
    label: string,
    icon: React.ReactNode,
    cmd: Command,
    active: boolean,
    title?: string
  ) => (
    <button
      key={label}
      type="button"
      title={title ?? label}
      onMouseDown={(e) => {
        e.preventDefault();
        run(view, cmd);
      }}
      className={btnCls(active)}
    >
      {icon}
    </button>
  );

  const sep = () => (
    <span className={cn("mx-0.5 h-5 w-px shrink-0", darkMode ? "bg-white/10" : "bg-slate-200")} />
  );

  const headingBtn = (level: number) =>
    btn(
      `H${level}`,
      <span className="text-[11px] font-bold">{`H${level}`}</span>,
      setBlockType(schema.nodes.heading, { level }),
      isBlockActive(state, schema.nodes.heading, { level }),
      `Heading ${level}`
    );

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    let src: string;
    try {
      src = onImageUpload ? await onImageUpload(file) : URL.createObjectURL(file);
    } catch {
      return;
    }

    run(view, insertImageCmd(src, file.name));
  };

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-0.5 border-b px-2 py-1.5",
        darkMode ? "border-white/[0.08] bg-white/[0.02]" : "border-slate-200 bg-slate-50"
      )}
    >
      {btn("Undo", <Undo size={14} />, undo, false, "Undo (Ctrl+Z)")}
      {btn("Redo", <Redo size={14} />, redo, false, "Redo (Ctrl+Shift+Z)")}
      {sep()}
      {btn("Bold", <Bold size={14} />, toggleMark(schema.marks.strong), isMarkActive(state, schema.marks.strong), "Bold (Ctrl+B)")}
      {btn("Italic", <Italic size={14} />, toggleMark(schema.marks.em), isMarkActive(state, schema.marks.em), "Italic (Ctrl+I)")}
      {btn("Underline", <Underline size={14} />, toggleMark(schema.marks.underline), isMarkActive(state, schema.marks.underline), "Underline")}
      {btn("Strike", <Strikethrough size={14} />, toggleMark(schema.marks.strike), isMarkActive(state, schema.marks.strike), "Strikethrough")}
      {btn("Code", <Code size={14} />, toggleMark(schema.marks.code), isMarkActive(state, schema.marks.code), "Inline Code")}
      {sep()}
      {headingBtn(1)}
      {headingBtn(2)}
      {headingBtn(3)}
      {btn("Paragraph", <span className="text-[11px]">¶</span>, setBlockType(schema.nodes.paragraph), isBlockActive(state, schema.nodes.paragraph), "Paragraph")}
      {sep()}
      {btn("Bullet list", <List size={14} />, wrapInList(schema.nodes.bullet_list), isListActive(state, schema.nodes.bullet_list), "Bullet List")}
      {btn("Ordered list", <ListOrdered size={14} />, wrapInList(schema.nodes.ordered_list), isListActive(state, schema.nodes.ordered_list), "Ordered List")}
      {btn("Blockquote", <Quote size={14} />, wrapIn(schema.nodes.blockquote), isBlockActive(state, schema.nodes.blockquote), "Blockquote")}
      {sep()}

      {/* Image upload */}
      <button
        type="button"
        title="Insert image"
        onMouseDown={(e) => {
          e.preventDefault();
          fileInputRef.current?.click();
        }}
        className={btnCls(false)}
      >
        <ImagePlus size={14} />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageSelect}
      />

      {/* Insert table */}
      {btn("Insert table", <Table2 size={14} />, insertTableCmd, false, "Insert 3×3 table")}
    </div>
  );
}
