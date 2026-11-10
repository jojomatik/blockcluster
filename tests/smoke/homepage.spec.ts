import { expect, takeSnapshot, test } from "./fixtures";

test("The backend answers the version API", async ({ request }) => {
  const response = await request.get("/api/version");
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("application/json");
  expect(await response.json()).toEqual({ version: expect.any(String) });
});

test("The container serves the working homepage", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("requestfailed", (request) =>
    errors.push(`${request.url()}: ${request.failure()?.errorText}`),
  );
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText("Total resource usage", { exact: true }),
  ).toBeVisible();
  // The heading renders before Socket.IO returns data. Wait for the chart to
  // draw resource usage so asynchronous backend and rendering failures surface.
  await expect(
    page.locator(".apexcharts-line-series .apexcharts-line").first(),
  ).toHaveAttribute("d", /[0-9]/, { timeout: 15_000 });
  // CPU and memory values and the time axis differ on every run, so Chromatic must not diff the chart.
  await page
    .locator(".apexcharts-canvas")
    .evaluate((chart) => chart.setAttribute("data-chromatic", "ignore"));
  await takeSnapshot(page, "Homepage - chart drawn", testInfo);
  expect(errors).toEqual([]);
});

test.describe("SSR", () => {
  test.use({ javaScriptEnabled: false });

  test("The homepage shows its title below the app bar and a chart placeholder", async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    const title = page.getByText("Total resource usage", { exact: true });
    await expect(title).toBeVisible();
    await expect(
      page.locator(".v-card .v-skeleton-loader").first(),
    ).toBeVisible();

    const appBar = await page.locator(".v-app-bar").boundingBox();
    const titleBox = await title.boundingBox();
    expect(appBar).not.toBeNull();
    expect(titleBox).not.toBeNull();
    expect(titleBox!.y).toBeGreaterThanOrEqual(appBar!.y + appBar!.height);
    await takeSnapshot(page, "Homepage - Ressource usage rendered", testInfo);
  });
});

test("The container serves the about page with dependency notices", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto("/about");
  expect(response?.status()).toBe(200);
  await expect(
    page.getByText("About blockcluster", { exact: true }),
  ).toBeVisible();
  // Wait for notices, since the section titles render before the data loads.
  const libraries = page.locator(".v-card").filter({
    has: page.getByText("Libraries", { exact: true }),
  });
  await expect(
    libraries.getByRole("heading", { name: /^nuxt\s/ }),
  ).toBeVisible();
  await expect(page.locator(".project-notice h5 code")).toBeVisible();
  await takeSnapshot(page, "About - Notices loaded", testInfo);
  expect(errors).toEqual([]);
});
