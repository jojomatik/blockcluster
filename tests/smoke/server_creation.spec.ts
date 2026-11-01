import { execFileSync } from "node:child_process";
import { expect, test } from "./fixtures";

const container = process.env.SMOKE_CONTAINER || "blockcluster-smoke";
const serversPath = "/usr/games/blockcluster/servers";
const customPort = 25570;

function inContainer(...command: string[]): string {
  return execFileSync("docker", ["exec", container, ...command], {
    encoding: "utf8",
  });
}

test("accepts the EULA through the UI and starts a Paper server", async ({
  page,
}) => {
  test.setTimeout(240_000);
  await page.goto("/");

  const serverName = `smoke-eula-${Date.now()}`;
  await page.getByRole("button", { name: "Create server" }).click();
  await page.getByLabel("Server directory name").fill(serverName);
  await page.getByLabel("Port").fill(String(customPort));

  await page.locator(".v-dialog .v-select").click();
  // Pin the major version: a new major can require a newer Java runtime than
  // the image provides. Update this deliberately when bumping the Java runtimes.
  const availableVersion = page.getByRole("option", { name: /^26\./ }).first();
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

  const eulaDialog = page.getByRole("dialog");
  await expect(eulaDialog).toBeVisible();
  await expect(
    eulaDialog.getByRole("link", { name: "Read the Minecraft EULA" })
  ).toHaveAttribute("href", "https://www.minecraft.net/en-us/eula");

  const startButton = eulaDialog.getByRole("button", {
    name: "Start server",
  });
  await expect(startButton).toBeDisabled();
  // Vuetify overlays the native input, so toggle the checkbox through its label.
  await eulaDialog.getByText("I agree to the Minecraft EULA").click();
  await expect(
    eulaDialog.getByRole("checkbox", { name: "I agree to the Minecraft EULA" })
  ).toBeChecked();
  await startButton.click();

  await expect(page.getByText("Started", { exact: true }).first()).toBeVisible({
    timeout: 180_000,
  });

  // Stop the server so the Java process exits cleanly.
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText("Stopped", { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });

  const serverDirectory = `${serversPath}/${serverName}`;
  const files = inContainer("ls", "-A", serverDirectory).split("\n");
  expect(files).toEqual(
    expect.arrayContaining([
      "eula.txt",
      "server.properties",
      "bukkit.yml",
      "spigot.yml",
      "config",
      "logs",
      "world",
    ])
  );
  expect(files.some((file) => /^paper-.*\.jar$/.test(file))).toBe(true);
  expect(inContainer("cat", `${serverDirectory}/eula.txt`)).toMatch(
    /^eula=true$/m
  );
  expect(inContainer("cat", `${serverDirectory}/server.properties`)).toMatch(
    new RegExp(`^server-port=${customPort}$`, "m")
  );
  expect(inContainer("ls", `${serverDirectory}/logs`)).toContain("latest.log");
});
