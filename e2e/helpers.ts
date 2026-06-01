import type { Page, Locator } from "@playwright/test";

export async function openPlayground(page: Page) {
  await page.goto("/");
  // Ensure we're on the Playground tab
  const playgroundTab = page.locator('[role="tab"]', { hasText: "Playground" });
  if (await playgroundTab.count()) await playgroundTab.click();
  await page.waitForSelector(".ProseMirror", { state: "visible" });
}

export function getEditor(page: Page): Locator {
  return page.locator(".ProseMirror");
}

/** Click into editor and clear all content, leaving an empty paragraph. */
export async function clearEditor(page: Page) {
  const editor = getEditor(page);
  await editor.click();
  await page.keyboard.press("Control+a");
  await page.keyboard.press("Delete");
}

/** Click toolbar button by title attribute. */
export async function clickToolbarButton(page: Page, title: string) {
  await page.locator(`button[title="${title}"]`).click();
}

/** Get current editor inner HTML. */
export async function getEditorHtml(page: Page): Promise<string> {
  return getEditor(page).innerHTML();
}

/** Get the status bar element. */
export function getStatusBar(page: Page): Locator {
  return page.locator(".rtb-status-bar");
}

/** Get Save button inside the status bar. */
export function getStatusBarSaveBtn(page: Page): Locator {
  return page.locator(".rtb-status-action-btn:not(.rtb-status-action-btn--discard)");
}

/** Get Discard button inside the status bar. */
export function getStatusBarDiscardBtn(page: Page): Locator {
  return page.locator(".rtb-status-action-btn--discard");
}

/** Wait for the demo's simulated save delay (400 ms) plus a small buffer. */
export async function waitForDemoSave(page: Page) {
  await page.waitForTimeout(600);
}
