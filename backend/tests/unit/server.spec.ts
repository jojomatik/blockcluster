import fs from "fs";
import childProcess from "child_process";
import commandExists from "command-exists";
import mc from "minecraft-protocol";
import { EventEmitter } from "events";
import { PassThrough } from "stream";
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

  it("records EULA acceptance and broadcasts startup and running states", async () => {
    jest.useFakeTimers();
    const server = new Server({ _name: "survival" });
    const writeFile = jest.spyOn(fs, "writeFileSync").mockImplementation();
    const start = jest.spyOn(server, "start").mockImplementation(async () => {
      server.status = ServerStatus.Starting;
    });
    const updateStatus = jest
      .spyOn(server, "updateStatus")
      .mockImplementation(async () => {
        server.status = ServerStatus.Started;
      });

    try {
      await server.acceptEula();

      expect(writeFile).toHaveBeenCalledWith(
        "/servers/survival/eula.txt",
        expect.stringContaining("eula=true"),
        { mode: 0o666 }
      );
      expect(start).toHaveBeenCalledTimes(1);
      expect(mockIoEmit).toHaveBeenCalledWith("server_survival", {
        serverInfo: expect.objectContaining({ status: ServerStatus.Starting }),
      });

      await jest.advanceTimersByTimeAsync(1000);

      expect(updateStatus).toHaveBeenCalledTimes(1);
      expect(mockIoEmit).toHaveBeenLastCalledWith("server_survival", {
        serverInfo: expect.objectContaining({ status: ServerStatus.Started }),
      });
    } finally {
      writeFile.mockRestore();
      start.mockRestore();
      updateStatus.mockRestore();
      jest.useRealTimers();
    }
  });

  describe("EULA acceptance lifecycle", () => {
    let server: Server;
    let writeFile: jest.SpyInstance;
    let start: jest.SpyInstance;

    beforeEach(() => {
      server = new Server({ _name: "survival" });
      writeFile = jest.spyOn(fs, "writeFileSync").mockImplementation();
      start = jest.spyOn(server, "start").mockResolvedValue();
    });

    afterEach(() => jest.restoreAllMocks());

    it("rejects acceptance for a started server without writing or starting", async () => {
      server.status = ServerStatus.Started;

      await expect(server.acceptEula()).rejects.toThrow("already started");

      expect(writeFile).not.toHaveBeenCalled();
      expect(start).not.toHaveBeenCalled();
      expect(server.status).toBe(ServerStatus.Started);
    });

    it.each([
      { exitCode: 0, signalCode: null },
      { exitCode: null, signalCode: "SIGTERM" },
    ])("skips waiting for an exited process: %j", async (exitStatus) => {
      const proc = Object.assign(new EventEmitter(), exitStatus);
      Object.assign(server, { proc });

      await server.acceptEula();

      expect(proc.listenerCount("exit")).toBe(0);
      expect(server).toHaveProperty("proc", null);
      expect(start).toHaveBeenCalledTimes(1);
    });

    it("shares acceptance while waiting for a running refusal process to exit", async () => {
      const proc = Object.assign(new EventEmitter(), {
        exitCode: null,
        signalCode: null,
      });
      Object.assign(server, { proc });
      server.status = ServerStatus.Starting;

      const first = server.acceptEula();
      const second = server.acceptEula();

      expect(second).toBe(first);
      expect(writeFile).toHaveBeenCalledTimes(1);
      expect(proc.listenerCount("exit")).toBe(1);
      expect(start).not.toHaveBeenCalled();
      proc.emit("exit", 0, null);
      await Promise.all([first, second]);
      expect(start).toHaveBeenCalledTimes(1);
    });

    it.each([false, true])(
      "shares acceptance until startup settles and allows a later attempt (failure: %s)",
      async (fails) => {
        let settle!: () => void;
        const error = new Error("Java failed");
        start.mockReturnValueOnce(
          new Promise<void>((resolve, reject) => {
            settle = () => (fails ? reject(error) : resolve());
          })
        );
        const first = server.acceptEula();
        const second = server.acceptEula();
        expect(second).toBe(first);
        expect(writeFile).toHaveBeenCalledTimes(1);
        expect(start).toHaveBeenCalledTimes(1);

        settle();
        if (fails) {
          await expect(first).rejects.toBe(error);
          await expect(second).rejects.toBe(error);
        } else {
          await Promise.all([first, second]);
        }

        const later = server.acceptEula();
        expect(later).not.toBe(first);
        await later;
        expect(writeFile).toHaveBeenCalledTimes(2);
        expect(start).toHaveBeenCalledTimes(2);
      }
    );
  });

  it("launches Java and checks status using the same allocated port", async () => {
    const server = new Server({ _name: "new-server", _javaPath: "/java" });
    server.port = 25568;
    const readdir = jest
      .spyOn(fs, "readdirSync")
      .mockReturnValue(["paper.jar"] as never);
    const command = jest.spyOn(commandExists, "sync").mockReturnValue(false);
    const spawn = jest.spyOn(childProcess, "spawn").mockReturnValue({
      stdout: { on: jest.fn(), setEncoding: jest.fn() },
      stderr: { on: jest.fn() },
    } as never);
    const ping = jest.spyOn(mc, "ping").mockResolvedValue({} as never);

    try {
      await server.start();
      await server.getServerInfo();

      expect(spawn).toHaveBeenCalledWith(
        '"/java/bin/java"',
        ["-jar", "paper.jar", "nogui", "--port", "25568"],
        { cwd: "/servers/new-server", shell: true }
      );
      expect(ping).toHaveBeenCalledWith({ port: 25568 });
    } finally {
      readdir.mockRestore();
      command.mockRestore();
      spawn.mockRestore();
      ping.mockRestore();
    }
  });

  it.each(["\n", ""])(
    "emits complete stdout lines across chunks and flushes at end (terminator: %j)",
    async (terminator) => {
      const server = new Server({ _name: "survival", _javaPath: "/java" });
      const stdout = new PassThrough();
      const readdir = jest
        .spyOn(fs, "readdirSync")
        .mockReturnValue(["paper.jar"] as never);
      const command = jest.spyOn(commandExists, "sync").mockReturnValue(false);
      const spawn = jest.spyOn(childProcess, "spawn").mockReturnValue({
        stdout,
        stderr: { on: jest.fn() },
      } as never);
      const eulaText =
        "π You need to agree to the EULA in order to run the server. Go to eula.txt for more info.";
      const bytes = Buffer.from(eulaText);

      try {
        await server.start();
        stdout.write("starting\n\n");
        // Split both a UTF-8 character and the EULA pattern across chunks.
        stdout.write(bytes.subarray(0, 1));
        stdout.write(bytes.subarray(1, 25));
        await Promise.resolve();
        expect(server.getRecentMessages().map(({ text }) => text)).toEqual([
          "starting",
        ]);

        const ended = new Promise<void>((resolve) => stdout.once("end", resolve));
        stdout.end(Buffer.concat([bytes.subarray(25), Buffer.from(terminator)]));
        await ended;

        expect(server.getRecentMessages().map(({ text }) => text)).toEqual([
          "starting",
          eulaText,
        ]);
        expect(mockIoEmit).toHaveBeenLastCalledWith("server_survival", {
          message: expect.objectContaining({ text: eulaText }),
        });
      } finally {
        stdout.destroy();
        readdir.mockRestore();
        command.mockRestore();
        spawn.mockRestore();
      }
    }
  );

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
        await expect(server.start()).rejects.toThrow("jar is being updated");
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
      await expect(starting).rejects.toThrow("jar is being updated");
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
