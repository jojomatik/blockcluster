import { createError, getValidatedRouterParams, type H3Event } from "h3";
import { z } from "zod";
import { servers } from "../backend";
import type Server from "../components/server";

const serverNameParamsSchema = z.object({ name: z.string().min(1) });

/**
 * Throws an HTTP error with the given status and message.
 *
 * @param status the HTTP status of the response.
 * @param message the error message.
 */
export function throwApiError(status: number, message: string): never {
  throw createError({
    statusCode: status,
    statusMessage: message,
    message,
  });
}

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
