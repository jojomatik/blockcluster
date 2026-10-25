import { defineEventHandler } from "h3";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");

  await server.acceptEula();
  return emptyResponse(event, 202);
});
