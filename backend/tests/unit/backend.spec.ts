import fs from "fs";
import os from "os";
import path from "path";
import net from "net";
import type { NextFunction, Request, Response } from "express";
import {
  installPaperJar,
  listPaperBuilds,
  listPaperVersions,
} from "../../src/components/paper";

type RouteHandler = (
  request: Request,
  response: Response,
  next: NextFunction
) => unknown;

const mockRoutes = new Map<string, RouteHandler[]>();
const mockServerInstances: Array<
  Record<string, jest.Mock | string | number | boolean>
> = [];
const mockIo = {
  emit: jest.fn(),
  close: jest.fn((callback?: () => void) => callback?.()),
};
const mockApp = {
  use: jest.fn(),
  get: jest.fn((route: string, ...handlers: RouteHandler[]) => {
    mockRoutes.set(`GET ${route}`, handlers);
  }),
  post: jest.fn((route: string, ...handlers: RouteHandler[]) => {
    mockRoutes.set(`POST ${route}`, handlers);
  }),
  patch: jest.fn((route: string, ...handlers: RouteHandler[]) => {
    mockRoutes.set(`PATCH ${route}`, handlers);
  }),
  listen: jest.fn((_port: number, callback?: () => void) => {
    callback?.();
    return { close: jest.fn((done?: () => void) => done?.()) };
  }),
};
const mockExpress = Object.assign(
  jest.fn(() => mockApp),
  {
    json: jest.fn(() => jest.fn()),
    static: jest.fn(() => jest.fn()),
  }
);
jest.mock("../../src/components/paper", () => ({
  installPaperJar: jest.fn(),
  listPaperBuilds: jest.fn(),
  listPaperVersions: jest.fn(),
}));
const mockServer = Object.assign(
  jest
    .fn()
    .mockImplementation(
      (data: { _name: string; _properties?: { serverPort: number } }) => {
        const instance = {
          name: data._name,
          port: data._properties?.serverPort ?? 0,
          status: 0,
          autostart: false,
          updateStatus: jest.fn(),
          update: jest.fn(),
          getRecentMessages: jest.fn(() => [{ text: "recent" }]),
          strip: jest.fn(() => ({ _name: data._name })),
          start: jest.fn().mockResolvedValue(undefined),
          stop: jest.fn().mockResolvedValue(undefined),
          pause: jest.fn().mockResolvedValue(undefined),
          restart: jest.fn().mockResolvedValue(undefined),
          deleteWorld: jest.fn().mockResolvedValue(undefined),
          executeCommand: jest.fn().mockResolvedValue(undefined),
          updateConfig: jest.fn().mockResolvedValue(undefined),
          measureUsage: jest.fn().mockResolvedValue(undefined),
          sendServerData: jest.fn(),
        };
        mockServerInstances.push(instance);
        return instance;
      }
    ),
  {
    strip: jest.fn((servers: Array<{ strip: () => unknown }>) =>
      servers.map((server) => server.strip())
    ),
  }
);

jest.mock("express", () => ({ __esModule: true, default: mockExpress }));
jest.mock("dotenv", () => ({ config: jest.fn(() => ({})) }));
jest.mock("dotenv-expand", () => ({ expand: jest.fn() }));
jest.mock("socket.io", () => ({
  Server: jest.fn().mockImplementation(() => mockIo),
}));
jest.mock("pidusage", () =>
  jest.fn().mockResolvedValue({ cpu: 5, memory: 10 })
);
jest.mock("../../src/components/server", () => ({
  __esModule: true,
  default: mockServer,
}));
jest.mock("../../src/components/java_runtime", () => ({
  getJavaRuntimes: jest.fn(() => [{ path: "/java" }]),
}));
jest.mock("../../src/utils/dependency_info", () => ({
  __esModule: true,
  default: jest.fn(() => [{ name: "backend-lib" }]),
}));

