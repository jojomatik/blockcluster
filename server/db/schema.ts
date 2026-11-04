import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const serverConfigs = pgTable("server_configs", {
  serverName: text("server_name").primaryKey(),
  creationPort: integer("creation_port"),
  flags: jsonb("flags").$type<string[]>().notNull().default([]),
  autostart: boolean("autostart").notNull().default(false),
  pauseOnIdleEnable: boolean("pause_on_idle_enable").notNull().default(false),
  pauseOnIdleTimeout: integer("pause_on_idle_timeout").notNull().default(300),
  javaPath: text("java_path"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const migrationMarkers = pgTable("migration_markers", {
  name: text("name").primaryKey(),
  appliedAt: timestamp("applied_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type ServerConfigRow = typeof serverConfigs.$inferSelect;
