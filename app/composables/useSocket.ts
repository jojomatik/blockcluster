import type { Socket } from "socket.io-client";

/**
 * Returns the socket connected to the backend.
 *
 * The socket only exists in the browser. Use it in lifecycle hooks like `onMounted` that are not executed during server side rendering.
 */
export function useSocket(): Socket {
  return useNuxtApp().$socket as Socket;
}
