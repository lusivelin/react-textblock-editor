/**
 * useColorState Hook
 *
 * Manages text and background color state for the rich text editor
 */

import { useEffect, useRef, useState } from "react";
import { rgbToHex } from "../utils/editor/colors";

export interface UseColorStateReturn {
  currentTextColor: string;
  currentBackgroundColor: string;
  textColorInputRef: React.RefObject<HTMLInputElement | null>;
  backgroundColorInputRef: React.RefObject<HTMLInputElement | null>;
  setCurrentTextColor: (color: string) => void;
  setCurrentBackgroundColor: (color: string) => void;
  updateColorFromSelection: (textColor: string, backgroundColor: string) => void;
}

/**
 * Hook to manage color state for text and background colors
 */
export function useColorState(): UseColorStateReturn {
  const [currentTextColor, setCurrentTextColor] = useState<string>("");
  const [currentBackgroundColor, setCurrentBackgroundColor] = useState<string>("");
  const textColorInputRef = useRef<HTMLInputElement | null>(null);
  const backgroundColorInputRef = useRef<HTMLInputElement | null>(null);

  // Sync color input refs with state changes
  useEffect(() => {
    if (textColorInputRef.current && currentTextColor) {
      textColorInputRef.current.value = currentTextColor;
    }
  }, [currentTextColor]);

  useEffect(() => {
    if (backgroundColorInputRef.current && currentBackgroundColor) {
      backgroundColorInputRef.current.value = currentBackgroundColor;
    }
  }, [currentBackgroundColor]);

  const updateColorFromSelection = (textColor: string, backgroundColor: string) => {
    setCurrentTextColor(rgbToHex(textColor));
    setCurrentBackgroundColor(rgbToHex(backgroundColor));
  };

  return {
    currentTextColor,
    currentBackgroundColor,
    textColorInputRef,
    backgroundColorInputRef,
    setCurrentTextColor,
    setCurrentBackgroundColor,
    updateColorFromSelection,
  };
}
