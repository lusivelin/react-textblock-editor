import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, getEditorHtml } from "./helpers";

test.describe("Image toolbar – upload button", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("Upload image button is present in the toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Upload image"]')).toBeVisible();
  });

  test("Clicking upload button does not open any dropdown or popover", async ({ page }) => {
    await page.locator('button[title="Upload image"]').dispatchEvent("mousedown");
    await page.waitForTimeout(150);
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
  });

  test("uploading a file inserts an <img> into the editor", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    const fileInput = page.locator('input[type="file"][accept="image/*"]');
    await fileInput.setInputFiles({
      name: "test.png",
      mimeType: "image/png",
      buffer: Buffer.from(
        "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489" +
        "0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082",
        "hex"
      ),
    });
    await page.waitForTimeout(1200);
    const html = await editor.innerHTML();
    expect(html).toContain("<img");
  });
});

test.describe("Image toolbar – URL insertion popover", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("URL button is present in the toolbar", async ({ page }) => {
    await expect(page.locator('button[title="Insert image from URL"]')).toBeVisible();
  });

  test("clicking URL button opens the URL popover", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).toBeVisible();
  });

  test("URL popover contains URL, alt text, and title inputs", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    const popover = page.locator(".rtb-image-url-popover");
    await expect(popover.locator('input[type="url"]')).toBeVisible();
    await expect(popover.locator('input[placeholder="Describe the image"]')).toBeVisible();
    await expect(popover.locator('input[placeholder="Tooltip text"]')).toBeVisible();
  });

  test("popover closes on Escape", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
  });

  test("popover closes on Cancel", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover button:has-text('Cancel')").dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
  });

  test("shows error for empty URL submission", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover button:has-text('Insert')").dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).toBeVisible();
  });

  test("shows error for invalid URL", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover input[type='url']").fill("not-a-url");
    await page.locator(".rtb-image-url-popover button:has-text('Insert')").dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).toBeVisible();
  });

  test("inserts image from valid URL and closes popover", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover input[type='url']").fill("https://picsum.photos/200/100");
    await page.locator(".rtb-image-url-popover button:has-text('Insert')").dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
    const html = await getEditorHtml(page);
    expect(html).toContain("<img");
    expect(html).toContain("picsum.photos");
  });

  test("alt text is applied to inserted image", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover input[placeholder='Describe the image']").fill("A scenic photo");
    await page.locator(".rtb-image-url-popover input[type='url']").fill("https://picsum.photos/200/100");
    await page.locator(".rtb-image-url-popover button:has-text('Insert')").dispatchEvent("mousedown");
    const html = await getEditorHtml(page);
    expect(html).toContain('alt="A scenic photo"');
  });

  test("Enter key in URL input submits the form", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await page.locator(".rtb-image-url-popover input[type='url']").fill("https://picsum.photos/200/100");
    await page.locator(".rtb-image-url-popover input[type='url']").press("Enter");
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
    const html = await getEditorHtml(page);
    expect(html).toContain("<img");
  });

  test("toggling the URL button closes an open popover", async ({ page }) => {
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).toBeVisible();
    await page.locator('button[title="Insert image from URL"]').dispatchEvent("mousedown");
    await expect(page.locator(".rtb-image-url-popover")).not.toBeVisible();
  });
});
