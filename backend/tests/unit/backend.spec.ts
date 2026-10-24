import fs from "fs";
import os from "os";
import path from "path";
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

function createResponse(): { response: Response; result: Result } {
  const result: Result = { status: 200, body: undefined };
  const response = {} as Response;
  Object.assign(response, {
    contentType: jest.fn(() => response),
    send: jest.fn((body: unknown) => {
      result.body = body;
      return response;
    }),
    status: jest.fn((status: number) => {
      result.status = status;
      return response;
    }),
    json: jest.fn((body: unknown) => {
      result.body = body;
      return response;
    }),
    end: jest.fn(() => response),
    sendFile: jest.fn(() => response),
  });
  return { response, result };
}

async function invoke(
  method: string,
  route: string,
  data: { params?: Record<string, string>; body?: unknown } = {}
): Promise<Result> {
  const handlers = mockRoutes.get(`${method} ${route}`);
  if (!handlers) throw new Error(`Missing route handler: ${method} ${route}`);
  const { response, result } = createResponse();
  const request = {
    params: data.params || {},
    body: data.body,
  } as Request;
  const next = jest.fn();
  const endpoint = handlers[handlers.length - 1];
  endpoint(request, response, next);

  // Express does not await route handlers, so let async response work settle.
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
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
    process.env.SERVER_PATH = serversPath;
    process.env.VUE_APP_GIT_SHA = "abcdef012345";
    process.env.NODE_ENV = "test";
    restoreInterval = jest
      .spyOn(global, "setInterval")
      .mockReturnValue({} as never);
    restoreLog = jest.spyOn(console, "log").mockImplementation();

    jest.isolateModules(() => {
      require("../../src/backend");
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  afterAll(() => {
    restoreInterval.mockRestore();
    restoreLog.mockRestore();
    fs.unwatchFile(path.join(serversPath, "survival", "start"));
    fs.unwatchFile(path.join(serversPath, "paper-uninitialized", "start"));
    fs.unwatchFile(path.join(serversPath, "another-uninitialized", "start"));
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

  it("reserves distinct ports for concurrent server creations", async () => {
    const results = await Promise.all([
      invoke("POST", "/api/servers", {
        body: { name: "Concurrent A", version: "1.21.8" },
      }),
      invoke("POST", "/api/servers", {
        body: { name: "Concurrent B", version: "1.21.8" },
      }),
    ]);

    expect(results.map((result) => result.status)).toEqual([201, 201]);
    const ports = mockServerInstances.map((server) => server.port);
    expect(new Set(ports).size).toBe(ports.length);
    expect(ports.slice(-2)).toEqual([25569, 25570]);
  });
});
