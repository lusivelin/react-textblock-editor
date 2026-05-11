"use client";

import { useEffect, useState } from "react";
import {
  BetweenHorizontalEnd,
  BetweenHorizontalStart,
  BetweenVerticalEnd,
  BetweenVerticalStart,
  Trash2,
} from "lucide-react";
import {
  addColumnAfter,
  addColumnBefore,
  addRowAfter,
  addRowBefore,
  deleteColumn,
  deleteRow,
  deleteTable,
  isInTable,
} from "prosemirror-tables";
import type { EditorState, Command } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { cn } from "../../shadcn/lib/utils";

interface TableFloatingToolbarProps {
  view: EditorView;
  state: EditorState;
  darkMode: boolean;
}

function run(view: EditorView, cmd: Command) {
  cmd(view.state, view.dispatch, view);
  view.focus();
}

export function TableFloatingToolbar({ view, state, darkMode }: TableFloatingToolbarProps) {
  const [scrolling, setScrolling] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      setScrolling(true);
      clearTimeout(timer);
      timer = setTimeout(() => setScrolling(false), 150);
    };
    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll, { capture: true });
      clearTimeout(timer);
    };
  }, []);

  if (!isInTable(state) || scrolling) return null;

  const { from } = state.selection;
  const coords = view.coordsAtPos(from);

  const toolbarH = 34;
  const gap = 6;
  let top = coords.top - toolbarH - gap;
  if (top < 8) top = coords.bottom + gap;

  const iconBtn = (icon: React.ReactNode, cmd: Command, title: string, danger = false) => (
    <button
      key={title}
      type="button"
      title={title}
      onMouseDown={(e) => {
        e.preventDefault();
        run(view, cmd);
      }}
      className={cn(
        "flex h-6 w-6 items-center justify-center rounded transition-colors",
        darkMode
          ? danger
            ? "text-red-400 hover:bg-red-900/40 hover:text-red-300"
            : "text-white/60 hover:bg-white/10 hover:text-white"
          : danger
            ? "text-red-400 hover:bg-red-50 hover:text-red-600"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      )}
    >
      {icon}
    </button>
  );

  const sep = () => (
    <span className={cn("mx-0.5 h-4 w-px shrink-0", darkMode ? "bg-white/10" : "bg-slate-200")} />
  );

  const label = (text: string) => (
    <span
      className={cn(
        "select-none px-1 text-[9px] font-semibold uppercase tracking-widest",
        darkMode ? "text-white/30" : "text-slate-300"
      )}
    >
      {text}
    </span>
  );

  return (
    <div
      style={{ position: "fixed", top, left: coords.left, zIndex: 1000 }}
      className={cn(
        "flex items-center gap-0.5 rounded-lg border px-1.5 py-1 shadow-lg",
        darkMode
          ? "border-white/10 bg-[#1e2124] text-white"
          : "border-slate-200 bg-white text-slate-900"
      )}
      onMouseDown={(e) => e.preventDefault()}
    >
      {label("Row")}
      {iconBtn(<BetweenHorizontalStart size={13} />, addRowBefore, "Add row above")}
      {iconBtn(<BetweenHorizontalEnd size={13} />, addRowAfter, "Add row below")}
      {iconBtn(<Trash2 size={12} />, deleteRow, "Delete row", true)}

      {sep()}

      {label("Col")}
      {iconBtn(<BetweenVerticalStart size={13} />, addColumnBefore, "Add column left")}
      {iconBtn(<BetweenVerticalEnd size={13} />, addColumnAfter, "Add column right")}
      {iconBtn(<Trash2 size={12} />, deleteColumn, "Delete column", true)}

      {sep()}

      {iconBtn(<Trash2 size={13} />, deleteTable, "Delete table", true)}
    </div>
  );
}
