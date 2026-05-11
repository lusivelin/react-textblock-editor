/**
 * Image dimension utilities for rich text editor
 * (execCommand-based helpers removed; only dimension/resize utilities remain)
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Resize an image element
 */
export function resizeImage(img: HTMLImageElement, dimensions: ImageDimensions): void {
  img.style.width = `${dimensions.width}px`;
  img.style.height = `${dimensions.height}px`;
}

/**
 * Calculate new dimensions while maintaining aspect ratio
 */
export function calculateAspectRatioDimensions(
  originalWidth: number,
  originalHeight: number,
  deltaX: number,
  handle: string
): ImageDimensions {
  const aspectRatio = originalWidth / originalHeight;
  let newWidth = originalWidth;
  let newHeight = originalHeight;

  switch (handle) {
    case "se": // bottom-right
    case "ne": // top-right
    case "e": // right
      newWidth = Math.max(50, originalWidth + deltaX);
      newHeight = newWidth / aspectRatio;
      break;
    case "sw": // bottom-left
    case "nw": // top-left
    case "w": // left
      newWidth = Math.max(50, originalWidth - deltaX);
      newHeight = newWidth / aspectRatio;
      break;
  }

  return { width: newWidth, height: newHeight };
}
