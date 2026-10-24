const { test, expect } = require("@playwright/test");

test.use({
  baseURL: "http://127.0.0.1:8081/",
  locale: "en-US",
});

test("creates a Paper server through the UI and waits for the EULA message", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/");

  const serverName = `smoke-eula-${Date.now()}`;
  await page.getByRole("button", { name: "Create server" }).click();
  await page.getByLabel("Server directory name").fill(
    serverName
  );

  await page.locator(".v-dialog .v-select").click();
  // Pin the major version: a new major can require a newer Java runtime than
  // the image provides. Update this deliberately when bumping the Java runtimes.
  const availableVersion = page
    .locator(".v-menu__content.menuable__content__active .v-list-item")
    .filter({ hasText: /^\s*26\./ })
    .first();
  await expect(availableVersion).toBeVisible({ timeout: 30_000 });
  await availableVersion.click();
  await page.getByRole("button", { name: /^create$/i }).click();

  const serverLink = page.getByRole("link", {
    name: new RegExp(serverName),
  });
  await expect(serverLink).toBeVisible({ timeout: 30_000 });
  await serverLink.click();

  await expect(
    page.getByText(
      /You need to agree to the EULA in order to run the server\..*eula\.txt/i
    )
  ).toBeVisible({ timeout: 180_000 });
});
