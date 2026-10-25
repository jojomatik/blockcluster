import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

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
  if (!server) return errorResponse(event, 404, "Server not found");
  const body = await readValidatedBody(event, configBodySchema.parse);
  await server.updateConfig(body);
  return emptyResponse(event, 204);
});
