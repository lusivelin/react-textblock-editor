/**
 * Color Utilities for Rich Text Editor
 *
 * Provides color conversion and validation utilities
 */

/**
 * Converts RGB/RGBA color string to hex format
 * @param rgb - Color in rgb() or rgba() format
 * @returns Hex color string (e.g., "#ff5733")
 *
 * @example
 * rgbToHex("rgb(255, 87, 51)") // "#ff5733"
 * rgbToHex("rgba(255, 87, 51, 0.5)") // "#ff5733"
 * rgbToHex("#ff5733") // "#ff5733" (passthrough)
 */
export function rgbToHex(rgb: string): string {
  if (!rgb || rgb.startsWith("#")) {
    return rgb;
  }

  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match || match.length < 4) {
    return rgb;
  }

  const r = parseInt(match[1]!, 10);
  const g = parseInt(match[2]!, 10);
  const b = parseInt(match[3]!, 10);

  const hex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  return hex;
}

/**
 * Converts hex color to RGB format
 * @param hex - Hex color string (e.g., "#ff5733" or "ff5733")
 * @returns RGB color string (e.g., "rgb(255, 87, 51)")
 *
 * @example
 * hexToRgb("#ff5733") // "rgb(255, 87, 51)"
 * hexToRgb("ff5733") // "rgb(255, 87, 51)"
 */
export function hexToRgb(hex: string): string {
  const cleanHex = hex.replace("#", "");

  if (cleanHex.length !== 6) {
    return hex;
  }

  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Validates if a string is a valid color format
 * Supports hex, rgb, rgba, and named colors
 */
export function isValidColor(color: string): boolean {
  if (!color) return false;

  // Check hex format
  if (/^#[0-9A-F]{6}$/i.test(color)) return true;

  // Check rgb/rgba format
  if (/^rgba?\(\d+,\s*\d+,\s*\d+(?:,\s*[\d.]+)?\)$/i.test(color)) return true;

  // Check named colors (basic validation - accepts alphanumeric)
  if (/^[a-z]+$/i.test(color)) return true;

  return false;
}

/**
 * Normalizes color to hex format
 * Converts rgb/rgba to hex, ensures # prefix
 */
export function normalizeColor(color: string): string {
  if (!color) return "";

  // Already hex with #
  if (color.startsWith("#")) {
    return color.toUpperCase();
  }

  // Hex without #
  if (/^[0-9A-F]{6}$/i.test(color)) {
    return `#${color.toUpperCase()}`;
  }

  // RGB/RGBA - convert to hex
  if (color.startsWith("rgb")) {
    return rgbToHex(color);
  }

  return color;
}

/**
 * Gets the contrast ratio between two colors (simplified version)
 * Returns "light" or "dark" to indicate text color that should be used
 */
export function getContrastColor(hexColor: string): "light" | "dark" {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance > 0.5 ? "dark" : "light";
}
