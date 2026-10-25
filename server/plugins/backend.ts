import { Server as Engine } from "engine.io";
import { defineEventHandler } from "h3";
import type { IncomingMessage } from "node:http";
import type { WebSocket } from "ws";
import { io, port, startBackend, stopBackend, version } from "../backend";

interface NitroNodePeer {
  _internal: { nodeReq: IncomingMessage };
  websocket: unknown;
}

interface EngineWebSocketBridge {
  prepare(request: IncomingMessage): void;
  onWebSocket(
    request: IncomingMessage,
    socket: IncomingMessage["socket"],
    websocket: WebSocket,
  ): void;
}

export default defineNitroPlugin(async (nitroApp) => {
  const engine = new Engine();
  const engineBridge = engine as unknown as EngineWebSocketBridge;
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
          const nodePeer = peer as unknown as NitroNodePeer;
          const nodeContext = nodePeer._internal.nodeReq;
          engineBridge.prepare(nodeContext);
          engineBridge.onWebSocket(
            nodeContext,
            nodeContext.socket,
            nodePeer.websocket as WebSocket,
          );
        },
      },
    }),
  );

  await startBackend();
  console.log(`Backend (revision ${version}) running on port ${port}.`);

  nitroApp.hooks.hook("close", async () => {
    await stopBackend();
    engine.close();
  });
});
