CREATE TABLE IF NOT EXISTS "server_configs" (
  "server_name" text PRIMARY KEY NOT NULL,
  "creation_port" integer,
  "flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "autostart" boolean DEFAULT false NOT NULL,
  "pause_on_idle_enable" boolean DEFAULT false NOT NULL,
  "pause_on_idle_timeout" integer DEFAULT 300 NOT NULL,
  "java_path" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
