import { defineEventHandler } from "h3";
import Server from "../../../components/server";
import { errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");

  await server.update();
  return Server.strip([server])[0];
});
