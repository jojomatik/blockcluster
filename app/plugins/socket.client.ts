import { io } from "socket.io-client";

/**
 * Connects to the websocket of the backend, which updates the clients about the state of the servers.
 */
export default defineNuxtPlugin(() => {
  const socket = io();

  return { provide: { socket } };
});
