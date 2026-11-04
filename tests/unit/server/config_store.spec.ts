import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import {
  closeConfigStore,
  getServerConfig,
  initializeConfigStore,
  upsertServerConfig,
} from "../../../server/db/config_store";
import {
  getMigrationPlan,
  hasMigrationMarker,
  runMigrations,
  type MigrationStep,
} from "../../../server/db/migrations";

function createBasePath(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "blockcluster-config-store-"));
}

afterEach(async () => {
  await closeConfigStore();
});

describe("config store bootstrap", () => {
  it("imports legacy config on first start and deletes legacy files", async () => {
    const basePath = createBasePath();
    const serverPath = path.join(basePath, "legacy-server");
    fs.mkdirSync(serverPath);
    fs.writeFileSync(
      path.join(serverPath, "blockcluster.cfg"),
      JSON.stringify({
        creationPort: 25577,
        flags: ["-Xmx2G"],
        autostart: true,
        pauseOnIdle: { enable: true, timeout: 45 },
        javaPath: "/java/custom",
      }),
    );

    await initializeConfigStore(basePath);

    expect(fs.existsSync(path.join(serverPath, "blockcluster.cfg"))).toBe(
      false,
    );
    expect(await getServerConfig("legacy-server")).toEqual({
      creationPort: 25577,
      flags: ["-Xmx2G"],
      autostart: true,
      pauseOnIdle: { enable: true, timeout: 45 },
      javaPath: "/java/custom",
    });
  }, 15000);

  it("is idempotent across restarts", async () => {
    const basePath = createBasePath();
    fs.mkdirSync(path.join(basePath, "srv"));

    await initializeConfigStore(basePath);
    await upsertServerConfig("srv", {
      creationPort: 29999,
      flags: ["-Xmx1G"],
      autostart: false,
      pauseOnIdle: { enable: false, timeout: 300 },
      javaPath: null,
    });
    await closeConfigStore();

    await initializeConfigStore(basePath);

    expect(await getServerConfig("srv")).toEqual({
      creationPort: 29999,
      flags: ["-Xmx1G"],
      autostart: false,
      pauseOnIdle: { enable: false, timeout: 300 },
      javaPath: null,
    });
  }, 15000);
});

describe("migration runner", () => {
  it("upgrades from an older schema version", async () => {
    const dbPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "blockcluster-migrations-"),
    );
    const client = new PGlite(dbPath);
    const plan = getMigrationPlan();

    await runMigrations(client, [plan[0] as MigrationStep]);
    await runMigrations(client, plan);

    const applied = await client.query<{ version: string }>(
      "SELECT version FROM blockcluster_migrations ORDER BY version",
    );
    expect(applied.rows.map((row) => row.version)).toEqual([
      "0000_initial",
      "0001_manual_cleanup",
    ]);

    await client.close();
  }, 15000);

  it("rolls back failed migrations", async () => {
    const dbPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "blockcluster-migrations-rollback-"),
    );
    const client = new PGlite(dbPath);
    const plan = getMigrationPlan();
    const brokenPlan: MigrationStep[] = [
      plan[0] as MigrationStep,
      {
        version: "0001_broken",
        sqlFile: "0001_manual_cleanup.sql",
        customStep: async () => {
          throw new Error("boom");
        },
      },
    ];

    await expect(runMigrations(client, brokenPlan)).rejects.toThrow(
      "Failed to apply migration 0001_broken",
    );

    const applied = await client.query<{ version: string }>(
      "SELECT version FROM blockcluster_migrations ORDER BY version",
    );
    expect(applied.rows.map((row) => row.version)).toEqual(["0000_initial"]);

    const markerTable = await client.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'migration_markers'",
    );
    expect(markerTable.rows).toHaveLength(0);

    await client.close();
  }, 15000);

  it("runs custom/manual migration steps", async () => {
    const dbPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "blockcluster-migrations-manual-step-"),
    );
    const client = new PGlite(dbPath);

    await runMigrations(client);

    const database = drizzle(client);
    expect(await hasMigrationMarker(database, "legacy-port-cleanup")).toBe(
      true,
    );

    await client.close();
  }, 15000);
});
