import { defineEventHandler, readValidatedBody, sendNoContent } from "h3";
import { z } from "zod";
import { findServer } from "../../../utils/api";

const configBodySchema = z.object({
  flags: z.array(z.string()).optional(),
  autostart: z.boolean().optional(),
  pauseOnIdle: z
    .object({ enable: z.boolean(), timeout: z.number() })
    .optional(),
  javaPath: z.string().nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  const body = await readValidatedBody(event, configBodySchema.parse);
  await server.updateConfig(body);
  return sendNoContent(event, 204);
});