type Result = { status: number; body: unknown };

function createResponse(): {
  response: Response;
  result: Result;
  completed: Promise<void>;
  fail: (error: unknown) => void;
} {
  let finish!: () => void;
  let fail!: (error: unknown) => void;
  const completed = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  const result: Result = { status: 200, body: undefined };
  const response = {} as Response;
  Object.assign(response, {
    contentType: jest.fn(() => response),
    send: jest.fn((body: unknown) => {
      result.body = body;
      finish();
      return response;
    }),
    status: jest.fn((status: number) => {
      result.status = status;
      return response;
    }),
    json: jest.fn((body: unknown) => {
      result.body = body;
      finish();
      return response;
    }),
    end: jest.fn(() => {
      finish();
      return response;
    }),
    sendFile: jest.fn(() => response),
  });
  return { response, result, completed, fail };
}

async function invoke(
  method: string,
  route: string,
  data: { params?: Record<string, string>; body?: unknown } = {}
): Promise<Result> {
  const handlers = mockRoutes.get(`${method} ${route}`);
  if (!handlers) throw new Error(`Missing route handler: ${method} ${route}`);
  const { response, result, completed, fail } = createResponse();
  const request = {
    params: data.params || {},
    body: data.body,
  } as Request;
  const next = jest.fn(fail);
  const endpoint = handlers[handlers.length - 1];
  endpoint(request, response, next);

  await completed;
  return result;
}

