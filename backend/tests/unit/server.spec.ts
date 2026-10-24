import fs from "fs";

const mockIoEmit = jest.fn();
const mockGetJavaRuntimes = jest.fn();

jest.mock("../../src/backend", () => ({
  basePath: "/servers",
  io: { emit: mockIoEmit },
}));

jest.mock("../../src/components/paper", () => ({
  getPaperUpdates: jest.fn(),
  installPaperJar: jest.fn(),
  restoreOldJar: jest.fn(),
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
    mockGetJavaRuntimes.mockReturnValue([{ isDefault: true, path: "/java" }]);
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

  describe("installUpdate", () => {
    const paper = jest.requireMock("../../src/components/paper");

    beforeEach(() => {
      paper.getPaperUpdates.mockReset();
      paper.installPaperJar.mockReset();
      paper.restoreOldJar.mockReset();
    });

    it("refuses to update a running server", async () => {
      const server = new Server({
        _name: "s",
        _status: ServerStatus.Started,
      });
      await expect(server.installUpdate("build")).rejects.toThrow("stopped");
      expect(paper.installPaperJar).not.toHaveBeenCalled();
    });

    it("fails if no update is available", async () => {
      const server = new Server({
        _name: "s",
        _status: ServerStatus.Stopped,
      });
      jest.spyOn(server as never, "getJarFile").mockReturnValue(null as never);
      paper.getPaperUpdates.mockResolvedValue({ build: null, patch: null });
      await expect(server.installUpdate("patch")).rejects.toThrow("No update");
    });

    it("installs an explicit version without looking up updates", async () => {
      const server = new Server({
        _name: "s",
        _status: ServerStatus.Stopped,
      });
      jest.spyOn(server, "update").mockResolvedValue();
      jest.spyOn(server, "sendServerData").mockImplementation();
      const target = { version: "1.21.8", build: 5 };
      await server.installUpdate(target);
      expect(paper.getPaperUpdates).not.toHaveBeenCalled();
      expect(paper.installPaperJar).toHaveBeenCalledWith(
        expect.any(String),
        target
      );
    });

    it("rejects installs and starts throughout lookup, installation and refresh", async () => {
      const server = new Server({ _name: "s", _status: ServerStatus.Stopped });
      const target = { version: "1.21.8", build: 5 };
      let resolveLookup!: (updates: { build: typeof target }) => void;
      paper.getPaperUpdates.mockReturnValue(
        new Promise((resolve) => (resolveLookup = resolve))
      );
      let resolveInstall!: () => void;
      paper.installPaperJar.mockReturnValue(
        new Promise<void>((resolve) => (resolveInstall = resolve))
      );
      let resolveRefresh!: () => void;
      jest
        .spyOn(server, "update")
        .mockReturnValue(
          new Promise<void>((resolve) => (resolveRefresh = resolve))
        );
      jest
        .spyOn(server, "getUpdates")
        .mockImplementation(() => paper.getPaperUpdates());
      jest.spyOn(server, "sendServerData").mockImplementation();
      const installing = server.installUpdate("build");

      const expectLocked = async () => {
        await expect(server.installUpdate(target)).rejects.toThrow(
          "in progress"
        );
        await expect(server.start()).rejects.toThrow("in progress");
        expect(server.status).toBe(ServerStatus.Stopped);
      };
      await expectLocked();
      resolveLookup({ build: target });
      await expectLocked();
      expect(paper.installPaperJar).toHaveBeenCalledTimes(1);
      resolveInstall();
      await expectLocked();
      resolveRefresh();
      await installing;

      await expect(server.installUpdate(target)).resolves.toBeUndefined();
      expect(paper.installPaperJar).toHaveBeenCalledTimes(2);
    });

    it.each(["lookup", "download", "restore", "refresh"])(
      "clears the guard after a failed %s",
      async (stage) => {
        const server = new Server({
          _name: "s",
          _status: ServerStatus.Stopped,
        });
        const error = new Error("failed " + stage);
        const target = { version: "1.21.8", build: 5 };
        jest.spyOn(server, "sendServerData").mockImplementation();
        const refresh = jest.spyOn(server, "update").mockResolvedValue();
        const lookup = jest.spyOn(server, "getUpdates");
        if (stage === "lookup") lookup.mockRejectedValueOnce(error);
        if (stage === "download")
          paper.installPaperJar.mockRejectedValueOnce(error);
        if (stage === "restore")
          paper.restoreOldJar.mockImplementationOnce(() => {
            throw error;
          });
        if (stage === "refresh") refresh.mockRejectedValueOnce(error);

        await expect(
          server.installUpdate(
            stage === "lookup"
              ? "build"
              : stage === "restore"
              ? { file: "old.jar" }
              : target
          )
        ).rejects.toBe(error);
        await expect(server.installUpdate(target)).resolves.toBeUndefined();
      }
    );

    it("holds the guard while an archived jar is restored and refreshed", async () => {
      const server = new Server({ _name: "s", _status: ServerStatus.Stopped });
      jest.spyOn(server, "sendServerData").mockImplementation();
      let resolveRefresh!: () => void;
      jest
        .spyOn(server, "update")
        .mockResolvedValue()
        .mockReturnValueOnce(
          new Promise<void>((resolve) => (resolveRefresh = resolve))
        );
      let starting!: Promise<unknown>;
      paper.restoreOldJar.mockImplementationOnce(() => {
        starting = server.start();
      });

      const restoring = server.installUpdate({ file: "old.jar" });
      await expect(starting).rejects.toThrow("in progress");
      await expect(server.installUpdate({ file: "other.jar" })).rejects.toThrow(
        "in progress"
      );
      resolveRefresh();
      await restoring;

      await expect(
        server.installUpdate({ file: "other.jar" })
      ).resolves.toBeUndefined();
    });
  });
});
