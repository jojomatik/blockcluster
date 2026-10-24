import fs from "fs";

const mockIoEmit = jest.fn();
const mockGetJavaRuntimes = jest.fn();

jest.mock("../../src/backend", () => ({
  basePath: "/servers",
  io: { emit: mockIoEmit },
}));

jest.mock("../../src/components/java_runtime", () => ({
  __esModule: true,
  getJavaRuntimes: mockGetJavaRuntimes,
}));

import { ServerStatus } from "../../../common/components/server";
import { getJavaRuntimes } from "../../src/components/java_runtime";
import Server from "../../src/components/server";
import ResourceUsage from "../../../common/components/resource_usage";
import ServerConfig from "../../src/components/server_config";

describe("backend Server", () => {
  beforeEach(() => {
    mockIoEmit.mockClear();
    mockGetJavaRuntimes.mockReset();
    mockGetJavaRuntimes.mockReturnValue([
      { isDefault: true, path: "/java" },
    ]);
  });

  it("marks a reachable process started and resolves a safe start", async () => {
    const server = new Server({
      _name: "survival",
      _status: ServerStatus.Starting,
    });
    const resolve = jest.fn();
    const reject = jest.fn();
    Object.assign(server, {
      proc: { exitCode: null },
      safeStartPromise: { resolve, reject },
    });
    jest.spyOn(server, "getServerInfo").mockResolvedValue({} as never);

    await server.updateStatus();

    expect(server.status).toBe(ServerStatus.Started);
    expect(resolve).toHaveBeenCalledWith(ServerStatus.Started);
    expect(reject).not.toHaveBeenCalled();
  });

  it("marks a stopped server after ping failure and clears an exited process", async () => {
    const offline = new Server({ _name: "offline" });
    jest
      .spyOn(offline, "getServerInfo")
      .mockRejectedValue(new Error("offline"));
    await offline.updateStatus();
    expect(offline.status).toBe(ServerStatus.Stopped);

    const exited = new Server({
      _name: "exited",
      _status: ServerStatus.Starting,
    });
    const reject = jest.fn();
    Object.assign(exited, {
      proc: { exitCode: 2 },
      safeStartPromise: { resolve: jest.fn(), reject },
    });
    jest.spyOn(exited, "getServerInfo").mockRejectedValue(new Error("closed"));

    await exited.updateStatus();

    expect(exited.status).toBe(ServerStatus.Stopped);
    expect(exited).toHaveProperty("proc", null);
    expect(reject).toHaveBeenCalledWith("Server stopped with exit code 2.");
  });

  it("refuses to start without an installed runtime and emits a useful error", async () => {
    expect(getJavaRuntimes).toBe(mockGetJavaRuntimes);
    const server = new Server({
      _name: "survival",
      _javaPath: "/missing/java",
    });
    Object.assign(server, {
      config: new ServerConfig([], false, undefined, "/missing/java"),
    });
    mockGetJavaRuntimes.mockReturnValue([]);

    await expect(server.start()).rejects.toThrow(
      "Java runtime /missing/java does not exist."
    );

    expect(server.status).toBe(ServerStatus.Stopped);
    expect(server.getRecentMessages()).toHaveLength(1);
    expect(server.getRecentMessages()[0].text).toContain(
      "Could not start server:"
    );
    expect(mockIoEmit).toHaveBeenCalledWith(
      "server_survival",
      expect.objectContaining({
        message: expect.objectContaining({
          text: expect.stringContaining("does not exist"),
        }),
      })
    );
  });

  it("writes updated settings to blockcluster.cfg", async () => {
    const server = new Server({ _name: "survival" });
    const update = jest.spyOn(server, "update").mockResolvedValue();
    const writeFile = jest.spyOn(fs, "writeFileSync").mockImplementation();
    const settings = {
      flags: ["-Xmx2G"],
      autostart: true,
      pauseOnIdle: { enable: true, timeout: 60 },
      javaPath: "/custom/java",
    };

    try {
      await server.updateConfig(settings);

      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(writeFile).toHaveBeenCalledWith(
        "/servers/survival/blockcluster.cfg",
        JSON.stringify(settings),
        { mode: 0o666 }
      );
      expect(update).toHaveBeenCalledTimes(1);
    } finally {
      writeFile.mockRestore();
      update.mockRestore();
    }
  });

  it("records zero usage when no child process is running and caps history at 60", async () => {
    const server = new Server({ _name: "idle" });

    await server.measureUsage(1234);
    expect(server.resourceUsage[0]).toMatchObject({
      time: 1234,
      cpu: 0,
      memory: 0,
    });

    server.resourceUsage = Array.from(
      { length: 60 },
      (_, index) => new ResourceUsage(index, index, index)
    );
    await server.measureUsage(60);

    expect(server.resourceUsage).toHaveLength(60);
    expect(server.resourceUsage[0].time).toBe(1);
    expect(server.resourceUsage[59].time).toBe(60);
  });
});
