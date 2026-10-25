import { defineEventHandler } from "h3";
import Server from "../../../components/server";
import { findServer, throwApiError } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) throwApiError(404, "Server not found");

  await server.update();
  return Server.strip([server])[0];
});
