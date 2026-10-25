import { defineEventHandler } from "h3";
import Server from "../../../components/server";
import { findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = await findServer(event);

  await server.update();
  return Server.strip([server])[0];
});
