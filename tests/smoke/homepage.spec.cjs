const { test, expect } = require("@playwright/test");

test.use({
  baseURL: process.env.SMOKE_TEST_URL || "http://127.0.0.1:8081/",
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

test("opens a configured server and refreshes its status", async ({
  page,
  request,
}) => {
  test.setTimeout(150_000);
  const serverName = process.env.SMOKE_SERVER_NAME || "paper-smoke";
  const serverResponse = await request.get(
    `/api/servers/${encodeURIComponent(serverName)}`
  );
  expect(serverResponse.status()).toBe(200);
  const server = await serverResponse.json();
  expect(server._jar).toMatch(/\.jar$/);

  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("requestfailed", (failedRequest) =>
    errors.push(`${failedRequest.url()}: ${failedRequest.failure().errorText}`)
  );

  const homeResponse = await page.goto("/");
  expect(homeResponse.status()).toBe(200);
  const serverCard = page.locator(".server").filter({ hasText: serverName });
  await expect(serverCard).toBeVisible();

  const detailPath = `/api/servers/${encodeURIComponent(serverName)}`;
  const detailResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === detailPath &&
      response.request().method() === "GET"
  );
  await serverCard.getByRole("link", { name: "Details" }).click();
  expect((await detailResponsePromise).status()).toBe(200);

  await expect(page.getByText(serverName, { exact: false })).toBeVisible();
  await expect(page.getByText(server._jar, { exact: true })).toBeVisible();
  await expect(page.getByText("Console", { exact: true })).toBeVisible();

  const startResponse = await request.post(
    `/api/servers/${encodeURIComponent(serverName)}/actions`,
    { data: { action: "start" } }
  );
  expect(startResponse.status()).toBe(202);
  await expect
    .poll(
      async () => {
        let messagesResponse;
        try {
          messagesResponse = await request.get(
            `/api/servers/${encodeURIComponent(serverName)}/messages`
          );
        } catch {
          return "";
        }
        if (messagesResponse.status() !== 200) return "";
        const messages = await messagesResponse.json();
        const eulaMessage = messages.find((message) =>
          /agree to the EULA/i.test(message.text || message._text || "")
        );
        return eulaMessage?.text || eulaMessage?._text || "";
      },
      { timeout: 120_000, intervals: [1_000, 2_000, 5_000] }
    )
    .toMatch(/EULA/i);

  const refreshResponsePromise = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === detailPath &&
      response.request().method() === "GET"
  );
  await page.getByRole("button", { name: "Update Status" }).click();
  expect((await refreshResponsePromise).status()).toBe(200);
  expect(errors).toEqual([]);
});
