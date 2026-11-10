import {
  expect,
  takeSnapshot as chromaticSnapshot,
  test as base,
} from "@chromatic-com/playwright";
import type { Page, TestInfo } from "@playwright/test";

export { expect } from "@chromatic-com/playwright";

export async function takeSnapshot(
  page: Page,
  name: string,
  testInfo: TestInfo,
) {
  const logo = page.getByRole("img", {
    name: "blockcluster Icon",
    exact: true,
  });
  await expect(logo).toBeVisible();
  await expect
    .poll(() =>
      logo.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      ),
    )
    .toBe(true);

  await chromaticSnapshot(page, name, testInfo);
}

// Vuetify inlines its styles in dev mode, which exceeds unhead's default critical CSS budget. Not relevant for this app.
const allowedMessages = [/^\[unhead\] Inline <style> is [\d.]+KB/];

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (
        (message.type() === "error" || message.type() === "warning") &&
        !allowedMessages.some((pattern) => pattern.test(message.text()))
      ) {
        errors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await use(page);
    expect(errors).toEqual([]);
  },
});
