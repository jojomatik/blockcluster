const { test, expect } = require("@playwright/test");

test.use({ locale: "en-US" });

test("the container serves the working homepage", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure().errorText}`)
  );
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(
    process.env.SMOKE_TEST_URL || "http://127.0.0.1:8081/"
  );
  expect(response.status()).toBe(200);
  await expect(
    page.getByText("Total resource usage", { exact: true })
  ).toBeVisible();
  expect(errors).toEqual([]);
});
