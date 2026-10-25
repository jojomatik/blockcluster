import http from "node:http";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createRouter,
  defineEventHandler,
  toNodeListener,
} from "h3";

import { findServer } from "../../../server/utils/api";

const apiMocks = vi.hoisted(() => ({ servers: [] as Array<{ name: string }> }));
vi.mock("../../../server/backend", () => ({ servers: apiMocks.servers }));

let server: http.Server | undefined;

afterAll(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
});

describe("server API helpers", () => {
  it("finds a decoded route parameter and handles missing servers", async () => {
    const serverEntry = { name: "survival" };
    apiMocks.servers.splice(0, apiMocks.servers.length, serverEntry);
    const app = createApp();
    const router = createRouter();
    router.get(
      "/api/servers/:name",
      defineEventHandler(async (event) => {
        const found = await findServer(event);
        return { name: found.name };
      }),
    );
    app.use(router);
    server = http.createServer(toNodeListener(app));
    await new Promise<void>((resolve) =>
      server!.listen(0, "127.0.0.1", resolve),
    );
    const address = server.address() as import("node:net").AddressInfo;
    const url = `http://127.0.0.1:${address.port}`;

    const found = await fetch(`${url}/api/servers/survival`);
    expect(found.status).toBe(200);
    expect(await found.json()).toEqual({ name: "survival" });
    const missing = await fetch(`${url}/api/servers/missing`);
    expect(missing.status).toBe(404);
    expect(await missing.json()).toMatchObject({
      statusCode: 404,
      statusMessage: "Server not found",
    });
  });
});
