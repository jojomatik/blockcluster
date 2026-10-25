import { defineEventHandler, readBody } from "h3";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");
  const body = await readBody(event);
  if (body === null || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(event, 400, "Configuration must be an object");
  }

  await server.updateConfig(body);
  return emptyResponse(event, 204);
});
