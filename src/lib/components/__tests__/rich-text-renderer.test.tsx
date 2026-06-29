import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RichTextRenderer } from "../rich-text-renderer";

describe("RichTextRenderer", () => {
  it("renders null when content is empty", () => {
    const { container } = render(<RichTextRenderer content="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders HTML content", () => {
    render(<RichTextRenderer content="<p>Hello world</p>" />);
    expect(screen.getByText("Hello world")).toBeInTheDocument();
  });

  it("applies the rtb-renderer class", () => {
    const { container } = render(<RichTextRenderer content="<p>text</p>" />);
    expect(container.firstChild).toHaveClass("rtb-renderer");
  });

  it("applies a custom className", () => {
    const { container } = render(<RichTextRenderer content="<p>text</p>" className="prose" />);
    expect(container.firstChild).toHaveClass("rtb-renderer", "prose");
  });

  it("sanitizes unsafe content before rendering", () => {
    const { container } = render(
      <RichTextRenderer content={`<p>safe</p><script>alert('xss')</script>`} />
    );
    expect(container.innerHTML).not.toContain("<script>");
  });

  it("renders nested formatting", () => {
    const { container } = render(
      <RichTextRenderer content="<p><strong>Bold</strong> and <em>italic</em></p>" />
    );
    expect(container.querySelector("strong")).toBeInTheDocument();
    expect(container.querySelector("em")).toBeInTheDocument();
  });

  it("drops inline event handler attributes", () => {
    const { container } = render(
      <RichTextRenderer content={`<img src="x" onerror="alert(1)" alt="pic" />`} />
    );
    const img = container.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("onerror")).toBeNull();
  });

  it("strips javascript: hrefs", () => {
    const { container } = render(
      // biome-ignore lint/security/noJavascriptUrls: testing that it is stripped
      <RichTextRenderer content={`<a href="javascript:alert(1)">click</a>`} />
    );
    const a = container.querySelector("a");
    expect(a).toBeInTheDocument();
    expect(a?.getAttribute("href")).toBeNull();
  });

  it("strips entity-encoded javascript: hrefs", () => {
    const { container } = render(
      <RichTextRenderer content={`<a href="&#106;avascript:alert(1)">click</a>`} />
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBeNull();
  });

  it("blocks data: URIs on links but keeps them on images", () => {
    const { container } = render(
      <RichTextRenderer
        content={
          `<a href="data:text/html,<script>alert(1)</script>">x</a>` +
          `<img src="data:image/png;base64,iVBORw0KGgo=" alt="ok" />`
        }
      />
    );
    expect(container.querySelector("a")?.getAttribute("href")).toBeNull();
    expect(container.querySelector("img")?.getAttribute("src")).toMatch(/^data:image\/png/);
  });

  it("forces rel=noopener noreferrer on target=_blank links", () => {
    const { container } = render(
      <RichTextRenderer content={`<a href="https://example.com" target="_blank">x</a>`} />
    );
    const rel = container.querySelector("a")?.getAttribute("rel") ?? "";
    expect(rel).toContain("noopener");
    expect(rel).toContain("noreferrer");
  });

  it("keeps the text content of unknown wrapper tags", () => {
    render(<RichTextRenderer content="<section><p>kept text</p></section>" />);
    expect(screen.getByText("kept text")).toBeInTheDocument();
  });

  it("preserves text-align styling on blocks", () => {
    const { container } = render(
      <RichTextRenderer content={`<p style="text-align:center">centered</p>`} />
    );
    const p = container.querySelector("p");
    expect(p?.style.textAlign).toBe("center");
  });

  it("drops the content of dangerous tags entirely", () => {
    const { container } = render(
      <RichTextRenderer content={`<p>visible</p><style>.x{color:red}</style>`} />
    );
    expect(container.innerHTML).not.toContain("color:red");
    expect(screen.getByText("visible")).toBeInTheDocument();
  });
});
