import { defineEventHandler } from "h3";
import { findServer, throwApiError } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) throwApiError(404, "Server not found");

  return server.getRecentMessages();
});
