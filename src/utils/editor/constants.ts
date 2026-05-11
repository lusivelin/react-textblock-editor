/**
 * Editor Constants
 *
 * Centralized constants for the rich text editor
 */

/**
 * Font size mappings from select values to CSS sizes
 */
export const FONT_SIZE_MAP: Record<string, string> = {
  small: "14px",
  normal: "16px",
  medium: "18px",
  large: "24px",
  huge: "32px",
} as const;

/**
 * Default font size for the editor
 */
export const DEFAULT_FONT_SIZE = "16px";

/**
 * Available variable templates for insertion
 */
export const AVAILABLE_VARIABLES = [
  { key: "{{name}}", label: "Customer Name" },
  { key: "{{email}}", label: "Customer Email" },
  { key: "{{phone}}", label: "Customer Phone" },
  { key: "{{company}}", label: "Company Name" },
  { key: "{{date}}", label: "Current Date" },
  { key: "{{time}}", label: "Current Time" },
] as const;

/**
 * Keyboard shortcuts for editor commands
 */
export const KEYBOARD_SHORTCUTS = {
  BOLD: "b",
  ITALIC: "i",
  UNDERLINE: "u",
  UNDO: "z",
  REDO: "y",
  SAVE: "s",
} as const;

/**
 * Default table configuration
 */
export const DEFAULT_TABLE_CONFIG = {
  rows: 3,
  cols: 3,
  headerColor: "#053b9b",
  headerTextColor: "#ffffff",
  borderColor: "#e5e7eb",
} as const;

/**
 * Default heading styles
 */
export const HEADING_STYLES = {
  h1: {
    fontSize: "43px",
    fontWeight: "700",
    lineHeight: "1.21em",
    letterSpacing: "0.05em",
  },
  h2: {
    fontSize: "34px",
    fontWeight: "700",
    lineHeight: "1.22em",
    letterSpacing: "0.03em",
  },
  h3: {
    fontSize: "30px",
    fontWeight: "700",
  },
} as const;

/**
 * Valid block-level tags
 */
export const BLOCK_TAGS = ["p", "h1", "h2", "h3", "h4", "h5", "h6"] as const;

/**
 * Valid formatting tags
 */
export const FORMATTING_TAGS = ["strong", "b", "em", "i", "u", "s", "span"] as const;

/**
 * Maximum history entries to maintain
 */
export const MAX_HISTORY_SIZE = 50;

/**
 * Debounce delay for auto-save (ms)
 */
export const AUTO_SAVE_DELAY = 1000;

/**
 * Default editor height
 */
export const DEFAULT_EDITOR_HEIGHT = 200;

/**
 * Minimum image resize dimensions
 */
export const MIN_IMAGE_SIZE = 50;

/**
 * Typing delay for history save (ms)
 */
export const TYPING_DELAY = 100;
