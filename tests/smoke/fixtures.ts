import { expect, test as base } from "@playwright/test";

export { expect };

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
