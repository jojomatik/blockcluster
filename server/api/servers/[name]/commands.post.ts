import { defineEventHandler, readValidatedBody, sendNoContent } from "h3";
import { z } from "zod";
import { findServer } from "../../../utils/api";

const commandBodySchema = z.object({ command: z.string() });

export default defineEventHandler(async (event) => {
  const server = await findServer(event);
  const { command } = await readValidatedBody(event, commandBodySchema.parse);
  void server.executeCommand(command).catch(console.error);
  return sendNoContent(event, 202);
});
