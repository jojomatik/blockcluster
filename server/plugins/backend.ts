import { Server as Engine } from "engine.io";
import { defineEventHandler } from "h3";
import { io, port, startBackend, stopBackend, version } from "../backend";

export default defineNitroPlugin((nitroApp) => {
  const engine = new Engine();
  io.bind(engine);

  // Hand all socket.io requests over to the engine, both long polling and websocket upgrades.
  nitroApp.router.use(
    "/socket.io/",
    defineEventHandler({
      handler(event) {
        engine.handleRequest(event.node.req, event.node.res);
        event._handled = true;
      },
      websocket: {
        open(peer) {
          const nodeContext = peer._internal
            .nodeReq as import("http").IncomingMessage;
          engine.prepare(nodeContext);
          engine.onWebSocket(
            nodeContext,
            nodeContext.socket,
            peer.websocket as never,
          );
        },
      },
    }),
  );

  startBackend().then(() =>
    console.log(
      "Backend (revision " + version + ") running on port " + port + ".",
    ),
  );

  nitroApp.hooks.hook("close", async () => {
    await stopBackend();
    engine.close();
  });
});
