import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, getEditorHtml } from "./helpers";

test.describe("Bullet list", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("bullet list toolbar button creates a <ul>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Item one");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    const html = await getEditorHtml(page);
    expect(html).toContain("<ul");
    expect(html).toContain("<li");
  });

  test("Enter in list item creates a new bullet", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Item one");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Item two");
    const html = await getEditorHtml(page);
    const liMatches = html.match(/<li/g);
    expect(liMatches).not.toBeNull();
    expect(liMatches!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Item two");
  });

  test("Enter on empty list item exits the list and creates paragraph", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Item");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    // Now in empty new list item
    await page.keyboard.press("Enter");
    // Should have exited the list
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<\/ul>\s*<p>/);
  });

  test("Backspace on empty list item (only item) exits to paragraph", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    // Create a list item, then clear it
    await page.keyboard.type("X");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Backspace"); // delete "X"
    // Now in empty single list item - one more Backspace should exit
    await page.keyboard.press("Backspace");
    const html = await getEditorHtml(page);
    expect(html).not.toContain("<ul");
  });

  test("Tab indents a list item", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Parent");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Child");
    await page.keyboard.press("Tab");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<ul[\s\S]*?<ul/);
  });

  test("Shift+Tab de-indents a nested list item", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Parent");
    const bulletBtn = page.locator('button[title*="Bullet"]').first();
    await bulletBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Child");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    const html = await getEditorHtml(page);
    const nestedUl = html.match(/<ul[\s\S]*?<ul/);
    expect(nestedUl).toBeNull();
  });
});

test.describe("Ordered list", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("ordered list toolbar button creates a <ol>", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Step one");
    const orderedBtn = page.locator('button[title*="Ordered"]').first();
    await orderedBtn.click();
    const html = await getEditorHtml(page);
    expect(html).toContain("<ol");
    expect(html).toContain("<li");
  });

  test("Enter in ordered list creates a new numbered item", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Step one");
    const orderedBtn = page.locator('button[title*="Ordered"]').first();
    await orderedBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Step two");
    const html = await getEditorHtml(page);
    const liMatches = html.match(/<li/g);
    expect(liMatches!.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain("Step two");
  });

  test("Enter on empty ordered item exits the list", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Only item");
    const orderedBtn = page.locator('button[title*="Ordered"]').first();
    await orderedBtn.click();
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Enter");
    const html = await getEditorHtml(page);
    expect(html).toMatch(/<\/ol>\s*<p>/);
  });
});
