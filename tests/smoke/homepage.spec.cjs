const { test, expect } = require("@playwright/test");

test.use({
  baseURL: "http://127.0.0.1:8081/",
  locale: "en-US",
});

test("the backend answers the version API", async ({ request }) => {
  const response = await request.get("/api/version");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ version: expect.any(String) });
});

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

  const response = await page.goto("/");
  expect(response.status()).toBe(200);
  await expect(
    page.getByText("Total resource usage", { exact: true })
  ).toBeVisible();
  // The heading renders before Socket.IO returns data. Wait for the chart to
  // draw resource usage so asynchronous backend and rendering failures surface.
  await expect(
    page.locator(".apexcharts-line-series .apexcharts-line").first()
  ).toHaveAttribute("d", /[0-9]/, { timeout: 15_000 });
  expect(errors).toEqual([]);
});

test("the backend answers the dependencies API", async ({ request }) => {
  const response = await request.get("/api/dependencies");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({
    dependencies: expect.arrayContaining([
      expect.objectContaining({
        name: "express",
        version: expect.stringMatching(/\S/),
        notice: expect.stringMatching(/\S/),
      }),
    ]),
  });
});

test("the container serves the about page with dependency notices", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto("/about");
  expect(response.status()).toBe(200);
  await expect(
    page.getByText("About blockcluster", { exact: true })
  ).toBeVisible();
  // Wait for notices, since the section titles render before the data loads.
  const backend = page.locator(".v-card").filter({
    has: page.getByText("Libraries used in the blockcluster-backend", {
      exact: true,
    }),
  });
  const frontend = page.locator(".v-card").filter({
    has: page.getByText("Libraries used in the blockcluster-frontend", {
      exact: true,
    }),
  });
  await expect(backend.getByRole("heading", { name: /^express\s/ })).toBeVisible();
  await expect(frontend.getByRole("heading", { name: /^vue\s/ })).toBeVisible();
  expect(errors).toEqual([]);
});
