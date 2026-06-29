import { Component, forwardRef, useEffect, useRef, useState } from "react";
import type React from "react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  ChevronDown,
  Highlighter,
  List,
  ListOrdered,
  Palette,
  Table2,
  X,
} from "lucide-react";
import { liftListItem, wrapInList } from "prosemirror-schema-list";
import type { Command, EditorState } from "prosemirror-state";
import type { MarkType, NodeType, Schema } from "prosemirror-model";
import type { EditorView } from "prosemirror-view";
import { cn } from "../../utils/cn";
import { usePopover } from "../../hooks/use-popover";
import type { EditorToolbarItem, EditorToolbarItemProps } from "../../core/editor-extension";

class ToolbarItemErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(err: unknown) { console.warn("[rtb] Toolbar item render failed:", err); }
  render() { return this.state.hasError ? null : this.props.children; }
}

const TOOLBAR_GROUP_ORDER = ["history", "inline", "block", "insert", "view"];
const PRESET_COLORS = [
  "#b2f2bb", "#fff3bf", "#ffc9c9", "#d0bfff", "#a5d8ff",
  "#40c057", "#fab005", "#fa5252", "#7950f2", "#228be6",
  "#2f9e44", "#f08c00", "#e03131", "#6741d9", "#1971c2",
  "#1e7e34", "#d9480f", "#c92a2a", "#5f3dc4", "#1864ab",
  "#dee2e6", "#adb5bd", "#868e96", "#495057", "#212529",
];
const GRID_ROWS = 8;
const GRID_COLS = 8;
const BULLET_STYLES = ["disc", "circle", "square"] as const;
const ORDERED_STYLES = ["decimal", "lower-alpha", "lower-greek", "lower-roman", "upper-alpha", "upper-roman"] as const;
const CP_W = 280;
const CP_H = 220;
const HUE_W = 16;
const HUE_H = 220;

interface HsvState {
  h: number;
  s: number;
  v: number;
}

export interface ProseMirrorToolbarProps extends EditorToolbarItemProps {
  items: EditorToolbarItem[];
  className?: string;
  isSourceMode?: boolean;
  onToggleSourceMode?: () => void;
}

export function runCommand(view: EditorView, command: Command) {
  command(view.state, view.dispatch, view);
  view.focus();
}

export function ToolbarSeparator() {
  return <span className="rtb-toolbar-sep" />;
}

export const ToolbarButton = forwardRef<HTMLButtonElement, {
  title: string;
  active?: boolean;
  onMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  children: React.ReactNode;
  className?: string;
}>(
  ({ title, active = false, onMouseDown, children, className }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        title={title}
        data-active={active || undefined}
        onMouseDown={onMouseDown}
        className={cn("rtb-toolbar-btn", className)}
      >
        {children}
      </button>
    );
  }
);

ToolbarButton.displayName = "ToolbarButton";

export function ProseMirrorToolbar({ items, className, isSourceMode, onToggleSourceMode, ...props }: ProseMirrorToolbarProps) {
  if (!props.view || !props.state) return null;

  const sortedItems = [...items].sort((a, b) => {
    const groupDelta =
      (TOOLBAR_GROUP_ORDER.indexOf(a.group) === -1 ? TOOLBAR_GROUP_ORDER.length : TOOLBAR_GROUP_ORDER.indexOf(a.group)) -
      (TOOLBAR_GROUP_ORDER.indexOf(b.group) === -1 ? TOOLBAR_GROUP_ORDER.length : TOOLBAR_GROUP_ORDER.indexOf(b.group));
    if (groupDelta !== 0) return groupDelta;
    return (a.priority ?? 0) - (b.priority ?? 0);
  });

  const itemProps = { ...props, isSourceMode, onToggleSourceMode };

  return (
    <div className={`rtb-toolbar${isSourceMode ? " rtb-toolbar--source-mode" : ""}${className ? ` ${className}` : ""}`}>
      {sortedItems.map((item) => (
        <ToolbarItemErrorBoundary key={item.id}>
          {item.render(itemProps)}
        </ToolbarItemErrorBoundary>
      ))}
    </div>
  );
}

