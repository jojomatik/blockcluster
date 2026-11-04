CREATE TABLE IF NOT EXISTS "migration_markers" (
  "name" text PRIMARY KEY NOT NULL,
  "applied_at" timestamp with time zone DEFAULT now() NOT NULL
);

UPDATE "server_configs"
SET "flags" = '[]'::jsonb
WHERE "flags" IS NULL;
