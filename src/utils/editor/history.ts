/**
 * History management utilities for rich text editor (undo/redo)
 */

export interface HistoryState {
  history: string[];
  currentIndex: number;
}

/**
 * Create a new history state
 */
export function createHistoryState(initialContent: string = ""): HistoryState {
  return {
    history: [initialContent],
    currentIndex: 0,
  };
}

/**
 * Add a new state to history
 */
export function addToHistory(state: HistoryState, content: string): HistoryState {
  // Don't add if content hasn't changed
  if (state.history[state.currentIndex] === content) {
    return state;
  }

  // Remove any future history if we're not at the end
  const newHistory = state.history.slice(0, state.currentIndex + 1);

  // Add new state
  newHistory.push(content);

  // Limit based on content size: large HTML snapshots consume significant memory
  const limit = content.length > 10_000 ? 10 : content.length > 3_000 ? 20 : 50;
  const limitedHistory = newHistory.slice(-limit);

  return {
    history: limitedHistory,
    currentIndex: limitedHistory.length - 1,
  };
}

/**
 * Undo to previous state
 */
export function undo(state: HistoryState): { content: string | null; newState: HistoryState } {
  if (state.currentIndex <= 0) {
    return { content: null, newState: state };
  }

  const newIndex = state.currentIndex - 1;
  return {
    content: state.history[newIndex] ?? null,
    newState: {
      ...state,
      currentIndex: newIndex,
    },
  };
}

/**
 * Redo to next state
 */
export function redo(state: HistoryState): { content: string | null; newState: HistoryState } {
  if (state.currentIndex >= state.history.length - 1) {
    return { content: null, newState: state };
  }

  const newIndex = state.currentIndex + 1;
  return {
    content: state.history[newIndex] ?? null,
    newState: {
      ...state,
      currentIndex: newIndex,
    },
  };
}

/**
 * Check if undo is available
 */
export function canUndo(state: HistoryState): boolean {
  return state.currentIndex > 0;
}

/**
 * Check if redo is available
 */
export function canRedo(state: HistoryState): boolean {
  return state.currentIndex < state.history.length - 1;
}

/**
 * Clear all history
 */
export function clearHistory(currentContent: string = ""): HistoryState {
  return createHistoryState(currentContent);
}
