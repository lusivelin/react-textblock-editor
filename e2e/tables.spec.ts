import { test, expect } from "@playwright/test";
import { openPlayground, getEditor, clearEditor, getEditorHtml } from "./helpers";

/**
 * Opens the table picker and inserts an (rows × cols) table.
 * GRID_COLS = 8, grid is row-major. Cell index = rowIndex * 8 + colIndex.
 * insertTable(2, 3) → clicks cell at index (2-1)*8 + (3-1) = 10.
 */
async function insertTable(
  page: Parameters<Parameters<typeof test>[1]>[0]["page"],
  rows = 2,
  cols = 2
) {
  const editor = getEditor(page);
  await editor.click();
  const insertBtn = page.locator('button[title="Insert table"]');
  await insertBtn.dispatchEvent("mousedown");
  await page.waitForSelector(".rtb-tbl-grid", { state: "visible" });
  const cellIndex = (rows - 1) * 8 + (cols - 1);
  const cells = page.locator(".rtb-tbl-cell");
  await cells.nth(cellIndex).dispatchEvent("mousedown");
}

test.describe("Tables", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("insert table button creates a table with <table>, <tr>, <th> and <td>", async ({ page }) => {
    // 2×2 table: row 0 = headers (<th>), row 1 = cells (<td>)
    await insertTable(page, 2, 2);
    const html = await getEditorHtml(page);
    expect(html).toContain("<table");
    expect(html).toContain("<tr");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  test("can type in multiple table cells by clicking each", async ({ page }) => {
    // 1×2 table: two header cells in the same row
    await insertTable(page, 1, 2);
    const editor = getEditor(page);
    const cells = editor.locator("th, td");
    // Type in first cell
    await cells.nth(0).click();
    await page.keyboard.type("Cell 1");
    // Click into second cell and type
    await cells.nth(1).click();
    await page.keyboard.type("Cell 2");
    const html = await getEditorHtml(page);
    expect(html).toContain("Cell 1");
    expect(html).toContain("Cell 2");
  });

  test("table toolbar shows when cursor is inside table", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    const firstCell = editor.locator("th, td").first();
    await firstCell.click();
    await expect(page.locator(".rtb-table-popup")).toBeVisible();
  });

  test("table renders with header row and data rows", async ({ page }) => {
    await insertTable(page, 2, 2);
    const html = await getEditorHtml(page);
    expect(html).toContain("<table");
    expect(html).toContain("<th");
    expect(html).toContain("<td");
  });

  test("typing in table cells is reflected in HTML", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    const firstCell = editor.locator("th, td").first();
    await firstCell.click();
    await page.keyboard.type("Row 1 Col 1");
    const html = await getEditorHtml(page);
    expect(html).toContain("Row 1 Col 1");
  });
});

test.describe("Table toolbar actions", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("Add row below inserts a new <tr>", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    await editor.locator("th, td").first().click();
    await page.locator('button[title="Add row below"]').dispatchEvent("mousedown");
    const html = await getEditorHtml(page);
    const trMatches = html.match(/<tr/g);
    expect(trMatches?.length).toBeGreaterThanOrEqual(3);
  });

  test("Add row above inserts a new <tr> before current", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    await editor.locator("td").first().click();
    await page.locator('button[title="Add row above"]').dispatchEvent("mousedown");
    const html = await getEditorHtml(page);
    const trMatches = html.match(/<tr/g);
    expect(trMatches?.length).toBeGreaterThanOrEqual(3);
  });

  test("Delete row removes a <tr>", async ({ page }) => {
    await insertTable(page, 3, 2);
    const editor = getEditor(page);
    await editor.locator("td").first().click();
    const trsBefore = (await getEditorHtml(page)).match(/<tr/g)?.length ?? 0;
    await page.locator('button[title="Delete row"]').dispatchEvent("mousedown");
    const trsAfter = (await getEditorHtml(page)).match(/<tr/g)?.length ?? 0;
    expect(trsAfter).toBeLessThan(trsBefore);
  });

  test("Add column right inserts a new column", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    await editor.locator("th, td").first().click();
    const colsBefore = (await getEditorHtml(page)).match(/<th|<td/g)?.length ?? 0;
    await page.locator('button[title="Add column right"]').dispatchEvent("mousedown");
    const colsAfter = (await getEditorHtml(page)).match(/<th|<td/g)?.length ?? 0;
    expect(colsAfter).toBeGreaterThan(colsBefore);
  });

  test("Delete column removes a column", async ({ page }) => {
    await insertTable(page, 2, 3);
    const editor = getEditor(page);
    await editor.locator("th, td").first().click();
    const colsBefore = (await getEditorHtml(page)).match(/<th|<td/g)?.length ?? 0;
    await page.locator('button[title="Delete column"]').dispatchEvent("mousedown");
    const colsAfter = (await getEditorHtml(page)).match(/<th|<td/g)?.length ?? 0;
    expect(colsAfter).toBeLessThan(colsBefore);
  });

  test("Delete table removes the entire table", async ({ page }) => {
    await insertTable(page, 2, 2);
    const editor = getEditor(page);
    await editor.locator("th, td").first().click();
    await page.locator('button[title="Delete table"]').dispatchEvent("mousedown");
    const html = await getEditorHtml(page);
    expect(html).not.toContain("<table");
  });
});
