import fs from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { runMigrations } from "./migrations";
import { serverConfigs } from "./schema";

export interface PersistedServerConfig {
  creationPort?: number;
  flags: string[];
  autostart: boolean;
  pauseOnIdle: {
    enable: boolean;
    timeout: number;
  };
  javaPath: string | null;
}

const defaultConfig: PersistedServerConfig = {
  flags: [],
  autostart: false,
  pauseOnIdle: {
    enable: false,
    timeout: 300,
  },
  javaPath: null,
};

let client: PGlite | undefined;
let database: ReturnType<typeof drizzle> | undefined;
let initializedPath: string | undefined;

function getDbPath(basePath: string): string {
  return path.join(basePath, ".blockcluster-db");
}

function toPersistedServerConfig(
  row: typeof serverConfigs.$inferSelect | undefined,
): PersistedServerConfig {
  if (!row)
    return { ...defaultConfig, pauseOnIdle: { ...defaultConfig.pauseOnIdle } };
  return {
    creationPort: row.creationPort ?? undefined,
    flags: Array.isArray(row.flags)
      ? row.flags.filter((entry): entry is string => typeof entry === "string")
      : [],
    autostart: row.autostart,
    pauseOnIdle: {
      enable: row.pauseOnIdleEnable,
      timeout: row.pauseOnIdleTimeout,
    },
    javaPath: row.javaPath ?? null,
  };
}

function toRow(serverName: string, config: PersistedServerConfig) {
  return {
    serverName,
    creationPort: config.creationPort,
    flags: config.flags,
    autostart: config.autostart,
    pauseOnIdleEnable: config.pauseOnIdle.enable,
    pauseOnIdleTimeout: config.pauseOnIdle.timeout,
    javaPath: config.javaPath,
    updatedAt: new Date(),
  };
}

function parseLegacyConfig(content: string): PersistedServerConfig {
  const parsed = JSON.parse(content) as {
    creationPort?: unknown;
    port?: unknown;
    flags?: unknown;
    autostart?: unknown;
    pauseOnIdle?: { enable?: unknown; timeout?: unknown };
    javaPath?: unknown;
  };
  const configuredPort =
    typeof parsed.creationPort === "number" &&
    Number.isInteger(parsed.creationPort)
      ? parsed.creationPort
      : typeof parsed.port === "number" && Number.isInteger(parsed.port)
        ? parsed.port
        : undefined;
  const timeout = parsed.pauseOnIdle?.timeout;
  return {
    creationPort: configuredPort,
    flags: Array.isArray(parsed.flags)
      ? parsed.flags.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    autostart: parsed.autostart === true,
    pauseOnIdle: {
      enable: parsed.pauseOnIdle?.enable === true,
      timeout:
        typeof timeout === "number" && Number.isFinite(timeout) ? timeout : 300,
    },
    javaPath: typeof parsed.javaPath === "string" ? parsed.javaPath : null,
  };
}

function findLegacyConfigFiles(
  basePath: string,
): Array<{ serverName: string; filePath: string }> {
  if (!fs.existsSync(basePath)) return [];

  const files: Array<{ serverName: string; filePath: string }> = [];
  for (const entry of fs.readdirSync(basePath)) {
    const serverPath = path.join(basePath, entry);
    if (!fs.existsSync(serverPath) || !fs.lstatSync(serverPath).isDirectory())
      continue;
    const filePath = path.join(serverPath, "blockcluster.cfg");
    if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
      files.push({ serverName: entry, filePath });
    }
  }
  return files;
}

function requireDatabase() {
  if (!database) throw new Error("Configuration database is not initialized");
  return database;
}

export async function initializeConfigStore(basePath: string): Promise<void> {
  const dbPath = getDbPath(basePath);
  const dbMissing = !fs.existsSync(dbPath);
  const legacyConfigFiles = dbMissing ? findLegacyConfigFiles(basePath) : [];

  if (database && initializedPath === dbPath) {
    return;
  }
  if (client) {
    await client.close();
  }

  client = new PGlite(dbPath);
  database = drizzle(client);
  initializedPath = dbPath;

  await runMigrations(client);

  if (!dbMissing || legacyConfigFiles.length === 0) return;

  const importedNames: string[] = [];
  for (const { serverName, filePath } of legacyConfigFiles) {
    const content = fs.readFileSync(filePath, "utf8");
    const parsed = parseLegacyConfig(content);
    await upsertServerConfig(serverName, parsed);
    importedNames.push(serverName);
  }

  const importedRows = await requireDatabase()
    .select({ serverName: serverConfigs.serverName })
    .from(serverConfigs)
    .where(inArray(serverConfigs.serverName, importedNames));

  if (importedRows.length !== importedNames.length) {
    throw new Error(
      `Legacy config import failed validation: expected ${importedNames.length} rows, got ${importedRows.length}.`,
    );
  }

  for (const { filePath } of legacyConfigFiles) {
    fs.rmSync(filePath, { force: true });
  }
}

export async function closeConfigStore(): Promise<void> {
  if (!client) return;
  await client.close();
  client = undefined;
  database = undefined;
  initializedPath = undefined;
}

export async function getServerConfig(
  serverName: string,
): Promise<PersistedServerConfig> {
  const rows = await requireDatabase()
    .select()
    .from(serverConfigs)
    .where(eq(serverConfigs.serverName, serverName))
    .limit(1);
  return toPersistedServerConfig(rows[0]);
}

export async function upsertServerConfig(
  serverName: string,
  config: PersistedServerConfig,
): Promise<void> {
  const row = toRow(serverName, config);
  await requireDatabase()
    .insert(serverConfigs)
    .values({ ...row, createdAt: new Date() })
    .onConflictDoUpdate({
      target: serverConfigs.serverName,
      set: row,
    });
}

export async function updateServerCreationPort(
  serverName: string,
  creationPort: number | undefined,
): Promise<void> {
  const existing = await getServerConfig(serverName);
  await upsertServerConfig(serverName, {
    ...existing,
    creationPort,
  });
}

export async function hasConfigStore(): Promise<boolean> {
  const rows = await requireDatabase()
    .select({ serverName: serverConfigs.serverName })
    .from(serverConfigs)
    .limit(1);
  return rows.length > 0;
}

export function getConfigStoreForTests() {
  return requireDatabase();
}

export function resetConfigStoreForTests() {
  client = undefined;
  database = undefined;
  initializedPath = undefined;
}
