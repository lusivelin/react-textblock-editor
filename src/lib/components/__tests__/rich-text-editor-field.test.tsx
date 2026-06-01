import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RichTextEditorField } from "../rich-text-editor-field";

// StructuredEditor mounts ProseMirror which is incompatible with jsdom.
// Stub it out so field-level logic is testable without the full ProseMirror stack.
vi.mock("../prosemirror/structured-editor", () => ({
  StructuredEditor: ({ value }: { value: string }) => (
    <div data-testid="structured-editor" data-value={value} />
  ),
}));

describe("RichTextEditorField — lazy mount (default)", () => {
  it("renders a trigger button before first click", () => {
    const { getByRole, queryByTestId } = render(<RichTextEditorField value="<p>text</p>" />);
    expect(getByRole("button")).toBeInTheDocument();
    expect(queryByTestId("structured-editor")).toBeNull();
  });

  it("shows emptyLabel when content is empty", () => {
    const { getByText } = render(<RichTextEditorField value="" emptyLabel="Add content" />);
    expect(getByText("Add content")).toBeInTheDocument();
  });

  it("shows filledLabel when content is present", () => {
    const { getByText } = render(<RichTextEditorField value="<p>text</p>" filledLabel="Click to edit" />);
    expect(getByText("Click to edit")).toBeInTheDocument();
  });

  it("mounts editor after clicking the trigger", async () => {
    const user = userEvent.setup();
    const { getByRole, findByTestId } = render(<RichTextEditorField value="<p>hello</p>" />);
    await user.click(getByRole("button"));
    expect(await findByTestId("structured-editor")).toBeInTheDocument();
  });
});

describe("RichTextEditorField — eager mount", () => {
  it("renders editor directly when lazyMount=false", () => {
    const { getByTestId, queryByRole } = render(<RichTextEditorField value="<p>hello</p>" lazyMount={false} />);
    expect(getByTestId("structured-editor")).toBeInTheDocument();
    expect(queryByRole("button")).toBeNull();
  });

  it("passes value to the editor", () => {
    const { getByTestId } = render(<RichTextEditorField value="<p>content</p>" lazyMount={false} />);
    expect(getByTestId("structured-editor")).toHaveAttribute("data-value", "<p>content</p>");
  });
});

describe("RichTextEditorField — extension API ref", () => {
  it("getExtensionApi returns undefined for unknown extension", async () => {
    const ref = { current: null } as React.RefObject<import("../rich-text-editor-field").RichTextEditorHandle | null>;
    const { unmount } = render(<RichTextEditorField value="" lazyMount={false} ref={ref} />);
    expect(ref.current?.getExtensionApi("nonexistent")).toBeUndefined();
    unmount();
  });
});
