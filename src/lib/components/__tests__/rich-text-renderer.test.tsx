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
});
