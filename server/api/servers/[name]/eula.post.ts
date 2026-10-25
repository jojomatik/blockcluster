import { defineEventHandler, sendNoContent } from "h3";
import { findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);

  await server.acceptEula();
  return sendNoContent(event, 202);
});
