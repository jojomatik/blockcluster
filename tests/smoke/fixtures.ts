import { expect, test as base } from "@playwright/test";

export { expect };

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error" || message.type() === "warning") {
        errors.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => errors.push(error.message));

    await use(page);
    expect(errors).toEqual([]);
  },
});
