import { defineEventHandler } from "h3";
import { errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");
  try {
    return await server.getUpdates();
  } catch {
    return errorResponse(event, 502, "Could not check for updates");
  }
});
