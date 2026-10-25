import { defineEventHandler, readBody } from "h3";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");
  const body = await readBody(event);
  if (typeof body?.command !== "string") {
    return errorResponse(event, 400, "Command must be a string");
  }

  void server.executeCommand(body.command).catch(console.error);
  return emptyResponse(event, 202);
});
