import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { cn } from "../../utils/cn";

interface TableFloatingToolbarProps {
  view: EditorView;
  state: EditorState;
  darkMode?: boolean;
}

function run(view: EditorView, cmd: Command) {
  cmd(view.state, view.dispatch, view);
  view.focus();
}

function TableIcon({ variant }: { variant: "add-row-above" | "add-row-below" | "del-row" | "add-col-left" | "add-col-right" | "del-col" | "del-table" }) {
  const stroke = "currentColor";
  const sw = "1";
  const size = 14;

  const grid = (
    <>
      <rect x="0.5" y="0.5" width="13" height="13" rx="1.5" stroke={stroke} strokeWidth={sw} fill="none" />
      <line x1="0.5" y1="4.5" x2="13.5" y2="4.5" stroke={stroke} strokeWidth={sw} />
      <line x1="4.5" y1="0.5" x2="4.5" y2="13.5" stroke={stroke} strokeWidth={sw} />
      <line x1="9.5" y1="0.5" x2="9.5" y2="13.5" stroke={stroke} strokeWidth={sw} />
    </>
  );

  const highlights: Record<typeof variant, React.ReactNode> = {
    "add-row-above": (
      <>
        <rect x="1" y="1" width="12" height="3" fill="currentColor" fillOpacity="0.25" rx="1" />
        <line x1="2" y1="2.5" x2="4" y2="2.5" stroke={stroke} strokeWidth="1.2" />
        <line x1="3" y1="1.5" x2="3" y2="3.5" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "add-row-below": (
      <>
        <rect x="1" y="5" width="12" height="8" fill="currentColor" fillOpacity="0.25" rx="0.5" />
        <line x1="1.5" y1="9" x2="4" y2="9" stroke={stroke} strokeWidth="1.2" />
        <line x1="2.75" y1="7.75" x2="2.75" y2="10.25" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "del-row": (
      <>
        <rect x="1" y="5" width="12" height="8" fill="currentColor" fillOpacity="0.2" rx="0.5" />
        <line x1="5.5" y1="7" x2="8.5" y2="11" stroke={stroke} strokeWidth="1.2" />
        <line x1="8.5" y1="7" x2="5.5" y2="11" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "add-col-left": (
      <>
        <rect x="1" y="1" width="3" height="12" fill="currentColor" fillOpacity="0.25" rx="0.5" />
        <line x1="1.5" y1="7" x2="4" y2="7" stroke={stroke} strokeWidth="1.2" />
        <line x1="2.75" y1="5.75" x2="2.75" y2="8.25" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "add-col-right": (
      <>
        <rect x="10" y="1" width="3" height="12" fill="currentColor" fillOpacity="0.25" rx="0.5" />
        <line x1="10.5" y1="7" x2="13" y2="7" stroke={stroke} strokeWidth="1.2" />
        <line x1="11.75" y1="5.75" x2="11.75" y2="8.25" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "del-col": (
      <>
        <rect x="5" y="1" width="4" height="12" fill="currentColor" fillOpacity="0.2" rx="0.5" />
        <line x1="5.5" y1="5" x2="8.5" y2="9" stroke={stroke} strokeWidth="1.2" />
        <line x1="8.5" y1="5" x2="5.5" y2="9" stroke={stroke} strokeWidth="1.2" />
      </>
    ),
    "del-table": (
      <>
        <line x1="2" y1="2" x2="12" y2="12" stroke={stroke} strokeWidth="1.3" />
        <line x1="12" y1="2" x2="2" y2="12" stroke={stroke} strokeWidth="1.3" />
      </>
    ),
  };

  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
      {grid}
      {highlights[variant]}
    </svg>
  );
}

export function TableFloatingToolbar({ view, state, darkMode }: TableFloatingToolbarProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const [scrolling, setScrolling] = useState(false);
  const lastFromRef = useRef(-1);

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

  // RAF debounce: multiple rapid transactions (e.g. a click spawns mousedown +
  // focus + selection transactions) would otherwise flip the toolbar. We cancel
  // any pending frame and re-schedule so the position is read from the fully-
  // settled view.state after all synchronous updates have run.
  useEffect(() => {
    let rafId: number;

    if (!isInTable(state)) {
      setPos(null);
      lastFromRef.current = -1;
      return;
    }

    rafId = requestAnimationFrame(() => {
      const live = view.state;
      if (!isInTable(live)) {
        setPos(null);
        lastFromRef.current = -1;
        return;
      }
      const { from } = live.selection;
      if (from === lastFromRef.current) return;
      lastFromRef.current = from;

      const coords = view.coordsAtPos(from);
      const toolbarH = 34;
      const gap = 6;
      let top = coords.top - toolbarH - gap;
      if (top < 8) top = coords.bottom + gap;
      setPos({ top, left: coords.left });
    });

    return () => cancelAnimationFrame(rafId);
  }, [state, view]);

  if (!pos || scrolling) return null;

  const iconBtn = (icon: React.ReactNode, cmd: Command, title: string, danger = false) => (
    <button
      key={title}
      type="button"
      title={title}
      data-danger={danger || undefined}
      onMouseDown={(e) => { e.preventDefault(); run(view, cmd); }}
      className="loom-table-popup-btn"
    >
      {icon}
    </button>
  );

  const sep = () => <span className="loom-table-popup-sep" />;

  // Portal to document.body keeps position:fixed out of overflow:hidden.
  // The display:contents wrapper re-establishes CSS custom property inheritance
  // so --loom-* tokens resolve correctly without affecting layout.
  return createPortal(
    <div className={cn("loom-pm", darkMode && "loom-pm-dark")} style={{ display: "contents" }}>
      <div
        style={{ position: "fixed", top: pos.top, left: pos.left }}
        className="loom-table-popup"
        onMouseDown={(e) => e.preventDefault()}
      >
        {iconBtn(<TableIcon variant="add-row-above" />, addRowBefore, "Add row above")}
        {iconBtn(<TableIcon variant="add-row-below" />, addRowAfter, "Add row below")}
        {iconBtn(<TableIcon variant="del-row" />, deleteRow, "Delete row", true)}
        {sep()}
        {iconBtn(<TableIcon variant="add-col-left" />, addColumnBefore, "Add column left")}
        {iconBtn(<TableIcon variant="add-col-right" />, addColumnAfter, "Add column right")}
        {iconBtn(<TableIcon variant="del-col" />, deleteColumn, "Delete column", true)}
        {sep()}
        {iconBtn(<TableIcon variant="del-table" />, deleteTable, "Delete table", true)}
      </div>
    </div>,
    document.body
  );
}
