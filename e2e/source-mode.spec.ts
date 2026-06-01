import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, getEditorHtml } from "./helpers";

test.describe("HTML source mode", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("toolbar button opens the HTML source editor", async ({ page }) => {
    await page.locator('button[title="Edit HTML source"]').click();
    await expect(page.getByRole("dialog", { name: "HTML source editor" })).toBeVisible();
    await expect(page.locator('textarea[aria-label="Document HTML source"]')).toHaveValue("<p></p>");
  });

  test("applying source HTML updates the document", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Source mode");

    await page.locator('button[title="Edit HTML source"]').click();
    const textarea = page.locator('textarea[aria-label="Document HTML source"]');
    await textarea.fill("<h2>Updated</h2><p>From source</p>");
    await page.locator('button:has-text("Apply")').click();

    await expect(page.getByRole("dialog", { name: "HTML source editor" })).not.toBeVisible();
    const html = await getEditorHtml(page);
    expect(html).toContain("<h2>Updated</h2>");
    expect(html).toContain("From source");
  });
});
