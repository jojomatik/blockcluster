import { defineEventHandler } from "h3";
import { findServer, throwApiError } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  try {
    return await server.getUpdates();
  } catch {
    throwApiError(502, "Could not check for updates");
  }
});
