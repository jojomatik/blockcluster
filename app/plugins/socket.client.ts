// The prebuilt bundle is used because the nested package.json files of the ESM builds do not specify a license, which the license check of the build can not handle.
import { io } from "socket.io-client/dist/socket.io.js";

/**
 * Connects to the websocket of the backend, which updates the clients about the state of the servers.
 */
export default defineNuxtPlugin(() => {
  const socket = io();

  return { provide: { socket } };
});
