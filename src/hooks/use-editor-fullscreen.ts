import { type RefObject, useCallback, useEffect, useRef, useState } from "react";

interface UseEditorFullscreenProps {
  editorRef: RefObject<HTMLDivElement | null>;
  value?: string;
  onChange?: (content: string) => void;
}

/**
 * Moves the editor between inline and fullscreen layouts without losing the
 * current HTML or cursor-driven editing session.
 */
export function useEditorFullscreen({ editorRef, value, onChange }: UseEditorFullscreenProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen transitions remount the editable node. Keep the latest HTML in
  // a ref so the transition effect can restore it without subscribing to every
  // controlled value update.
  const latestValueRef = useRef(value);
  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  const toggleFullscreen = useCallback(() => {
    // Persist the currently visible HTML before moving the editor into or out
    // of the fullscreen portal.
    if (editorRef.current && onChange) {
      const currentContent = editorRef.current.innerHTML;
      onChange(currentContent);
      latestValueRef.current = currentContent;
    }
    setIsFullscreen((prev) => !prev);
  }, [editorRef, onChange]);

  // The editable element is remounted when the portal target changes, so
  // fullscreen transitions need one targeted content restore.
  const lastFullscreenRef = useRef(isFullscreen);
  useEffect(() => {
    if (lastFullscreenRef.current === isFullscreen) return;
    lastFullscreenRef.current = isFullscreen;

    if (!editorRef.current) return;
    const content = latestValueRef.current;
    if (!content) return;

    requestAnimationFrame(() => {
      if (editorRef.current && editorRef.current.innerHTML !== content) {
        editorRef.current.innerHTML = content;
      }
    });
  }, [isFullscreen, editorRef]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isFullscreen]);

  return {
    isFullscreen,
    setIsFullscreen,
    toggleFullscreen,
  };
}
