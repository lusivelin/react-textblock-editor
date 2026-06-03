import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";

interface UsePopoverOptions {
  panelWidth?: number;
  panelHeight?: number;
  onClose?: () => void;
}

type PopoverState =
  | { isOpen: false; pos: null }
  | { isOpen: true; pos: { top: number; left: number } };

type PopoverAction =
  | { type: "open"; pos: { top: number; left: number } }
  | { type: "close" };

function reducer(_: PopoverState, action: PopoverAction): PopoverState {
  if (action.type === "open") return { isOpen: true, pos: action.pos };
  return { isOpen: false, pos: null };
}

function computePos(
  anchor: HTMLElement,
  panelWidth: number,
  panelHeight: number
): { top: number; left: number } {
  const rect = anchor.getBoundingClientRect();
  const margin = 8;
  const left = Math.max(margin, Math.min(rect.left, window.innerWidth - panelWidth - margin));
  const top =
    rect.bottom + 4 + panelHeight > window.innerHeight - margin
      ? Math.max(margin, rect.top - panelHeight - 4)
      : rect.bottom + 4;
  return { top, left };
}

export function usePopover<
  Anchor extends HTMLElement = HTMLElement,
  Panel extends HTMLElement = HTMLElement,
>(options: UsePopoverOptions = {}) {
  const { panelWidth = 200, panelHeight = 200 } = options;
  const onCloseRef = useRef(options.onClose);
  onCloseRef.current = options.onClose;

  const [state, dispatch] = useReducer(reducer, { isOpen: false, pos: null });
  const anchorRef = useRef<Anchor>(null);
  const panelRef = useRef<Panel>(null);

  const close = useCallback(() => {
    dispatch({ type: "close" });
    onCloseRef.current?.();
  }, []);

  const open = useCallback(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    dispatch({ type: "open", pos: computePos(anchor, panelWidth, panelHeight) });
  }, [panelWidth, panelHeight]);

  const toggle = useCallback(() => {
    if (state.isOpen) {
      close();
    } else {
      const anchor = anchorRef.current;
      if (anchor) dispatch({ type: "open", pos: computePos(anchor, panelWidth, panelHeight) });
    }
  }, [state.isOpen, close, panelWidth, panelHeight]);

  useEffect(() => {
    if (!state.isOpen) return;
    const dismiss = (event: MouseEvent | TouchEvent) => {
      const target = (event instanceof TouchEvent ? event.touches[0]?.target : event.target) as Node | null;
      if (!target) return;
      if (!anchorRef.current?.contains(target) && !panelRef.current?.contains(target)) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("touchstart", dismiss, { passive: true });
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("touchstart", dismiss);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [state.isOpen, close]);

  // Stable actions object — consumers can destructure without triggering re-renders.
  const actions = useMemo(() => ({ open, close, toggle }), [open, close, toggle]);

  return { ...state, anchorRef, panelRef, ...actions };
}
