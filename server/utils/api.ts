import { createError, getValidatedRouterParams, type H3Event } from "h3";
import { z } from "zod";
import { servers } from "../backend";
import type Server from "../components/server";

const serverNameParamsSchema = z.object({ name: z.string().min(1) });

/**
 * Returns the server named by the `name` route parameter.
 *
 * @param event the current request event.
 */
export async function findServer(event: H3Event): Promise<Server> {
  const { name } = await getValidatedRouterParams(
    event,
    serverNameParamsSchema.parse,
    { decode: true },
  );
  const server = servers.find((entry) => entry.name === name);
  if (!server) {
    throw createError({
      statusCode: 404,
      statusMessage: "Server not found",
    });
  }
  return server;
}
