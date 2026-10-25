import http from "node:http";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createApp,
  createRouter,
  defineEventHandler,
  toNodeListener,
} from "h3";

import {
  emptyResponse,
  errorResponse,
  findServer,
} from "../../../server/utils/api";

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
  it("finds a decoded route parameter and returns error or empty responses", async () => {
    const serverEntry = { name: "survival" };
    apiMocks.servers.splice(0, apiMocks.servers.length, serverEntry);
    const app = createApp();
    const router = createRouter();
    router.get(
      "/api/servers/:name",
      defineEventHandler((event) => {
        const found = findServer(event);
        return found
          ? { name: found.name }
          : errorResponse(event, 404, "Server not found");
      }),
    );
    router.get(
      "/api/failure",
      defineEventHandler((event) => errorResponse(event, 409, "Conflict")),
    );
    router.get(
      "/api/empty",
      defineEventHandler((event) => emptyResponse(event, 204)),
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
    expect(await missing.json()).toEqual({ error: "Server not found" });
    const failure = await fetch(`${url}/api/failure`);
    expect(failure.status).toBe(409);
    expect(await failure.json()).toEqual({ error: "Conflict" });
    const empty = await fetch(`${url}/api/empty`);
    expect(empty.status).toBe(204);
    expect(await empty.text()).toBe("");
  });
});
