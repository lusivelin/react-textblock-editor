/**
 * Custom hook for managing image resize functionality
 */

import { useCallback, useEffect, useState } from "react";
import type { ImageDimensions } from "../utils/editor/images";
import { calculateAspectRatioDimensions, resizeImage } from "../utils/editor/images";

export function useImageResize() {
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [initialMousePos, setInitialMousePos] = useState({ x: 0, y: 0 });
  const [initialImageSize, setInitialImageSize] = useState<ImageDimensions>({ width: 0, height: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, handle: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!selectedImage) return;

      setIsResizing(true);
      setResizeHandle(handle);
      setInitialMousePos({ x: e.clientX, y: e.clientY });

      const rect = selectedImage.getBoundingClientRect();
      setInitialImageSize({ width: rect.width, height: rect.height });
    },
    [selectedImage]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isResizing || !selectedImage || !resizeHandle) return;

      const deltaX = e.clientX - initialMousePos.x;
      const newDimensions = calculateAspectRatioDimensions(
        initialImageSize.width,
        initialImageSize.height,
        deltaX,
        resizeHandle
      );

      resizeImage(selectedImage, newDimensions);
    },
    [isResizing, selectedImage, resizeHandle, initialMousePos, initialImageSize]
  );

  const handleMouseUp = useCallback(() => {
    if (isResizing) {
      setIsResizing(false);
      setResizeHandle(null);
    }
  }, [isResizing]);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing, handleMouseMove, handleMouseUp]);

  return {
    selectedImage,
    setSelectedImage,
    isResizing,
    handleMouseDown,
  };
}
