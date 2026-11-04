import fs from "node:fs";
import path from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { eq } from "drizzle-orm";
import { migrationMarkers } from "./schema";

const migrationStateTable = "blockcluster_migrations";

export interface MigrationStep {
  version: string;
  sqlFile: string;
  customStep?: (database: ReturnType<typeof drizzle>) => Promise<void>;
}

function readMigrationSql(sqlFile: string): string {
  return fs.readFileSync(
    path.resolve(process.cwd(), "drizzle", sqlFile),
    "utf8",
  );
}

function escapeSqlString(value: string): string {
  return value.replace(/'/g, "''");
}

export function getMigrationPlan(): MigrationStep[] {
  return [
    {
      version: "0000_initial",
      sqlFile: "0000_initial.sql",
    },
    {
      version: "0001_manual_cleanup",
      sqlFile: "0001_manual_cleanup.sql",
      customStep: async (database) => {
        await database
          .insert(migrationMarkers)
          .values({ name: "legacy-port-cleanup" })
          .onConflictDoNothing();
      },
    },
  ];
}

export async function runMigrations(
  client: PGlite,
  migrations: MigrationStep[] = getMigrationPlan(),
): Promise<void> {
  const database = drizzle(client);
  await client.exec(
    `CREATE TABLE IF NOT EXISTS ${migrationStateTable} (version TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`,
  );
  const appliedRows = await client.query<{ version: string }>(
    `SELECT version FROM ${migrationStateTable}`,
  );
  const applied = new Set(appliedRows.rows.map(({ version }) => version));

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;

    await client.exec("BEGIN");
    try {
      await client.exec(readMigrationSql(migration.sqlFile));
      if (migration.customStep) await migration.customStep(database);
      await client.exec(
        `INSERT INTO ${migrationStateTable} (version) VALUES ('${escapeSqlString(migration.version)}')`,
      );
      await client.exec("COMMIT");
    } catch (error) {
      await client.exec("ROLLBACK");
      throw new Error(
        `Failed to apply migration ${migration.version}: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }
}

export async function hasMigrationMarker(
  database: ReturnType<typeof drizzle>,
  markerName: string,
): Promise<boolean> {
  const rows = await database
    .select({ name: migrationMarkers.name })
    .from(migrationMarkers)
    .where(eq(migrationMarkers.name, markerName))
    .limit(1);
  return rows.length > 0;
}
