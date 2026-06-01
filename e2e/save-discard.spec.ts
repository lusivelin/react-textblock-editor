import { test, expect } from "@playwright/test";
import {
  openPlayground,
  getEditor,
  clearEditor,
  getStatusBar,
  getStatusBarSaveBtn,
  getStatusBarDiscardBtn,
  waitForDemoSave,
} from "./helpers";

test.describe("Status bar – unsaved changes indicator", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("status bar is present in the editor", async ({ page }) => {
    await expect(getStatusBar(page)).toBeVisible();
  });

  test("shows Unsaved changes after typing", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Draft text");
    await expect(getStatusBar(page)).toContainText("Unsaved changes");
  });

  test("does not show Unsaved changes before any edit", async ({ page }) => {
    await expect(getStatusBar(page)).not.toContainText("Unsaved changes");
  });
});

test.describe("Status bar – Save button", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("Save button appears when there are unsaved changes", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Needs saving");
    await expect(getStatusBarSaveBtn(page)).toBeVisible();
  });

  test("Save button triggers save and updates preview", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("StatusBar save test");
    await getStatusBarSaveBtn(page).click();
    await waitForDemoSave(page);
    // Status bar shows Saved
    await expect(getStatusBar(page)).toContainText("Saved");
    // Preview panel reflects saved content
    const preview = page.locator(".demo-side").first();
    await expect(preview).toContainText("StatusBar save test");
  });

  test("Save button disappears after successful save", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Save and gone");
    await getStatusBarSaveBtn(page).click();
    await waitForDemoSave(page);
    // Unsaved changes state cleared
    await expect(getStatusBar(page)).not.toContainText("Unsaved changes");
    await expect(getStatusBarSaveBtn(page)).not.toBeVisible();
  });

  test("Ctrl+S also saves and clears unsaved indicator", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Keyboard save");
    await page.keyboard.press("Control+s");
    await waitForDemoSave(page);
    await expect(getStatusBar(page)).toContainText("Saved");
    await expect(getStatusBar(page)).not.toContainText("Unsaved changes");
  });
});

test.describe("Status bar – Discard button", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("Discard button appears alongside Save when there are unsaved changes", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Will be discarded");
    await expect(getStatusBarDiscardBtn(page)).toBeVisible();
    await expect(getStatusBarSaveBtn(page)).toBeVisible();
  });

  test("Discard button reverts editor to saved content", async ({ page }) => {
    const editor = getEditor(page);

    // Type and save first so we have a known saved state
    await editor.click();
    await page.keyboard.type("Saved baseline");
    await page.keyboard.press("Control+s");
    await waitForDemoSave(page);

    // Type unsaved addition
    await editor.click();
    await page.keyboard.type(" plus unsaved");
    await expect(getStatusBar(page)).toContainText("Unsaved changes");
    await expect(editor).toContainText("plus unsaved");

    // Discard
    await getStatusBarDiscardBtn(page).click();

    // Unsaved text gone, saved baseline restored
    await expect(editor).not.toContainText("plus unsaved");
    await expect(editor).toContainText("Saved baseline");
  });

  test("Discard clears the unsaved changes indicator", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Discard me");
    await expect(getStatusBar(page)).toContainText("Unsaved changes");

    await getStatusBarDiscardBtn(page).click();

    await expect(getStatusBar(page)).not.toContainText("Unsaved changes");
    await expect(getStatusBarDiscardBtn(page)).not.toBeVisible();
    await expect(getStatusBarSaveBtn(page)).not.toBeVisible();
  });

  test("Discard syncs the live HTML panel in the demo", async ({ page }) => {
    const editor = getEditor(page);
    // Type and save to establish a baseline
    await editor.click();
    await page.keyboard.type("Synced baseline");
    await page.keyboard.press("Control+s");
    await waitForDemoSave(page);

    // Unsaved change
    await editor.click();
    await page.keyboard.type(" unsaved");
    const livePanel = page.locator("pre").first();
    await expect(livePanel).toContainText("unsaved");

    // Discard — onDiscard in the demo resets draftContent
    await getStatusBarDiscardBtn(page).click();
    await expect(livePanel).not.toContainText("unsaved");
  });
});

test.describe("Save status transitions", () => {
  test.beforeEach(async ({ page }) => {
    await openPlayground(page);
    await clearEditor(page);
  });

  test("status bar shows Saving… during save", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Watch saving state");
    await getStatusBarSaveBtn(page).click();
    // Immediately check for saving state before delay completes
    await expect(getStatusBar(page)).toContainText("Saving…");
  });

  test("status bar shows Saved after save completes", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Post save check");
    await getStatusBarSaveBtn(page).click();
    await waitForDemoSave(page);
    await expect(getStatusBar(page)).toContainText("Saved");
  });

  test("status returns to idle after saved indicator fades", async ({ page }) => {
    const editor = getEditor(page);
    await editor.click();
    await page.keyboard.type("Idle after save");
    await page.keyboard.press("Control+s");
    // Saved state shows for ~2s then returns to idle
    await waitForDemoSave(page);
    await expect(getStatusBar(page)).toContainText("Saved");
    // After 2s the lib resets to idle
    await page.waitForTimeout(2500);
    await expect(getStatusBar(page)).not.toContainText("Saved");
    await expect(getStatusBar(page)).not.toContainText("Unsaved changes");
  });
});
