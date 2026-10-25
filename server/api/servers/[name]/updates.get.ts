import { createError, defineEventHandler } from "h3";
import { findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  try {
    return await server.getUpdates();
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not check for updates",
      message: "Could not check for updates",
    });
  }
});
