import { defineEventHandler } from "h3";
import { servers } from "../../backend";
import Server from "../../components/server";

export default defineEventHandler(async () => {
  await Promise.all(servers.map((server) => server.updateStatus()));
  return Server.strip(servers);
});
