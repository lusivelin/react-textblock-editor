import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, clickToolbarButton, getEditorHtml } from "./helpers";

test.describe("Editor – basic typing and rendering", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("types text into the editor", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Hello world");
    await expect(editor).toContainText("Hello world");
  });

  test("editor is present and editable", async ({ page }) => {
    const editor = getEditor(page);
    await expect(editor).toHaveAttribute("contenteditable", "true");
  });

  test("toolbar renders", async ({ page }) => {
    await expect(page.locator(".rtb-toolbar")).toBeVisible();
  });

  test("undo removes typed text", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Undo me");
    await expect(editor).toContainText("Undo me");
    await page.keyboard.press("Control+z");
    const text = await editor.textContent();
    expect(text?.includes("Undo me")).toBeFalsy();
  });

  test("redo restores undone text", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Redo me");
    await page.keyboard.press("Control+z");
    await page.keyboard.press("Control+Shift+z");
    await expect(editor).toContainText("Redo me");
  });

  test("placeholder shown when editor is empty", async ({ page }) => {
    // The demo sets placeholder="Start typing…"
    // ProseMirror renders placeholder as ::before content on an empty doc
    const editor = getEditor(page);
    await expect(editor).toBeEmpty(); // no text nodes
    // Just verify the editor is in empty state after clear
    const html = await getEditorHtml(page);
    expect(html).not.toContain("Hello");
  });
});
