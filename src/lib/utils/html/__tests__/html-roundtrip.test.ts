import { describe, it, expect } from "vitest";
import { parseHtmlToDoc } from "../html-to-prosemirror";
import { serializeDocToHtml } from "../prosemirror-to-html";
import { createEditorSchema } from "@lib/components/prosemirror/schema";

const schema = createEditorSchema([]);

describe("parseHtmlToDoc + serializeDocToHtml", () => {
  it("round-trips a paragraph", () => {
    const html = "<p>Hello world</p>";
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).toBe("<p>Hello world</p>");
  });

  it("round-trips bold text", () => {
    const html = "<p><strong>Bold</strong></p>";
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).toBe("<p><strong>Bold</strong></p>");
  });

  it("round-trips italic text", () => {
    const html = "<p><em>Italic</em></p>";
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).toBe("<p><em>Italic</em></p>");
  });

  it("round-trips headings", () => {
    const html = "<h1>Title</h1><h2>Subtitle</h2>";
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).toContain("Title");
    expect(result).toContain("Subtitle");
  });

  it("round-trips an unordered list", () => {
    const html = "<ul><li><p>One</p></li><li><p>Two</p></li></ul>";
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).toContain("One");
    expect(result).toContain("Two");
  });

  it("strips script tags via sanitizer", () => {
    const html = `<p>ok</p><script>alert('xss')</script>`;
    const doc = parseHtmlToDoc(html, schema);
    const result = serializeDocToHtml(doc, schema);
    expect(result).not.toContain("<script>");
    expect(result).not.toContain("alert");
  });

  it("produces a document node", () => {
    const doc = parseHtmlToDoc("<p>test</p>", schema);
    expect(doc.type.name).toBe("doc");
  });

  it("handles empty string without throwing", () => {
    expect(() => parseHtmlToDoc("", schema)).not.toThrow();
  });
});
