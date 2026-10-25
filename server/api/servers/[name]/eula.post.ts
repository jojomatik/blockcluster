import { defineEventHandler } from "h3";
import { emptyResponse, findServer, throwApiError } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) throwApiError(404, "Server not found");

  await server.acceptEula();
  return emptyResponse(event, 202);
});
