/**
 * Tracks undo/redo snapshots for the rich text editor.
 *
 * `addContent` is called from the editor input flow, `undo`/`redo` are used by
 * keyboard shortcuts, and `resetHistory` is used when the editor is replaced
 * with externally provided HTML.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { HistoryState } from "../utils/editor/history";
import {
  addToHistory,
  canRedo as checkCanRedo,
  canUndo as checkCanUndo,
  createHistoryState,
  redo as redoHistory,
  undo as undoHistory,
} from "../utils/editor/history";

export function useEditorHistory(initialContent: string = "") {
  const [historyState, setHistoryState] = useState<HistoryState>(() => createHistoryState(initialContent));
  const historyStateRef = useRef<HistoryState>(historyState);
  const isUndoRedoRef = useRef(false);

  // Keep the latest typed HTML pending until the user pauses long enough to
  // store a new snapshot.
  const pendingContentRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commitHistoryState = useCallback((nextState: HistoryState) => {
    historyStateRef.current = nextState;
    setHistoryState(nextState);
  }, []);

  // Keyboard undo should include the most recent typing burst even if the
  // debounce window has not finished yet.
  const flushPending = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    if (pendingContentRef.current !== null) {
      const content = pendingContentRef.current;
      pendingContentRef.current = null;
      commitHistoryState(addToHistory(historyStateRef.current, content));
    }
  }, [commitHistoryState]);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, []);

  const addContent = useCallback((content: string) => {
    if (isUndoRedoRef.current) {
      isUndoRedoRef.current = false;
      return;
    }

    // The editor calls this on every input event. Debouncing keeps a burst of
    // typing as one history entry instead of one snapshot per keystroke.
    pendingContentRef.current = content;

    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const latest = pendingContentRef.current;
      if (latest !== null) {
        commitHistoryState(addToHistory(historyStateRef.current, latest));
        pendingContentRef.current = null;
      }
      debounceTimerRef.current = null;
    }, 800);
  }, [commitHistoryState]);

  const undo = useCallback((): string | null => {
    // Step back from the latest visible editor state, including any pending
    // content that has not been committed by the debounce yet.
    flushPending();

    isUndoRedoRef.current = true;
    const { content, newState } = undoHistory(historyStateRef.current);
    commitHistoryState(newState);
    return content;
  }, [commitHistoryState, flushPending]);

  const redo = useCallback((): string | null => {
    isUndoRedoRef.current = true;
    const { content, newState } = redoHistory(historyStateRef.current);
    commitHistoryState(newState);
    return content;
  }, [commitHistoryState]);

  /**
   * Replace the current history with a single external snapshot.
   *
   * The rich text editor uses this after loading or swapping in HTML from
   * Sanity so Undo starts from the visible server-backed content.
   */
  const resetHistory = useCallback((content: string) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    pendingContentRef.current = null;
    isUndoRedoRef.current = false;
    commitHistoryState(createHistoryState(content));
  }, [commitHistoryState]);

  const canUndo = checkCanUndo(historyState);
  const canRedo = checkCanRedo(historyState);

  return {
    addContent,
    undo,
    redo,
    resetHistory,
    canUndo,
    canRedo,
    isUndoRedoRef,
  };
}
