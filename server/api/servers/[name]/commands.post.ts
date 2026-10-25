import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";
import { emptyResponse, findServer, throwApiError } from "../../../utils/api";

const commandBodySchema = z.object({ command: z.string() });

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) throwApiError(404, "Server not found");
  const { command } = await readValidatedBody(event, commandBodySchema.parse);
  void server.executeCommand(command).catch(console.error);
  return emptyResponse(event, 202);
});
