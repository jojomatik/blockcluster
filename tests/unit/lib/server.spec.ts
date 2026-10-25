import { vi } from "vitest";
import Server from "@/lib/components/server";

describe("client Server API", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("encodes server names and sends action, command, and config payloads", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetch;
    const server = new Server({ _name: "my server/#1" });

    await server.sendAction("restart");
    await server.sendCommand("say hello");
    await server.updateConfig({ autostart: true });

    expect(fetch.mock.calls).toEqual([
      [
        "/api/servers/my%20server%2F%231/actions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "restart" }),
        },
      ],
      [
        "/api/servers/my%20server%2F%231/commands",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: "say hello" }),
        },
      ],
      [
        "/api/servers/my%20server%2F%231/config",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ autostart: true }),
        },
      ],
    ]);
  });

  it("returns JSON payloads and reports unsuccessful HTTP responses", async () => {
    const json = vi.fn().mockResolvedValue({ _name: "test" });
    const fetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json })
      .mockResolvedValueOnce({ ok: true, json })
      .mockResolvedValueOnce({
        ok: false,
        status: 503,
        statusText: "Unavailable",
      });
    global.fetch = fetch;
    const server = new Server({ _name: "test server" });

    await expect(server.fetchInfo()).resolves.toEqual({ _name: "test" });
    await expect(server.fetchMessages("explicit%20name")).resolves.toEqual({
      _name: "test",
    });
    await expect(server.sendAction("start")).rejects.toThrow(
      "Request failed (503 Unavailable)",
    );
    expect(fetch.mock.calls[0]![0]).toBe("/api/servers/test%20server");
    expect(fetch.mock.calls[1]![0]).toBe(
      "/api/servers/explicit%20name/messages",
    );
  });
});
