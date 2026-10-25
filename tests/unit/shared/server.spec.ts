import { describe, expect, it } from "vitest";
import Player from "#shared/components/player";
import ResourceUsage from "#shared/components/resource_usage";
import Server, { ServerStatus } from "#shared/components/server";

describe("Server", () => {
  it("uses safe defaults and allows updating server properties", () => {
    const server = new Server({});

    expect(server.name).toBe("");
    expect(server.status).toBe(ServerStatus.Unknown);
    expect(server.port).toBe(0);
    expect(server.world).toBe("");
    expect(server.players).toEqual({ online: 0, max: 0, sample: [] });

    server.name = "survival";
    server.status = ServerStatus.Started;
    server.port = 25565;
    server.world = "world";
    server.flags = ["-Xmx2G"];
    server.favicon = "data:image/png;base64,abc";
    server.jar = "server.jar";
    server.autostart = true;
    server.pauseOnIdle = { enable: true, timeout: 120 };
    server.javaPath = "/opt/java";
    server.players = { online: 1, max: 20, sample: [new Player("id", "Alex")] };
    server.resourceUsage = [new ResourceUsage(1000, 12, 2048)];

    expect(server.name).toBe("survival");
    expect(server.status).toBe(ServerStatus.Started);
    expect(server.port).toBe(25565);
    expect(server.world).toBe("world");
    expect(server.flags).toEqual(["-Xmx2G"]);
    expect(server.favicon).toContain("base64");
    expect(server.jar).toBe("server.jar");
    expect(server.autostart).toBe(true);
    expect(server.pauseOnIdle).toEqual({ enable: true, timeout: 120 });
    expect(server.javaPath).toBe("/opt/java");
    expect(server.players.online).toBe(1);
    expect(server.resourceUsage[0].cpu).toBe(12);
  });

  it("strips runtime-only fields and round-trips only public server data", () => {
    const server = new Server({
      _name: "creative",
      _status: ServerStatus.Stopped,
    });
    Object.assign(server, { proc: { pid: 42 }, messages: ["private"] });

    const stripped = server.strip();
    const serialized = JSON.parse(server.stringify());

    expect(stripped.name).toBe("creative");
    expect(stripped.status).toBe(ServerStatus.Stopped);
    expect(stripped).not.toHaveProperty("proc");
    expect(serialized._name).toBe("creative");
    expect(serialized).not.toHaveProperty("proc");
    expect(Server.strip([server])).toHaveLength(1);
    expect(JSON.parse(Server.stringify([server]))[0]._name).toBe("creative");
  });
});