export function isMarkActive(state: EditorState, markType: MarkType): boolean {
  const { from, $from, to, empty } = state.selection;
  if (empty) return !!markType.isInSet(state.storedMarks ?? $from.marks());
  return state.doc.rangeHasMark(from, to, markType);
}

export function isBlockActive(state: EditorState, nodeType: NodeType, attrs?: Record<string, unknown>): boolean {
  const { $from, to } = state.selection;
  if (to > $from.end() || $from.parent.type !== nodeType) return false;
  // Partial-match only the attrs the caller cares about. Using hasMarkup here
  // would deep-compare every attr (e.g. `align`), so a heading with an align
  // value set would fail a `{ level }`-only check.
  return !attrs || Object.keys(attrs).every((key) => $from.parent.attrs[key] === attrs[key]);
}

function isListActive(state: EditorState, listType: NodeType): boolean {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === listType) return true;
  }
  return false;
}

function getListStyleType(state: EditorState, listType: NodeType, fallback: string): string {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (node.type === listType) {
      return (node.attrs.listStyleType as string) || fallback;
    }
  }
  return fallback;
}

function findListDepth(state: EditorState, listType: NodeType): number {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    if ($from.node(depth).type === listType) return depth;
  }
  return -1;
}

function toggleList(listType: NodeType, otherListType: NodeType, listItemType: NodeType, fallbackStyle: string): Command {
  return (state, dispatch, view) => {
    const sameDepth = findListDepth(state, listType);
    if (sameDepth !== -1) {
      return liftListItem(listItemType)(state, dispatch, view);
    }

    const otherDepth = findListDepth(state, otherListType);
    if (otherDepth !== -1) {
      if (dispatch) {
        const pos = state.selection.$from.before(otherDepth);
        dispatch(state.tr.setNodeMarkup(pos, listType, { listStyleType: fallbackStyle }));
      }
      return true;
    }

    return wrapInList(listType, { listStyleType: fallbackStyle })(state, dispatch, view);
  };
}

function setListStyle(listType: NodeType, otherListType: NodeType, styleType: string): Command {
  return (state, dispatch, view) => {
    const { $from } = state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (node.type === listType) {
        if (dispatch) {
          const pos = $from.before(depth);
          dispatch(state.tr.setNodeMarkup(pos, null, { ...node.attrs, listStyleType: styleType }));
        }
        return true;
      }
      if (node.type === otherListType) {
        if (dispatch) {
          const pos = $from.before(depth);
          dispatch(state.tr.setNodeMarkup(pos, listType, { listStyleType: styleType }));
        }
        return true;
      }
    }
    return wrapInList(listType, { listStyleType: styleType })(state, dispatch, view);
  };
}

function createInsertTableCommand(schema: Schema, rows: number, cols: number): Command {
  return (state, dispatch) => {
    const { table, table_row, table_cell, table_header } = schema.nodes;
    if (!table || !table_row || !table_cell) return false;

    const createCell = (header: boolean) => (header && table_header ? table_header : table_cell).createAndFill();
    if (!createCell(true) || !createCell(false)) return false;

    const createRow = (rowIndex: number) =>
      table_row.create(
        null,
        Array.from({ length: cols }, () => createCell(rowIndex === 0)!)
      );
    const tableNode = table.create(null, Array.from({ length: rows }, (_, rowIndex) => createRow(rowIndex)));

    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(tableNode).scrollIntoView());
    }
    return true;
  };
}

