import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

const updateBodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("existing"), file: z.string() }),
  z.object({
    type: z.literal("version"),
    version: z.string().regex(/^\d+(?:\.\d+)+$/),
    build: z.number().int(),
  }),
  z.object({ type: z.enum(["build", "patch"]) }),
]);

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");
  const body = await readValidatedBody(event, updateBodySchema.parse);
  let update:
    | "build"
    | "patch"
    | { file: string }
    | { version: string; build: number };
  switch (body.type) {
    case "existing":
      update = { file: body.file };
      break;
    case "version":
      update = { version: body.version, build: body.build };
      break;
    case "build":
    case "patch":
      update = body.type;
      break;
  }
  try {
    await server.installUpdate(update);
    return emptyResponse(event, 204);
  } catch (error) {
    return errorResponse(event, 409, (error as Error).message);
  }
});
