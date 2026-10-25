import { defineEventHandler } from "h3";
import { errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");

  return server.getRecentMessages();
});