export function createInsertImageCommand(
  schema: Schema,
  src: string,
  attrs: { alt?: string; title?: string; imageId?: string } = {}
): Command {
  return (state, dispatch) => {
    const image = schema.nodes.image;
    if (!image) return false;
    const imageNode = image.create({
      src,
      alt: attrs.alt ?? "",
      title: attrs.title ?? null,
      imageId: attrs.imageId ?? createImageId(),
    });
    if (dispatch) {
      dispatch(state.tr.replaceSelectionWith(imageNode).scrollIntoView());
    }
    return true;
  };
}

export function createImageId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `image_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [Math.round(f(5) * 255), Math.round(f(3) * 255), Math.round(f(1) * 255)];
}

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  let h = 0;

  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6);
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2);
    else h = 60 * ((rn - gn) / delta + 4);
  }

  return [h < 0 ? h + 360 : h, max === 0 ? 0 : delta / max, max];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const match = hex.replace("#", "").match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  return match ? [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)] : null;
}

function applyColor(markType: MarkType, color: string | null): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    if (dispatch) {
      let transaction = state.tr.removeMark(from, to, markType);
      if (color) {
        transaction = transaction.addMark(from, to, markType.create({ color }));
      }
      dispatch(transaction);
    }
    return true;
  };
}

function getMarkColor(state: EditorState, markType: MarkType): string | null {
  const { from, $from, to, empty } = state.selection;
  if (empty) {
    const mark = markType.isInSet(state.storedMarks ?? $from.marks());
    return mark ? (mark.attrs.color as string) : null;
  }

  let color: string | null = null;
  state.doc.nodesBetween(from, to, (node) => {
    if (color) return false;
    const mark = node.marks.find((candidate) => candidate.type === markType);
    if (mark) color = mark.attrs.color as string;
    return !color;
  });
  return color;
}

function ColorPickerModal({
  initial,
  onSave,
  onCancel,
}: {
  initial: string;
  onSave: (color: string) => void;
  onCancel: () => void;
}) {
  const initialRgb = hexToRgb(initial) ?? [0, 0, 0];
  const [h, s, v] = rgbToHsv(...initialRgb);
  const hsvRef = useRef<HsvState>({ h, s, v });
  const [hsv, setHsvState] = useState<HsvState>(hsvRef.current);
  const [hexValue, setHexValue] = useState(initial.replace("#", "").padStart(6, "0"));
  const [rgbInputs, setRgbInputs] = useState<[string, string, string]>(
    initialRgb.map(String) as [string, string, string]
  );
  const gradientRef = useRef<HTMLCanvasElement>(null);
  const hueRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef<"grad" | "hue" | null>(null);

  const [r, g, b] = hsvToRgb(hsv.h, hsv.s, hsv.v);
  const currentColor = rgbToHex(r, g, b);

  function updateHsv(next: HsvState) {
    hsvRef.current = next;
    setHsvState(next);
    const [nextR, nextG, nextB] = hsvToRgb(next.h, next.s, next.v);
    setHexValue(rgbToHex(nextR, nextG, nextB).replace("#", ""));
    setRgbInputs([String(nextR), String(nextG), String(nextB)]);
  }

  useEffect(() => {
    const canvas = gradientRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const [hueR, hueG, hueB] = hsvToRgb(hsv.h, 1, 1);
    const horizontal = context.createLinearGradient(0, 0, CP_W, 0);
    horizontal.addColorStop(0, "#fff");
    horizontal.addColorStop(1, `rgb(${hueR},${hueG},${hueB})`);
    context.fillStyle = horizontal;
    context.fillRect(0, 0, CP_W, CP_H);

    const vertical = context.createLinearGradient(0, 0, 0, CP_H);
    vertical.addColorStop(0, "rgba(0,0,0,0)");
    vertical.addColorStop(1, "#000");
    context.fillStyle = vertical;
    context.fillRect(0, 0, CP_W, CP_H);
  }, [hsv.h]);

  useEffect(() => {
    const canvas = hueRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const gradient = context.createLinearGradient(0, 0, 0, HUE_H);
    [0, 60, 120, 180, 240, 300, 360].forEach((value) => {
      const [hueR, hueG, hueB] = hsvToRgb(value, 1, 1);
      gradient.addColorStop(value / 360, `rgb(${hueR},${hueG},${hueB})`);
    });
    context.fillStyle = gradient;
    context.fillRect(0, 0, HUE_W, HUE_H);
  }, []);

  useEffect(() => {
    const onMove = (event: MouseEvent) => {
      if (!dragging.current) return;

      if (dragging.current === "grad") {
        const canvas = gradientRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const nextS = Math.max(0, Math.min(event.clientX - rect.left, CP_W)) / CP_W;
        const nextV = 1 - Math.max(0, Math.min(event.clientY - rect.top, CP_H)) / CP_H;
        updateHsv({ ...hsvRef.current, s: nextS, v: nextV });
        return;
      }

      const canvas = hueRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const nextH = (Math.max(0, Math.min(event.clientY - rect.top, HUE_H)) / HUE_H) * 360;
      updateHsv({ ...hsvRef.current, h: nextH });
    };

    const onUp = () => {
      dragging.current = null;
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
  }, []);

  const onGradientDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = "grad";
    const rect = gradientRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextS = Math.max(0, Math.min(event.clientX - rect.left, CP_W)) / CP_W;
    const nextV = 1 - Math.max(0, Math.min(event.clientY - rect.top, CP_H)) / CP_H;
    updateHsv({ ...hsvRef.current, s: nextS, v: nextV });
  };

  const onHueDown = (event: React.MouseEvent) => {
    event.preventDefault();
    dragging.current = "hue";
    const rect = hueRef.current?.getBoundingClientRect();
    if (!rect) return;
    const nextH = (Math.max(0, Math.min(event.clientY - rect.top, HUE_H)) / HUE_H) * 360;
    updateHsv({ ...hsvRef.current, h: nextH });
  };

  const onHexChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    setHexValue(value);
    if (value.length !== 6) return;
    const rgb = hexToRgb(value);
    if (!rgb) return;
    const [nextH, nextS, nextV] = rgbToHsv(...rgb);
    updateHsv({ h: nextH, s: nextS, v: nextV });
  };

  const onRgbChange = (index: 0 | 1 | 2, value: string) => {
    const nextInputs = [...rgbInputs] as [string, string, string];
    nextInputs[index] = value.replace(/[^0-9]/g, "").slice(0, 3);
    setRgbInputs(nextInputs);

    const numbers = nextInputs.map(Number);
    if (numbers.some((number) => Number.isNaN(number) || number < 0 || number > 255)) return;
    const [nextH, nextS, nextV] = rgbToHsv(numbers[0], numbers[1], numbers[2]);
    updateHsv({ h: nextH, s: nextS, v: nextV });
  };

  return (
    <div className="rtb-cp-overlay" onMouseDown={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="rtb-cp-modal">
        <div className="rtb-cp-header">
          <span className="rtb-cp-title">Color Picker</span>
          <button type="button" className="rtb-cp-close" onMouseDown={(event) => { event.preventDefault(); onCancel(); }}>
            <X size={14} />
          </button>
        </div>

        <div className="rtb-cp-body">
          <div className="rtb-cp-left">
            <div className="rtb-cp-grad-wrap" onMouseDown={onGradientDown}>
              <canvas ref={gradientRef} width={CP_W} height={CP_H} />
              <div className="rtb-cp-grad-cursor" style={{ left: hsv.s * CP_W, top: (1 - hsv.v) * CP_H }} />
            </div>
            <div className="rtb-cp-hue-wrap" onMouseDown={onHueDown}>
              <canvas ref={hueRef} width={HUE_W} height={HUE_H} />
              <div className="rtb-cp-hue-cursor" style={{ top: (hsv.h / 360) * HUE_H }} />
            </div>
          </div>

          <div className="rtb-cp-right">
            {(["R", "G", "B"] as const).map((label, index) => (
              <div key={label} className="rtb-cp-input-row">
                <span className="rtb-cp-input-label">{label}</span>
                <input
                  type="text"
                  className="rtb-cp-input"
                  value={rgbInputs[index]}
                  onChange={(event) => onRgbChange(index as 0 | 1 | 2, event.target.value)}
                />
              </div>
            ))}
            <div className="rtb-cp-input-row">
              <span className="rtb-cp-input-label">#</span>
              <input
                type="text"
                className="rtb-cp-input rtb-cp-input--hex"
                value={hexValue}
                onChange={onHexChange}
                maxLength={6}
              />
            </div>
            <div className="rtb-cp-preview" style={{ backgroundColor: currentColor }} />
          </div>
        </div>

        <div className="rtb-cp-footer">
          <button type="button" className="rtb-cp-btn rtb-cp-cancel" onMouseDown={(event) => { event.preventDefault(); onCancel(); }}>
            Cancel
          </button>
          <button type="button" className="rtb-cp-btn rtb-cp-save" onMouseDown={(event) => { event.preventDefault(); onSave(currentColor); }}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export function ColorDropdown({
  type,
  view,
  state,
  markType,
}: {
  type: "text" | "highlight";
  view: EditorView;
  state: EditorState;
  markType: MarkType;
}) {
  const { isOpen, pos: dropPos, anchorRef: wrapRef, panelRef: dropRef, close, toggle } =
    usePopover<HTMLDivElement, HTMLDivElement>({ panelWidth: 150, panelHeight: 175 });
  const [showModal, setShowModal] = useState(false);
  const currentColor = getMarkColor(state, markType);

  const pick = (color: string | null) => {
    runCommand(view, applyColor(markType, color));
    close();
  };

  return (
    <>
      <div ref={wrapRef} className="rtb-color-wrap">
        <ToolbarButton
          title={type === "text" ? "Text color" : "Highlight color"}
          onMouseDown={(event) => { event.preventDefault(); toggle(); }}
          className="rtb-color-main-btn"
        >
          {type === "text" ? (
            <span className="rtb-color-icon-wrap">
              <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>A</span>
              <span className="rtb-color-bar" style={{ backgroundColor: currentColor ?? "#000000" }} />
            </span>
          ) : (
            <span className="rtb-color-icon-wrap">
              <Highlighter size={12} />
              <span
                className="rtb-color-bar"
                style={{
                  backgroundColor: currentColor ?? "transparent",
                  border: currentColor ? "none" : "1px dashed #adb5bd",
                }}
              />
            </span>
          )}
        </ToolbarButton>
        <ToolbarButton title="Color options" onMouseDown={(event) => { event.preventDefault(); toggle(); }} className="rtb-list-chevron">
          <ChevronDown size={9} />
        </ToolbarButton>
      </div>

      {isOpen && dropPos && (
        <div
          ref={dropRef}
          className="rtb-color-dropdown"
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
        >
          <div className="rtb-color-grid">
            {PRESET_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                title={color}
                data-active={currentColor === color || undefined}
                className="rtb-color-swatch"
                style={{ backgroundColor: color }}
                onMouseDown={(event) => { event.preventDefault(); pick(color); }}
              />
            ))}
          </div>
          <div className="rtb-color-footer">
            <button
              type="button"
              title="Black"
              data-active={currentColor === "#000000" || undefined}
              className="rtb-color-swatch"
              style={{ backgroundColor: "#000000" }}
              onMouseDown={(event) => { event.preventDefault(); pick("#000000"); }}
            />
            <button
              type="button"
              title="Remove color"
              className="rtb-color-remove"
              onMouseDown={(event) => { event.preventDefault(); pick(null); }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="1" width="16" height="16" rx="2" stroke="#d1d5db" strokeWidth="1" />
                <line x1="4" y1="14" x2="14" y2="4" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              title="Custom color"
              className="rtb-color-palette-btn"
              onMouseDown={(event) => { event.preventDefault(); setShowModal(true); close(); }}
            >
              <Palette size={14} />
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <ColorPickerModal
          initial={currentColor ?? "#000000"}
          onSave={(color) => { pick(color); setShowModal(false); }}
          onCancel={() => setShowModal(false)}
        />
      )}
    </>
  );
}

function ListPreview({ listStyle, ordered }: { listStyle: string; ordered: boolean }) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag className="rtb-lp" style={{ listStyleType: listStyle }}>
      <li className="rtb-lp-item" />
      <li className="rtb-lp-item" />
      <li className="rtb-lp-item" />
    </Tag>
  );
}

export function ListStyleDropdown({
  type,
  view,
  state,
  schema,
}: {
  type: "bullet" | "ordered";
  view: EditorView;
  state: EditorState;
  schema: Schema;
}) {
  const { isOpen, pos: dropPos, anchorRef: wrapRef, panelRef: dropRef, close, toggle } =
    usePopover<HTMLDivElement, HTMLDivElement>({ panelWidth: 185, panelHeight: 130 });
  const listType = type === "bullet" ? schema.nodes.bullet_list : schema.nodes.ordered_list;
  const otherType = type === "bullet" ? schema.nodes.ordered_list : schema.nodes.bullet_list;
  const listItemType = schema.nodes.list_item;

  if (!listType || !otherType || !listItemType) return null;

  const fallbackStyle = type === "bullet" ? "disc" : "decimal";
  const isActive = isListActive(state, listType);
  const currentStyle = getListStyleType(state, listType, fallbackStyle);
  const styles = type === "bullet" ? BULLET_STYLES : ORDERED_STYLES;

  return (
    <>
      <div ref={wrapRef} className="rtb-list-picker-wrap">
        <ToolbarButton
          title={type === "bullet" ? "Bullet list" : "Ordered list"}
          active={isActive}
          onMouseDown={(event) => {
            event.preventDefault();
            runCommand(view, toggleList(listType, otherType, listItemType, fallbackStyle));
          }}
        >
          {type === "bullet" ? <List size={14} /> : <ListOrdered size={14} />}
        </ToolbarButton>
        <ToolbarButton title="List style" onMouseDown={(event) => { event.preventDefault(); toggle(); }} className="rtb-list-chevron">
          <ChevronDown size={9} />
        </ToolbarButton>
      </div>

      {isOpen && dropPos && (
        <div
          ref={dropRef}
          className={`rtb-list-picker${type === "ordered" ? " rtb-list-picker--ordered" : ""}`}
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left }}
        >
          {styles.map((style) => (
            <button
              key={style}
              type="button"
              title={style}
              data-active={currentStyle === style || undefined}
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand(view, setListStyle(listType, otherType, style));
                close();
              }}
              className="rtb-list-picker-option"
            >
              <ListPreview listStyle={style} ordered={type === "ordered"} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export type AlignValue = "left" | "center" | "right" | "justify";

const ALIGN_OPTIONS: { value: AlignValue; title: string; Icon: typeof AlignLeft }[] = [
  { value: "left", title: "Align left", Icon: AlignLeft },
  { value: "center", title: "Align center", Icon: AlignCenter },
  { value: "right", title: "Align right", Icon: AlignRight },
  { value: "justify", title: "Justify", Icon: AlignJustify },
];

function blockSupportsAlign(node: { type: { spec: { attrs?: Record<string, unknown> }; isTextblock: boolean } }): boolean {
  return node.type.isTextblock && !!node.type.spec.attrs && "align" in node.type.spec.attrs;
}

// Sets `align` on every text block touched by the selection. "left" is the
// default, so it is stored as null (no inline style emitted).
export function setBlockAlign(align: AlignValue): Command {
  return (state, dispatch) => {
    const { from, to } = state.selection;
    const next = align === "left" ? null : align;
    let tr = state.tr;
    let changed = false;
    state.doc.nodesBetween(from, to, (node, pos) => {
      if (!blockSupportsAlign(node)) return;
      if (node.attrs.align === next) return;
      tr = tr.setNodeMarkup(pos, undefined, { ...node.attrs, align: next });
      changed = true;
    });
    if (changed && dispatch) dispatch(tr.scrollIntoView());
    return changed;
  };
}

export function getBlockAlign(state: EditorState): AlignValue {
  const { $from } = state.selection;
  for (let depth = $from.depth; depth >= 0; depth -= 1) {
    const node = $from.node(depth);
    if (blockSupportsAlign(node)) {
      return (node.attrs.align as AlignValue) || "left";
    }
  }
  return "left";
}

export function AlignDropdown({ view, state }: { view: EditorView; state: EditorState }) {
  const { isOpen, pos: dropPos, anchorRef: wrapRef, panelRef: dropRef, close, toggle } =
    usePopover<HTMLDivElement, HTMLDivElement>({ panelWidth: 168, panelHeight: 44 });
  const current = getBlockAlign(state);
  const ActiveIcon = ALIGN_OPTIONS.find((option) => option.value === current)?.Icon ?? AlignLeft;

  return (
    <>
      <div ref={wrapRef} className="rtb-align-wrap">
        <ToolbarButton
          title="Text alignment"
          active={current !== "left"}
          onMouseDown={(event) => { event.preventDefault(); toggle(); }}
        >
          <ActiveIcon size={14} />
        </ToolbarButton>
        <ToolbarButton title="Alignment options" onMouseDown={(event) => { event.preventDefault(); toggle(); }} className="rtb-list-chevron">
          <ChevronDown size={9} />
        </ToolbarButton>
      </div>

      {isOpen && dropPos && (
        <div
          ref={dropRef}
          className="rtb-align-dropdown"
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left, zIndex: 9999 }}
        >
          {ALIGN_OPTIONS.map(({ value, title, Icon }) => (
            <button
              key={value}
              type="button"
              title={title}
              data-active={current === value || undefined}
              className="rtb-align-option"
              onMouseDown={(event) => {
                event.preventDefault();
                runCommand(view, setBlockAlign(value));
                close();
              }}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      )}
    </>
  );
}

export function TableInsertPicker({ view, schema }: { view: EditorView; schema: Schema }) {
  const { isOpen, pos: dropPos, anchorRef: buttonRef, panelRef: dropRef, close, toggle } =
    usePopover<HTMLButtonElement, HTMLDivElement>({
      panelWidth: 190,
      panelHeight: 200,
      onClose: () => setHovered(null),
    });
  const [hovered, setHovered] = useState<{ r: number; c: number } | null>(null);

  const insertTable = (rows: number, cols: number) => {
    runCommand(view, createInsertTableCommand(schema, rows, cols));
    close();
  };

  const label = hovered ? `${hovered.c + 1} × ${hovered.r + 1}` : "Insert table";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        title="Insert table"
        onMouseDown={(event) => { event.preventDefault(); toggle(); }}
        className="rtb-toolbar-btn"
      >
        <Table2 size={14} />
      </button>

      {isOpen && dropPos && (
        <div
          ref={dropRef}
          className="rtb-tbl-picker"
          style={{ position: "fixed", top: dropPos.top, left: dropPos.left }}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="rtb-tbl-grid">
            {Array.from({ length: GRID_ROWS }, (_, rowIndex) =>
              Array.from({ length: GRID_COLS }, (_, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`rtb-tbl-cell${hovered && rowIndex <= hovered.r && colIndex <= hovered.c ? " rtb-tbl-cell--on" : ""}`}
                  onMouseEnter={() => setHovered({ r: rowIndex, c: colIndex })}
                  onMouseDown={(event) => { event.preventDefault(); insertTable(rowIndex + 1, colIndex + 1); }}
                />
              ))
            )}
          </div>
          <div className="rtb-tbl-label">{label}</div>
        </div>
      )}
    </>
  );
}
