import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, clickToolbarButton, getEditorHtml } from "./helpers";

test.describe("Inline formatting", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("bold via Ctrl+B wraps in <strong>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Format me");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+b");
    const html = await getEditorHtml(page);
    expect(html).toContain("<strong>");
  });

  test("italic via Ctrl+I wraps in <em>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Format me");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+i");
    const html = await getEditorHtml(page);
    expect(html).toContain("<em>");
  });

  test("underline via Ctrl+U wraps in <u>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Format me");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+u");
    const html = await getEditorHtml(page);
    expect(html).toContain("<u>");
  });

  test("bold toolbar button toggles <strong>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Bold text");
    await page.keyboard.press("Control+a");
    await clickToolbarButton(page, "Bold (Ctrl+B)");
    const html = await getEditorHtml(page);
    expect(html).toContain("<strong>");
  });

  test("italic toolbar button toggles <em>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Italic text");
    await page.keyboard.press("Control+a");
    await clickToolbarButton(page, "Italic (Ctrl+I)");
    const html = await getEditorHtml(page);
    expect(html).toContain("<em>");
  });

  test("underline toolbar button wraps in <u>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Underlined");
    await page.keyboard.press("Control+a");
    await clickToolbarButton(page, "Underline");
    const html = await getEditorHtml(page);
    expect(html).toContain("<u>");
  });

  test("strikethrough toolbar button wraps in <s>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Struck");
    await page.keyboard.press("Control+a");
    await clickToolbarButton(page, "Strikethrough");
    const html = await getEditorHtml(page);
    expect(html).toContain("<s>");
  });

  test("inline code toolbar button wraps in <code>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("inlineCode");
    await page.keyboard.press("Control+a");
    await clickToolbarButton(page, "Inline Code");
    const html = await getEditorHtml(page);
    expect(html).toContain("<code>");
  });

  test("toggling bold twice removes bold", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Toggle");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+b");
    await page.keyboard.press("Control+b");
    const html = await getEditorHtml(page);
    expect(html).not.toContain("<strong>");
  });

  test("bold button shows active state when cursor is in bold text", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Active");
    await page.keyboard.press("Control+a");
    await page.keyboard.press("Control+b");
    // Move cursor to middle of the bold text (Home then ArrowRight twice)
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowRight");
    // ProseMirror re-renders toolbar synchronously after selection change
    const boldBtn = page.locator('button[title="Bold (Ctrl+B)"]');
    await expect(boldBtn).toHaveAttribute("data-active", "true");
  });
});

test.describe("Block formatting", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("H1 button creates heading level 1", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Heading One");
    await clickToolbarButton(page, "Heading 1");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<h1[^>]*>.*Heading One.*<\/h1>/s);
  });

  test("H2 button creates heading level 2", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Heading Two");
    await clickToolbarButton(page, "Heading 2");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<h2[^>]*>.*Heading Two.*<\/h2>/s);
  });

  test("H3 button creates heading level 3", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Heading Three");
    await clickToolbarButton(page, "Heading 3");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<h3[^>]*>.*Heading Three.*<\/h3>/s);
  });

  test("Paragraph button converts heading back to paragraph", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Paragraph");
    await clickToolbarButton(page, "Heading 1");
    await clickToolbarButton(page, "Paragraph");
    const html = await getEditorHtml(page);
    expect(html).not.toContain("<h1");
    expect(html).toContain("<p>");
  });

  test("blockquote button wraps in blockquote", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("A quote");
    await clickToolbarButton(page, "Blockquote");
    const html = await getEditorHtml(page);
    expect(html).toContain("<blockquote>");
  });
});
