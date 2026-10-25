// The ESM builds have nested package.json files without a license, which the build's license check rejects.
import { io } from "socket.io-client/dist/socket.io.js";

/**
 * Connects to the websocket of the backend, which updates the clients about the state of the servers.
 */
export default defineNuxtPlugin(() => {
  const socket = io();

  return { provide: { socket } };
});
