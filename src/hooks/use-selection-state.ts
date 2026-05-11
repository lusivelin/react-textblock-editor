/**
 * useSelectionState Hook
 *
 * Manages selection state for special elements like column layouts
 */

import { useCallback, useState } from "react";

export interface UseSelectionStateReturn {
  selectedColumnLayout: HTMLElement | null;
  setSelectedColumnLayout: (layout: HTMLElement | null) => void;
  clearSelection: () => void;
}

/**
 * Hook to manage selection state for special elements
 */
export function useSelectionState(): UseSelectionStateReturn {
  const [selectedColumnLayout, setSelectedColumnLayout] = useState<HTMLElement | null>(null);

  const clearSelection = useCallback(() => {
    setSelectedColumnLayout(null);
  }, []);

  return {
    selectedColumnLayout,
    setSelectedColumnLayout,
    clearSelection,
  };
}
