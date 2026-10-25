import { defineEventHandler } from "h3";
import { findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);

  return server.getRecentMessages();
});
