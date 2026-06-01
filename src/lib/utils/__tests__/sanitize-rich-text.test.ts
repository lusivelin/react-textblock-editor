import { describe, it, expect } from "vitest";
import { sanitizeRichTextContent, isContentSafe, getSanitizationReport } from "../sanitize-rich-text";

// DOMPurify is unavailable in Node — tests cover the SSR regex path.

describe("sanitizeRichTextContent", () => {
  it("returns empty string for null", () => {
    expect(sanitizeRichTextContent(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(sanitizeRichTextContent(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(sanitizeRichTextContent("")).toBe("");
  });

  it("converts numbers to strings", () => {
    expect(sanitizeRichTextContent(42)).toBe("42");
  });

  it("strips contenteditable attributes", () => {
    const input = `<div contenteditable="true">text</div>`;
    expect(sanitizeRichTextContent(input)).not.toContain("contenteditable");
  });

  it("strips data-spelling-error attributes", () => {
    const input = `<span data-spelling-error="1">word</span>`;
    expect(sanitizeRichTextContent(input)).not.toContain("data-spelling-error");
  });

  it("strips empty style attributes", () => {
    const input = `<p style="">text</p>`;
    expect(sanitizeRichTextContent(input)).not.toContain('style=""');
  });

  it("strips CSS custom properties from style attributes", () => {
    const input = `<p style="--custom-var: red; color: blue;">text</p>`;
    const result = sanitizeRichTextContent(input);
    expect(result).not.toContain("--custom-var");
    expect(result).toContain("color: blue");
  });

  it("passes safe HTML through unchanged", () => {
    const safe = `<p>Hello <strong>world</strong></p>`;
    expect(sanitizeRichTextContent(safe)).toBe(safe);
  });
});

describe("isContentSafe", () => {
  it("returns true for already-clean HTML", () => {
    expect(isContentSafe("<p>Hello</p>")).toBe(true);
  });

  it("returns false when sanitization changes the content", () => {
    expect(isContentSafe(`<p contenteditable="true">x</p>`)).toBe(false);
  });
});

describe("getSanitizationReport", () => {
  it("reports no change for clean HTML", () => {
    const report = getSanitizationReport("<p>Hello</p>");
    expect(report.changed).toBe(false);
    expect(report.removedTags).toEqual([]);
  });

  it("reports changed when content is modified", () => {
    const report = getSanitizationReport(`<p contenteditable="true">x</p>`);
    expect(report.changed).toBe(true);
  });

  it("returns original and sanitized strings", () => {
    const original = "<p>test</p>";
    const report = getSanitizationReport(original);
    expect(report.original).toBe(original);
    expect(typeof report.sanitized).toBe("string");
  });
});
