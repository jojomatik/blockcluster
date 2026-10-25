import { defineEventHandler, readValidatedBody } from "h3";
import { z } from "zod";
import { emptyResponse, findServer, throwApiError } from "../../../utils/api";

const actionBodySchema = z.object({
  action: z.enum(["start", "stop", "pause", "restart", "deleteWorld"]),
});

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  if (!server) throwApiError(404, "Server not found");
  const { action } = await readValidatedBody(event, actionBodySchema.parse);

  const runAction = async () => {
    switch (action) {
      case "start":
        try {
          await server.start();
        } catch (error) {
          console.log("Could not start server:", error);
        }
        break;
      case "stop":
        await server.stop();
        break;
      case "pause":
        await server.pause();
        break;
      case "restart":
        await server.restart();
        break;
      case "deleteWorld":
        await server.deleteWorld();
        break;
    }
    await server.update();
    server.sendServerData();
  };

  void runAction().catch(console.error);
  return emptyResponse(event, 202);
});