describe("backend API", () => {
  const originalServerPath = process.env.SERVER_PATH;
  const originalGitSha = process.env.VUE_APP_GIT_SHA;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSignalListeners = process.listeners("SIGTERM");
  let serversPath: string;
  let restoreInterval: jest.SpyInstance;
  let restoreLog: jest.SpyInstance;

  async function loadBackend(): Promise<void> {
    const loaded = new Promise<void>((resolve) => {
      restoreInterval.mockImplementationOnce(() => {
        resolve();
        return {} as never;
      });
    });
    jest.isolateModules(() => {
      require("../../src/backend");
    });
    await loaded;
  }

  beforeAll(async () => {
    serversPath = fs.mkdtempSync(path.join(os.tmpdir(), "blockcluster-api-"));
    fs.mkdirSync(path.join(serversPath, "survival"));
    fs.writeFileSync(
      path.join(serversPath, "survival", "server.properties"),
      [
        "level-seed=seed",
        "gamemode=survival",
        "level-name=world",
        "motd=Test server",
        "pvp=true",
        "difficulty=easy",
        "max-players=20",
        "online-mode=true",
        "view-distance=10",
        "allow-nether=true",
        "server-port=25565",
        "hardcore=false",
        "white-list=false",
        "spawn-protection=16",
      ].join("\n")
    );
    fs.mkdirSync(path.join(serversPath, "paper-uninitialized"));
    fs.writeFileSync(
      path.join(serversPath, "paper-uninitialized", "paper-1.21.8-9.jar"),
      "jar"
    );
    fs.mkdirSync(path.join(serversPath, "another-uninitialized"));
    fs.writeFileSync(
      path.join(serversPath, "another-uninitialized", "paper-1.21.8-9.jar"),
      "jar"
    );
    fs.writeFileSync(
      path.join(serversPath, "paper-uninitialized", "blockcluster.cfg"),
      JSON.stringify({ creationPort: 25567 })
    );
    fs.writeFileSync(
      path.join(serversPath, "another-uninitialized", "blockcluster.cfg"),
      JSON.stringify({ port: "invalid" })
    );
    process.env.SERVER_PATH = serversPath;
    process.env.VUE_APP_GIT_SHA = "abcdef012345";
    process.env.NODE_ENV = "test";
    restoreInterval = jest
      .spyOn(global, "setInterval")
      .mockReturnValue({} as never);
    restoreLog = jest.spyOn(console, "log").mockImplementation();

    await loadBackend();
  });

  afterAll(() => {
    restoreInterval.mockRestore();
    restoreLog.mockRestore();
    for (const name of new Set(
      mockServerInstances.map((server) => server.name)
    )) {
      fs.unwatchFile(path.join(serversPath, String(name), "start"));
    }
    fs.rmSync(serversPath, { recursive: true, force: true });
    for (const listener of process.listeners("SIGTERM")) {
      if (!originalSignalListeners.includes(listener))
        process.removeListener("SIGTERM", listener);
    }
    for (const [key, value] of [
      ["SERVER_PATH", originalServerPath],
      ["VUE_APP_GIT_SHA", originalGitSha],
      ["NODE_ENV", originalNodeEnv],
    ] as const) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  beforeEach(() => {
    mockIo.emit.mockClear();
  });

  it("returns version, dependencies, runtimes, usage, and the loaded server list", async () => {
    expect(await invoke("GET", "/api/version")).toEqual({
      status: 200,
      body: { version: "abcdef0" },
    });
    expect(await invoke("GET", "/api/dependencies")).toEqual({
      status: 200,
      body: { dependencies: [{ name: "backend-lib" }] },
    });
    expect(await invoke("GET", "/api/java-runtimes")).toEqual({
      status: 200,
      body: [{ path: "/java" }],
    });
    expect(await invoke("GET", "/api/servers")).toEqual({
      status: 200,
      body: expect.arrayContaining([
        { _name: "survival" },
        { _name: "paper-uninitialized" },
      ]),
    });
    expect((await invoke("GET", "/api/system-usage")).body).toEqual(
      expect.arrayContaining([expect.objectContaining({ cpu: 5, memory: 10 })])
    );
    expect(mockServerInstances).toHaveLength(3);
  });

  it("allocates distinct ports for JAR-only servers after reading configured ports", () => {
    expect(
      mockServerInstances.find((server) => server.name === "survival").port
    ).toBe(25565);
    expect(
      mockServerInstances
        .filter((server) => server.name !== "survival")
        .map((server) => server.port)
        .sort()
    ).toEqual([25566, 25567]);
  });

  it("returns 404 for missing server details, messages, and actions", async () => {
    expect(
      await invoke("GET", "/api/servers/:name", {
        params: { name: "missing" },
      })
    ).toEqual({ status: 404, body: { error: "Server not found" } });
    expect(
      await invoke("GET", "/api/servers/:name/messages", {
        params: { name: "missing" },
      })
    ).toEqual({ status: 404, body: { error: "Server not found" } });
    expect(
      await invoke("POST", "/api/servers/:name/actions", {
        params: { name: "missing" },
        body: { action: "start" },
      })
    ).toEqual({ status: 404, body: { error: "Server not found" } });
  });

  it("validates command bodies, config objects, and supported actions", async () => {
    expect(
      await invoke("POST", "/api/servers/:name/commands", {
        params: { name: "survival" },
        body: { command: 42 },
      })
    ).toEqual({ status: 400, body: { error: "Command must be a string" } });
    expect(
      await invoke("PATCH", "/api/servers/:name/config", {
        params: { name: "survival" },
        body: ["not", "an", "object"],
      })
    ).toEqual({
      status: 400,
      body: { error: "Configuration must be an object" },
    });
    expect(
      await invoke("POST", "/api/servers/:name/actions", {
        params: { name: "survival" },
        body: { action: "delete-all" },
      })
    ).toEqual({ status: 400, body: { error: "Invalid server action" } });
  });

  it("forwards valid command, config, and action requests", async () => {
    const command = await invoke("POST", "/api/servers/:name/commands", {
      params: { name: "survival" },
      body: { command: "say hello" },
    });
    const config = await invoke("PATCH", "/api/servers/:name/config", {
      params: { name: "survival" },
      body: { autostart: true },
    });
    const action = await invoke("POST", "/api/servers/:name/actions", {
      params: { name: "survival" },
      body: { action: "pause" },
    });
    expect(command.status).toBe(202);
    expect(config.status).toBe(204);
    expect(action.status).toBe(202);

    const server = mockServerInstances.find(
      (instance) => instance.name === "survival"
    );
    expect(server).toBeDefined();
    expect(server.executeCommand).toHaveBeenCalledWith("say hello");
    expect(server.updateConfig).toHaveBeenCalledWith({ autostart: true });
    expect(server.pause).toHaveBeenCalled();
  });

  it("rejects Paper versions that are not currently available", async () => {
    jest.mocked(listPaperVersions).mockResolvedValue(["1.21.8"]);

    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Survival Server", version: "1.20.1" },
      })
    ).toEqual({
      status: 400,
      body: { error: "Paper version is not available" },
    });
    expect(installPaperJar).not.toHaveBeenCalled();
  });

  it("rejects unsafe server directory names", async () => {
    jest.mocked(listPaperVersions).mockClear();

    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "../outside", version: "1.21.8" },
      })
    ).toEqual({ status: 400, body: { error: "Invalid server name" } });
    expect(listPaperVersions).not.toHaveBeenCalled();
  });

  it("creates a server from the latest stable build of the selected version", async () => {
    jest.mocked(listPaperVersions).mockResolvedValue(["1.21.8"]);
    jest
      .mocked(listPaperBuilds)
      .mockResolvedValue([{ build: 9, time: "2025-01-01T00:00:00Z" }]);
    jest.mocked(installPaperJar).mockResolvedValue("paper-1.21.8-9.jar");

    const result = await invoke("POST", "/api/servers", {
      body: { name: "Survival Server", version: "1.21.8" },
    });

    expect(result).toEqual({
      status: 201,
      body: { _name: "Survival Server" },
    });
    expect(installPaperJar).toHaveBeenCalledWith(
      path.join(serversPath, "Survival Server"),
      { version: "1.21.8", build: 9 }
    );
    expect(
      fs.existsSync(
        path.join(serversPath, "Survival Server", "server.properties")
      )
    ).toBe(false);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(serversPath, "Survival Server", "blockcluster.cfg"),
          "utf8"
        )
      ).creationPort
    ).toBe(25568);
    expect(mockServerInstances[mockServerInstances.length - 1].name).toBe(
      "Survival Server"
    );
    expect(
      mockServerInstances[mockServerInstances.length - 1].start
    ).toHaveBeenCalled();
    expect(mockServerInstances[mockServerInstances.length - 1].port).toBe(
      25568
    );
  });

  it.each([[80], [70000], [25570.5], ["25570"]])(
    "rejects the invalid port %j",
    async (port) => {
      jest.mocked(listPaperVersions).mockClear();

      expect(
        await invoke("POST", "/api/servers", {
          body: { name: "Port Server", version: "1.21.8", port },
        })
      ).toEqual({ status: 400, body: { error: "Invalid port" } });
      expect(listPaperVersions).not.toHaveBeenCalled();
    }
  );

  it("rejects a port that is already used by a server", async () => {
    const used = mockServerInstances[0].port;

    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Port Server", version: "1.21.8", port: used },
      })
    ).toEqual({ status: 409, body: { error: "Port is already in use" } });
  });

  it("rejects the backend listener port before loading Paper versions", async () => {
    jest.mocked(listPaperVersions).mockClear();
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Backend Port", version: "1.21.8", port: 8081 },
      })
    ).toEqual({ status: 409, body: { error: "Port is already in use" } });
    expect(listPaperVersions).not.toHaveBeenCalled();
  });

  it("rejects a port occupied by another host listener", async () => {
    const listener = net.createServer();
    await new Promise<void>((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(0, "127.0.0.1", resolve);
    });
    try {
      jest.mocked(listPaperVersions).mockClear();
      const port = (listener.address() as net.AddressInfo).port;
      expect(
        await invoke("POST", "/api/servers", {
          body: { name: "Occupied Port", version: "1.21.8", port },
        })
      ).toEqual({ status: 409, body: { error: "Port is already in use" } });
      expect(listPaperVersions).not.toHaveBeenCalled();
    } finally {
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
  });

  it("creates a server with the requested free port", async () => {
    jest.mocked(listPaperVersions).mockResolvedValue(["1.21.8"]);
    jest
      .mocked(listPaperBuilds)
      .mockResolvedValue([{ build: 9, time: "2025-01-01T00:00:00Z" }]);
    jest.mocked(installPaperJar).mockResolvedValue("paper-1.21.8-9.jar");

    const result = await invoke("POST", "/api/servers", {
      body: { name: "Custom Port", version: "1.21.8", port: 30123 },
    });

    expect(result.status).toBe(201);
    expect(mockServerInstances[mockServerInstances.length - 1].port).toBe(
      30123
    );
    expect(
      fs.existsSync(path.join(serversPath, "Custom Port", "server.properties"))
    ).toBe(false);
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(serversPath, "Custom Port", "blockcluster.cfg"),
          "utf8"
        )
      ).creationPort
    ).toBe(30123);
  });

  it("rejects concurrent creations that request the same port", async () => {
    jest.mocked(listPaperVersions).mockResolvedValue(["1.21.8"]);
    jest
      .mocked(listPaperBuilds)
      .mockResolvedValue([{ build: 9, time: "2025-01-01T00:00:00Z" }]);
    jest.mocked(installPaperJar).mockResolvedValue("paper-1.21.8-9.jar");

    const results = await Promise.all([
      invoke("POST", "/api/servers", {
        body: { name: "Same Port A", version: "1.21.8", port: 30200 },
      }),
      invoke("POST", "/api/servers", {
        body: { name: "Same Port B", version: "1.21.8", port: 30200 },
      }),
    ]);

    expect(results.map((result) => result.status).sort()).toEqual([201, 409]);
  });

  it("reserves distinct ports for concurrent server creations", async () => {
    jest.mocked(listPaperVersions).mockResolvedValue(["1.21.8"]);
    jest
      .mocked(listPaperBuilds)
      .mockResolvedValue([{ build: 9, time: "2025-01-01T00:00:00Z" }]);
    jest.mocked(installPaperJar).mockResolvedValue("paper-1.21.8-9.jar");

    const existingServerCount = mockServerInstances.length;
    const existingPorts = mockServerInstances.map((server) => server.port);
    const results = await Promise.all([
      invoke("POST", "/api/servers", {
        body: { name: "Concurrent A", version: "1.21.8" },
      }),
      invoke("POST", "/api/servers", {
        body: { name: "Concurrent B", version: "1.21.8" },
      }),
    ]);

    expect(results.map((result) => result.status)).toEqual([201, 201]);
    expect(mockServerInstances).toHaveLength(existingServerCount + 2);
    const ports = mockServerInstances
      .slice(existingServerCount)
      .map((server) => server.port);
    expect(new Set(ports).size).toBe(ports.length);
    for (const port of ports) {
      expect(existingPorts).not.toContain(port);
    }
  });
  it("excludes a requested port while its download is still pending", async () => {
    const usedPorts = new Set(mockServerInstances.map((server) => server.port));
    let reservedPort = 25565;
    while (usedPorts.has(reservedPort)) reservedPort++;
    let release!: (jar: string) => void;
    let entered!: () => void;
    const downloading = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const download = new Promise<string>((resolve) => {
      release = resolve;
    });
    jest.mocked(installPaperJar).mockImplementationOnce(() => {
      entered();
      return download;
    });
    const pending = invoke("POST", "/api/servers", {
      body: { name: "Pending Port", version: "1.21.8", port: reservedPort },
    });
    await downloading;
    try {
      const result = await invoke("POST", "/api/servers", {
        body: { name: "Automatic Port", version: "1.21.8" },
      });
      expect(result.status).toBe(201);
      expect(mockServerInstances[mockServerInstances.length - 1].port).toBe(
        reservedPort + 1
      );
    } finally {
      release("paper-1.21.8-9.jar");
      expect((await pending).status).toBe(201);
    }
  });

  it("cleans up a failed port write and releases the reservation", async () => {
    const writeFile = jest
      .spyOn(fs, "writeFileSync")
      .mockImplementationOnce(() => {
        throw new Error("disk full");
      });
    const logError = jest.spyOn(console, "error").mockImplementation();
    try {
      expect(
        await invoke("POST", "/api/servers", {
          body: { name: "Write Failure", version: "1.21.8", port: 30300 },
        })
      ).toEqual({
        status: 502,
        body: { error: "Could not create Paper server" },
      });
      expect(fs.existsSync(path.join(serversPath, "Write Failure"))).toBe(
        false
      );
      expect(
        await invoke("POST", "/api/servers", {
          body: { name: "Write Failure", version: "1.21.8", port: 30300 },
        })
      ).toMatchObject({ status: 201 });
    } finally {
      writeFile.mockRestore();
      logError.mockRestore();
    }
  });

  it("restores nonconflicting ports and reports conflicts after a backend restart", async () => {
    for (const name of ["Survival Server", "Custom Port"]) {
      // The installer is mocked; supply the JAR that it normally writes.
      fs.writeFileSync(
        path.join(serversPath, name, "paper-1.21.8-9.jar"),
        "jar"
      );
    }
    // Minecraft's configured port takes precedence once server.properties exists.
    fs.writeFileSync(
      path.join(serversPath, "Custom Port", "server.properties"),
      "server-port=30124"
    );
    const listener = net.createServer();
    await new Promise<void>((resolve, reject) => {
      listener.once("error", reject);
      listener.listen(0, "127.0.0.1", resolve);
    });
    const occupiedPort = (listener.address() as net.AddressInfo).port;
    const conflicts = [
      { name: "z-backend-conflict", port: 8081, propertiesPort: 0 },
      { name: "z-duplicate-conflict", port: 30124, propertiesPort: 0 },
      { name: "z-host-conflict", port: occupiedPort, propertiesPort: 0 },
      { name: "z-properties-conflict", port: 25565, propertiesPort: 30125 },
    ];
    for (const { name, port, propertiesPort } of conflicts) {
      const serverPath = path.join(serversPath, name);
      fs.mkdirSync(serverPath);
      fs.writeFileSync(path.join(serverPath, "paper.jar"), "jar");
      fs.writeFileSync(
        path.join(serverPath, "blockcluster.cfg"),
        JSON.stringify({ creationPort: port })
      );
      if (propertiesPort) {
        fs.writeFileSync(
          path.join(serverPath, "server.properties"),
          `server-port=${propertiesPort}`
        );
      }
    }
    const previousCount = mockServerInstances.length;
    const logError = jest.spyOn(console, "error").mockImplementation();
    try {
      await loadBackend();
      const restored = mockServerInstances.slice(previousCount);
      for (const { name, port, propertiesPort } of conflicts) {
        const restoredPort = restored.find(
          (server) => server.name === name
        )?.port;
        if (propertiesPort) expect(restoredPort).toBe(propertiesPort);
        else {
          expect(restoredPort).toBeGreaterThanOrEqual(25565);
          expect(restoredPort).not.toBe(port);
          expect(logError).toHaveBeenCalledWith(
            `Could not restore port ${port} for server "${name}": port is unavailable.`
          );
        }
      }
      expect(new Set(restored.map((server) => server.port)).size).toBe(
        restored.length
      );
      expect(logError).toHaveBeenCalledTimes(3);
    } finally {
      logError.mockRestore();
      await new Promise<void>((resolve) => listener.close(() => resolve()));
    }
    const restored = mockServerInstances.slice(previousCount);
    expect(
      restored.find((server) => server.name === "Survival Server")?.port
    ).toBe(25568);
    expect(restored.find((server) => server.name === "Custom Port")?.port).toBe(
      30124
    );
    for (const name of ["Custom Port", "z-properties-conflict"]) {
      const config = JSON.parse(
        fs.readFileSync(
          path.join(serversPath, name, "blockcluster.cfg"),
          "utf8"
        )
      );
      expect(config).not.toHaveProperty("creationPort");
      expect(config).not.toHaveProperty("port");
    }
  });

  it.each(["creationPort", "port"])(
    "loads servers using server.properties when cleaning up %s fails",
    async (key) => {
      const configPath = path.join(
        serversPath,
        "Custom Port",
        "blockcluster.cfg"
      );
      const config = { [key]: 30123, flags: ["-Xmx2G"], autostart: true };
      fs.writeFileSync(configPath, JSON.stringify(config));
      const writeFileSync = fs.writeFileSync;
      const writeError = new Error("read-only config");
      const writeFile = jest
        .spyOn(fs, "writeFileSync")
        .mockImplementation((file, ...args) => {
          if (file === configPath) throw writeError;
          return writeFileSync(file, ...args);
        });
      const logError = jest.spyOn(console, "error").mockImplementation();
      const previousCount = mockServerInstances.length;
      try {
        await loadBackend();
        const restored = mockServerInstances.slice(previousCount);
        expect(
          restored.find((server) => server.name === "Custom Port")?.port
        ).toBe(30124);
        for (const server of restored) expect(server.update).toHaveBeenCalled();
        expect(JSON.parse(fs.readFileSync(configPath, "utf8"))).toEqual(config);
        expect(logError).toHaveBeenCalledWith(
          'Could not clean up legacy port config for server "Custom Port".',
          writeError
        );
      } finally {
        writeFile.mockRestore();
        logError.mockRestore();
      }
    }
  );

  it("assigns an automatic port when a saved port cannot be bound", async () => {
    const fixturePath = fs.mkdtempSync(
      path.join(os.tmpdir(), "blockcluster-bind-")
    );
    const serverPath = path.join(fixturePath, "denied-port");
    fs.mkdirSync(serverPath);
    fs.writeFileSync(path.join(serverPath, "paper.jar"), "jar");
    fs.writeFileSync(
      path.join(serverPath, "blockcluster.cfg"),
      JSON.stringify({ creationPort: 25565 })
    );
    process.env.SERVER_PATH = fixturePath;
    const listener = new net.Server();
    const listen = jest.spyOn(listener, "listen").mockImplementation(() => {
      process.nextTick(() => {
        listener.emit(
          "error",
          Object.assign(new Error("permission denied"), {
            code: "EACCES",
          })
        );
      });
      return listener;
    });
    const createServer = jest
      .spyOn(net, "createServer")
      .mockReturnValueOnce(listener);
    const logError = jest.spyOn(console, "error").mockImplementation();
    const previousCount = mockServerInstances.length;
    try {
      await loadBackend();
      expect(listen).toHaveBeenCalledWith(25565, expect.any(Function));
      expect(mockServerInstances.slice(previousCount)).toEqual([
        expect.objectContaining({ name: "denied-port", port: 25566 }),
      ]);
      expect(logError).toHaveBeenCalledWith(
        'Could not restore port 25565 for server "denied-port": port is unavailable.'
      );
    } finally {
      createServer.mockRestore();
      listen.mockRestore();
      logError.mockRestore();
      process.env.SERVER_PATH = serversPath;
      fs.unwatchFile(path.join(serverPath, "start"));
      fs.rmSync(fixturePath, { recursive: true, force: true });
    }
  });
});
