import {
  createError,
  getValidatedRouterParams,
  sendNoContent,
  type H3Event,
} from "h3";
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
 * Ends the response with the given status and without a body.
 *
 * @param event the current request event.
 * @param status the HTTP status of the response.
 */
export function emptyResponse(event: H3Event, status: number) {
  return sendNoContent(event, status);
}

/**
 * Returns the server named by the `name` route parameter, if it exists.
 *
 * @param event the current request event.
 */
export async function findServer(event: H3Event): Promise<Server | undefined> {
  const { name } = await getValidatedRouterParams(
    event,
    serverNameParamsSchema.parse,
    { decode: true },
  );
  return servers.find((entry) => entry.name === name);
}
