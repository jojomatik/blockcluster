import {
  getRouterParam,
  sendNoContent,
  setResponseStatus,
  type H3Event,
} from "h3";
import { servers } from "../backend";
import type Server from "../components/server";

/**
 * Sets the given status on the response and returns a JSON error body.
 *
 * @param event the current request event.
 * @param status the HTTP status of the response.
 * @param message the error message.
 */
export function errorResponse(event: H3Event, status: number, message: string) {
  setResponseStatus(event, status);
  return { error: message };
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
export function findServer(event: H3Event): Server | undefined {
  const name = getRouterParam(event, "name", { decode: true });
  return servers.find((entry) => entry.name === name);
}
