import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, takeSnapshot, test } from "./fixtures";

// Set SMOKE_LOCAL=1 to skip `docker exec` and inspect the servers directory of a locally running app instead.
const local = ["1", "true"].includes(process.env.SMOKE_LOCAL ?? "");
const container = process.env.SMOKE_CONTAINER || "blockcluster-smoke";
const serversPath = local
  ? resolve(process.env.SMOKE_SERVERS_PATH || "../../servers")
  : "/usr/games/blockcluster/servers";
const customPort = 25570;
// Pin the major version: a new major can require a newer Java runtime than
// the environment provides. Update this deliberately when bumping the Java runtimes.
const paperMajor = process.env.SMOKE_PAPER_MAJOR || "26";

function listDirectory(path: string): string[] {
  return local
    ? readdirSync(path)
    : execFileSync("docker", ["exec", container, "ls", "-A", path], {
        encoding: "utf8",
      })
        .split("\n")
        .filter(Boolean);
}

function readFile(path: string): string {
  return local
    ? readFileSync(path, "utf8")
    : execFileSync("docker", ["exec", container, "cat", path], {
        encoding: "utf8",
      });
}

test("Accepts the EULA through the UI and starts a Paper server", async ({
  page,
}, testInfo) => {
  test.setTimeout(240_000);
  await page.goto("/");

  const serverName = `smoke-eula-${Date.now()}`;
  // Clicks before hydration has attached the handler are lost, so retry until the dialog opens.
  await expect(async () => {
    await page.getByRole("button", { name: "Create server" }).click();
    await expect(page.getByLabel("Server directory name")).toBeVisible({
      timeout: 2_000,
    });
  }).toPass({ timeout: 30_000 });
  await page.getByLabel("Server directory name").fill(serverName);
  await page.getByLabel("Port").fill(String(customPort));

  await page.locator(".v-dialog .v-select").click();
  const availableVersion = page
    .getByRole("option", { name: new RegExp(`^${paperMajor}\\.`) })
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
      /You need to agree to the EULA in order to run the server\..*eula\.txt/i,
    ),
  ).toBeVisible({ timeout: 180_000 });

  const assertSnapshotContent = async () => {
    const name = page.locator(".server .server-name");
    await expect(name).toHaveText(serverName);
    const executable = page.locator(".server .server-executable-name");
    await expect(executable).toBeVisible();
  };
  const takeServerSnapshot = async (name: string) => {
    await assertSnapshotContent();
    await takeSnapshot(page, name, testInfo);
  };

  await expect(page.getByText("Stopped", { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });
  await takeServerSnapshot("Server - EULA Required");

  const eulaDialog = page.getByRole("dialog");
  await expect(eulaDialog).toBeVisible();
  await expect(
    eulaDialog.getByRole("link", { name: "Read the Minecraft EULA" }),
  ).toHaveAttribute("href", "https://www.minecraft.net/en-us/eula");

  const startButton = eulaDialog.getByRole("button", {
    name: "Start server",
  });
  await expect(startButton).toBeDisabled();
  // Vuetify overlays the native input, so toggle the checkbox through its label.
  await eulaDialog.getByText("I agree to the Minecraft EULA").click();
  await expect(
    eulaDialog.getByRole("checkbox", { name: "I agree to the Minecraft EULA" }),
  ).toBeChecked();

  await takeServerSnapshot("Server - EULA Dialog Accepted");

  await startButton.click();

  await expect(page.getByText("Started", { exact: true }).first()).toBeVisible({
    timeout: 180_000,
  });

  await takeServerSnapshot("Server - Server Started");

  // Stop the server so the Java process exits cleanly.
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await expect(page.getByText("Stopped", { exact: true }).first()).toBeVisible({
    timeout: 60_000,
  });

  await takeServerSnapshot("Server - Server Stopped");

  const serverDirectory = `${serversPath}/${serverName}`;
  const files = listDirectory(serverDirectory);
  expect(files).toEqual(
    expect.arrayContaining([
      "eula.txt",
      "server.properties",
      "bukkit.yml",
      "spigot.yml",
      "config",
      "logs",
      "world",
    ]),
  );
  expect(files.some((file) => /^paper-.*\.jar$/.test(file))).toBe(true);
  expect(readFile(`${serverDirectory}/eula.txt`)).toMatch(/^eula=true$/m);
  expect(readFile(`${serverDirectory}/server.properties`)).toMatch(
    new RegExp(`^server-port=${customPort}$`, "m"),
  );
  expect(listDirectory(`${serverDirectory}/logs`)).toContain("latest.log");
});
