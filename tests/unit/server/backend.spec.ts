import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { Mock } from "vitest";
import { createApp, createRouter, toNodeListener } from "h3";

interface MockServerData {
  _name: string;
  _properties?: { serverPort?: number };
}

interface MockServer {
  name: string;
  port: number;
  status: number;
  autostart: boolean;
  updateStatus: () => void;
  update: Mock<() => Promise<void>>;
  getRecentMessages: () => Array<{ text: string }>;
  strip: () => { _name: string };
  start: Mock<() => Promise<void>>;
  acceptEula: Mock<() => Promise<void>>;
  stop: Mock<() => Promise<void>>;
  pause: Mock<() => Promise<void>>;
  restart: Mock<() => Promise<void>>;
  deleteWorld: Mock<() => Promise<void>>;
  installUpdate: Mock<
    (
      type:
        | "build"
        | "patch"
        | { file: string }
        | { version: string; build: number },
    ) => Promise<void>
  >;
  executeCommand: Mock<() => Promise<void>>;
  updateConfig: Mock<() => Promise<void>>;
  measureUsage: Mock<() => Promise<void>>;
  sendServerData: Mock<() => void>;
}

const mocks = vi.hoisted(() => {
  const instances: MockServer[] = [];
  const io = {
    emit: vi.fn(),
    close: vi.fn((callback?: () => void) => callback?.()),
  };
  const server = Object.assign(
    vi.fn(function (data: MockServerData): MockServer {
      const instance: MockServer = {
        name: data._name,
        port: data._properties?.serverPort ?? 0,
        status: 0,
        autostart: mocks.autoStart,
        updateStatus: vi.fn(),
        update: vi.fn().mockResolvedValue(undefined),
        getRecentMessages: vi.fn(() => [{ text: "recent" }]),
        strip: vi.fn(() => ({ _name: data._name })),
        start: vi.fn().mockResolvedValue(undefined),
        acceptEula: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        pause: vi.fn().mockResolvedValue(undefined),
        restart: vi.fn().mockResolvedValue(undefined),
        deleteWorld: vi.fn().mockResolvedValue(undefined),
        installUpdate: vi.fn().mockResolvedValue(undefined),
        executeCommand: vi.fn().mockResolvedValue(undefined),
        updateConfig: vi.fn().mockResolvedValue(undefined),
        measureUsage: vi.fn().mockResolvedValue(undefined),
        sendServerData: vi.fn(),
      };
      instances.push(instance);
      return instance;
    }),
    {
      strip: vi.fn((items: MockServer[]) =>
        items.map((entry) => entry.strip()),
      ),
    },
  );
  return {
    instances,
    server,
    io,
    autoStart: false,
    listPaperVersions: vi.fn(),
    listPaperBuilds: vi.fn(),
    installPaperJar: vi.fn(),
    getJavaRuntimes: vi.fn(),
    pidusage: vi.fn(),
    watchFile: vi.fn(),
    failNextWrite: false,
    failWritePath: "",
    failWriteError: undefined as Error | undefined,
  };
});

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("node:fs") & { default: typeof import("node:fs") }
  >();
  const writeFileSync: typeof actual.default.writeFileSync = (...args) => {
    if (mocks.failNextWrite) {
      mocks.failNextWrite = false;
      throw new Error("disk full");
    }
    if (mocks.failWritePath === args[0]) {
      mocks.failWritePath = "";
      throw mocks.failWriteError;
    }
    return Reflect.apply(actual.default.writeFileSync, actual.default, args);
  };
  const defaultExport = {
    ...actual.default,
    watchFile: mocks.watchFile,
    writeFileSync,
  };
  return {
    ...actual,
    default: defaultExport,
    watchFile: mocks.watchFile,
    writeFileSync,
  };
});
vi.mock("../../../server/components/server", () => ({ default: mocks.server }));
vi.mock("../../../server/components/paper", () => ({
  installPaperJar: mocks.installPaperJar,
  listPaperBuilds: mocks.listPaperBuilds,
  listPaperVersions: mocks.listPaperVersions,
}));
vi.mock("../../../server/components/java_runtime", () => ({
  getJavaRuntimes: mocks.getJavaRuntimes,
}));
vi.mock("socket.io", () => ({
  Server: vi.fn(function () {
    return mocks.io;
  }),
}));
vi.mock("pidusage", () => ({ default: mocks.pidusage }));
vi.mock("nitropack/runtime", () => ({
  useRuntimeConfig: () => ({ public: { gitRef: "", gitSha: "abcdef012345" } }),
}));

const watchCallbacks = new Map<string, (curr: fs.Stats) => Promise<void>>();
const originalServerPath = process.env.SERVER_PATH;
const originalNodeEnv = process.env.NODE_ENV;
const originalNuxtPort = process.env.NUXT_PORT;
const originalNitroPort = process.env.NITRO_PORT;
const serversPath = path.join(
  process.cwd(),
  `.test-blockcluster-api-${process.pid}-${Date.now()}`,
);
let backend: typeof import("../../../server/backend");
let httpServer: http.Server;
let baseUrl: string;

async function register(router: ReturnType<typeof createRouter>) {
  const [
    version,
    javaRuntimes,
    systemUsage,
    serversGet,
    serversPost,
    paperVersions,
    paperBuilds,
    serverGet,
    messagesGet,
    oldJarsGet,
    updatesGet,
    updatesPost,
    actionsPost,
    commandsPost,
    configPatch,
    eulaPost,
  ] = await Promise.all([
    import("../../../server/api/version.get"),
    import("../../../server/api/java-runtimes.get"),
    import("../../../server/api/system-usage.get"),
    import("../../../server/api/servers/index.get"),
    import("../../../server/api/servers/index.post"),
    import("../../../server/api/paper/versions/index.get"),
    import("../../../server/api/paper/versions/[version]/builds.get"),
    import("../../../server/api/servers/[name]/index.get"),
    import("../../../server/api/servers/[name]/messages.get"),
    import("../../../server/api/servers/[name]/oldjars.get"),
    import("../../../server/api/servers/[name]/updates.get"),
    import("../../../server/api/servers/[name]/updates.post"),
    import("../../../server/api/servers/[name]/actions.post"),
    import("../../../server/api/servers/[name]/commands.post"),
    import("../../../server/api/servers/[name]/config.patch"),
    import("../../../server/api/servers/[name]/eula.post"),
  ]);
  router.get("/api/version", version.default);
  router.get("/api/java-runtimes", javaRuntimes.default);
  router.get("/api/system-usage", systemUsage.default);
  router.get("/api/servers", serversGet.default);
  router.post("/api/servers", serversPost.default);
  router.get("/api/paper/versions", paperVersions.default);
  router.get("/api/paper/versions/:version/builds", paperBuilds.default);
  router.get("/api/servers/:name", serverGet.default);
  router.get("/api/servers/:name/messages", messagesGet.default);
  router.get("/api/servers/:name/oldjars", oldJarsGet.default);
  router.get("/api/servers/:name/updates", updatesGet.default);
  router.post("/api/servers/:name/updates", updatesPost.default);
  router.post("/api/servers/:name/actions", actionsPost.default);
  router.post("/api/servers/:name/commands", commandsPost.default);
  router.patch("/api/servers/:name/config", configPatch.default);
  router.post("/api/servers/:name/eula", eulaPost.default);
}

async function invoke(
  method: string,
  route: string,
  data: { params?: Record<string, string>; body?: unknown } = {},
) {
  const requestPath = route.replace(
    ":name",
    encodeURIComponent(data.params?.name ?? ""),
  );
  const response = await fetch(baseUrl + requestPath, {
    method,
    headers:
      data.body === undefined
        ? undefined
        : { "content-type": "application/json" },
    body:
      data.body === undefined || method === "GET" || method === "HEAD"
        ? undefined
        : JSON.stringify(data.body),
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

describe("Nitro backend", () => {
  beforeAll(async () => {
    fs.mkdirSync(serversPath, { recursive: true });
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
      ].join("\n"),
    );
    for (const [name, config] of [
      ["paper-uninitialized", { creationPort: 25567 }],
      ["another-uninitialized", { port: "invalid" }],
    ] as const) {
      fs.mkdirSync(path.join(serversPath, name));
      fs.writeFileSync(path.join(serversPath, name, "paper.jar"), "jar");
      fs.writeFileSync(
        path.join(serversPath, name, "blockcluster.cfg"),
        JSON.stringify(config),
      );
    }
    process.env.SERVER_PATH = serversPath;
    process.env.NODE_ENV = "development";
    delete process.env.NUXT_PORT;
    delete process.env.NITRO_PORT;

    mocks.watchFile.mockImplementation(
      (file: string, listener: (curr: fs.Stats) => Promise<void>) => {
        watchCallbacks.set(file, listener);
      },
    );
    mocks.pidusage.mockResolvedValue({ cpu: 5, memory: 10 });
    mocks.getJavaRuntimes.mockReturnValue([{ path: "/java" }]);
    mocks.listPaperVersions.mockResolvedValue(["1.21.8"]);
    mocks.listPaperBuilds.mockResolvedValue([
      { build: 9, time: "2025-01-01T00:00:00Z" },
    ]);
    mocks.installPaperJar.mockResolvedValue("paper-1.21.8-9.jar");

    backend = await import("../../../server/backend");
    await backend.startBackend();
    const app = createApp();
    const router = createRouter();
    await register(router);
    app.use(router);
    httpServer = http.createServer(toNodeListener(app));
    await new Promise<void>((resolve) =>
      httpServer.listen(0, "127.0.0.1", resolve),
    );
    const address = httpServer.address() as net.AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    mocks.io.emit.mockClear();
    mocks.listPaperVersions.mockReset().mockResolvedValue(["1.21.8"]);
    mocks.listPaperBuilds
      .mockReset()
      .mockResolvedValue([{ build: 9, time: "2025-01-01T00:00:00Z" }]);
    mocks.installPaperJar.mockReset().mockResolvedValue("paper-1.21.8-9.jar");
    for (const server of mocks.instances) {
      for (const key of [
        "start",
        "stop",
        "pause",
        "restart",
        "deleteWorld",
        "installUpdate",
        "acceptEula",
        "executeCommand",
        "updateConfig",
        "update",
        "measureUsage",
        "sendServerData",
      ] as const)
        server[key].mockClear();
    }
  });

  afterAll(async () => {
    if (backend) await backend.stopBackend();
    if (httpServer) {
      httpServer.closeAllConnections();
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
    }
    fs.rmSync(serversPath, { recursive: true, force: true });
    if (originalServerPath === undefined) delete process.env.SERVER_PATH;
    else process.env.SERVER_PATH = originalServerPath;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalNuxtPort === undefined) delete process.env.NUXT_PORT;
    else process.env.NUXT_PORT = originalNuxtPort;
    if (originalNitroPort === undefined) delete process.env.NITRO_PORT;
    else process.env.NITRO_PORT = originalNitroPort;
  });

  it("initializes the backend, restores saved ports, measures usage, and serves metadata", async () => {
    expect(backend.port).toBe(8081);
    expect(await invoke("GET", "/api/version")).toEqual({
      status: 200,
      body: { version: "abcdef0" },
    });
    expect(await invoke("GET", "/api/java-runtimes")).toEqual({
      status: 200,
      body: [{ path: "/java" }],
    });
    expect((await invoke("GET", "/api/servers")).body).toEqual(
      expect.arrayContaining([
        { _name: "survival" },
        { _name: "paper-uninitialized" },
      ]),
    );
    expect((await invoke("GET", "/api/system-usage")).body).toEqual(
      expect.arrayContaining([expect.objectContaining({ cpu: 5, memory: 10 })]),
    );
    expect(mocks.instances).toHaveLength(3);
    expect(
      mocks.instances.find((server) => server.name === "survival")!.port,
    ).toBe(25565);
    expect(
      mocks.instances
        .filter((server) => server.name !== "survival")
        .map((server) => server.port)
        .sort(),
    ).toEqual([25566, 25567]);
  });

  it("serves Paper metadata routes and returns expected errors for missing servers", async () => {
    expect(await invoke("GET", "/api/paper/versions")).toEqual({
      status: 200,
      body: ["1.21.8"],
    });
    expect(
      await invoke("GET", "/api/paper/versions/1.21.8/builds"),
    ).toMatchObject({ status: 200 });
    expect(
      (await invoke("GET", "/api/paper/versions/latest/builds")).status,
    ).toBe(400);
    for (const [method, route] of [
      ["GET", "/api/servers/:name"],
      ["GET", "/api/servers/:name/messages"],
      ["GET", "/api/servers/:name/oldjars"],
      ["GET", "/api/servers/:name/updates"],
      ["POST", "/api/servers/:name/eula"],
      ["POST", "/api/servers/:name/actions"],
    ] as Array<[string, string]>)
      expect(
        await invoke(method, route, {
          params: { name: "missing" },
          body: { action: "start" },
        }),
      ).toEqual({ status: 404, body: { error: "Server not found" } });
  });

  it("validates and forwards commands, configuration, and actions", async () => {
    expect(
      await invoke("POST", "/api/servers/:name/commands", {
        params: { name: "survival" },
        body: { command: 42 },
      }),
    ).toMatchObject({ status: 400 });
    expect(
      await invoke("PATCH", "/api/servers/:name/config", {
        params: { name: "survival" },
        body: [],
      }),
    ).toMatchObject({ status: 400 });
    expect(
      await invoke("POST", "/api/servers/:name/actions", {
        params: { name: "survival" },
        body: { action: "delete-all" },
      }),
    ).toMatchObject({ status: 400 });
    expect(
      (
        await invoke("POST", "/api/servers/:name/commands", {
          params: { name: "survival" },
          body: { command: "say hello" },
        })
      ).status,
    ).toBe(202);
    expect(
      (
        await invoke("PATCH", "/api/servers/:name/config", {
          params: { name: "survival" },
          body: { autostart: true },
        })
      ).status,
    ).toBe(204);
    expect(
      (
        await invoke("POST", "/api/servers/:name/actions", {
          params: { name: "survival" },
          body: { action: "pause" },
        })
      ).status,
    ).toBe(202);
    const server = mocks.instances.find((entry) => entry.name === "survival")!;
    expect(server.executeCommand).toHaveBeenCalledWith("say hello");
    expect(server.updateConfig).toHaveBeenCalledWith({ autostart: true });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(server.pause).toHaveBeenCalled();
  });

  it("validates server update requests before installing an update", async () => {
    for (const body of [
      { type: "unknown" },
      { type: "existing", file: 42 },
      { type: "version", version: "latest", build: 1 },
      { type: "version", version: "1.21.8", build: 1.5 },
    ]) {
      expect(
        (
          await invoke("POST", "/api/servers/:name/updates", {
            params: { name: "survival" },
            body,
          })
        ).status,
      ).toBe(400);
    }

    const server = mocks.instances.find((entry) => entry.name === "survival")!;
    for (const [body, expected] of [
      [
        { type: "existing", file: "paper-1.21.8-8.jar" },
        { file: "paper-1.21.8-8.jar" },
      ],
      [
        { type: "version", version: "1.21.8", build: 9 },
        { version: "1.21.8", build: 9 },
      ],
      [{ type: "build" }, "build"],
      [{ type: "patch" }, "patch"],
    ] as const) {
      expect(
        (
          await invoke("POST", "/api/servers/:name/updates", {
            params: { name: "survival" },
            body,
          })
        ).status,
      ).toBe(204);
      expect(server.installUpdate).toHaveBeenLastCalledWith(expected);
    }
  });

  it("accepts an EULA and creates a server from the newest stable Paper build", async () => {
    expect(
      (
        await invoke("POST", "/api/servers/:name/eula", {
          params: { name: "survival" },
        })
      ).status,
    ).toBe(202);
    expect(
      mocks.instances.find((entry) => entry.name === "survival")!.acceptEula,
    ).toHaveBeenCalled();
    const created = await invoke("POST", "/api/servers", {
      body: { name: "Survival Server", version: "1.21.8" },
    });
    expect(created).toEqual({
      status: 201,
      body: { _name: "Survival Server" },
    });
    expect(mocks.installPaperJar).toHaveBeenCalledWith(
      path.join(serversPath, "Survival Server"),
      { version: "1.21.8", build: 9 },
    );
    expect(
      JSON.parse(
        fs.readFileSync(
          path.join(serversPath, "Survival Server", "blockcluster.cfg"),
          "utf8",
        ),
      ).creationPort,
    ).toBe(25568);
  });

  it("rejects invalid, conflicting, and unavailable Paper creation requests", async () => {
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "../outside", version: "1.21.8" },
      }),
    ).toMatchObject({ status: 400 });
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Bad version", version: "latest" },
      }),
    ).toMatchObject({ status: 400 });
    mocks.listPaperVersions.mockResolvedValueOnce(["1.21.8"]);
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Unavailable", version: "1.20.1" },
      }),
    ).toEqual({
      status: 400,
      body: { error: "Paper version is not available" },
    });
    for (const port of [80, 70000, 25570.5, "25570"])
      expect(
        (
          await invoke("POST", "/api/servers", {
            body: { name: "Invalid port", version: "1.21.8", port },
          })
        ).status,
      ).toBe(400);
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Used port", version: "1.21.8", port: 25565 },
      }),
    ).toEqual({ status: 409, body: { error: "Port is already in use" } });
    mocks.listPaperVersions.mockClear();
    expect(
      await invoke("POST", "/api/servers", {
        body: { name: "Backend port", version: "1.21.8", port: backend.port },
      }),
    ).toEqual({ status: 409, body: { error: "Port is already in use" } });
    expect(mocks.listPaperVersions).not.toHaveBeenCalled();
  });

  it("rejects a host-occupied requested port and accepts a free requested port", async () => {
    const occupied = net.createServer();
    await new Promise<void>((resolve) =>
      occupied.listen(0, "127.0.0.1", resolve),
    );
    const occupiedPort = (occupied.address() as net.AddressInfo).port;
    try {
      expect(
        await invoke("POST", "/api/servers", {
          body: {
            name: "Host occupied",
            version: "1.21.8",
            port: occupiedPort,
          },
        }),
      ).toEqual({ status: 409, body: { error: "Port is already in use" } });
    } finally {
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
    const requestedPort = 30432;
    expect(
      (
        await invoke("POST", "/api/servers", {
          body: {
            name: "Requested port",
            version: "1.21.8",
            port: requestedPort,
          },
        })
      ).status,
    ).toBe(201);
    expect(mocks.instances.at(-1)!.port).toBe(requestedPort);
  });

  it("reserves requested ports during concurrent downloads and assigns distinct automatic ports", async () => {
    const requestedPort = 30433;
    let enterDownload!: () => void;
    let finishDownload!: () => void;
    const entered = new Promise<void>((resolve) => {
      enterDownload = resolve;
    });
    const download = new Promise<string>((resolve) => {
      finishDownload = () => resolve("paper-1.21.8-9.jar");
    });
    mocks.installPaperJar.mockImplementationOnce(() => {
      enterDownload();
      return download;
    });
    const first = invoke("POST", "/api/servers", {
      body: {
        name: "Reserved request",
        version: "1.21.8",
        port: requestedPort,
      },
    });
    await entered;
    expect(
      await invoke("POST", "/api/servers", {
        body: {
          name: "Duplicate request",
          version: "1.21.8",
          port: requestedPort,
        },
      }),
    ).toEqual({ status: 409, body: { error: "Port is already in use" } });
    finishDownload();
    expect((await first).status).toBe(201);

    const before = mocks.instances.length;
    const results = await Promise.all([
      invoke("POST", "/api/servers", {
        body: { name: "Automatic A", version: "1.21.8" },
      }),
      invoke("POST", "/api/servers", {
        body: { name: "Automatic B", version: "1.21.8" },
      }),
    ]);
    expect(results.map(({ status }) => status)).toEqual([201, 201]);
    const ports = mocks.instances.slice(before).map(({ port }) => port);
    expect(new Set(ports).size).toBe(2);
  });

  it("excludes a requested port from automatic allocation while its download is pending", async () => {
    const requestedPort = backend.getAvailablePort(backend.servers);
    let enterDownload!: () => void;
    let finishDownload!: () => void;
    const entered = new Promise<void>((resolve) => {
      enterDownload = resolve;
    });
    const download = new Promise<string>((resolve) => {
      finishDownload = () => resolve("paper-1.21.8-9.jar");
    });
    mocks.installPaperJar.mockImplementationOnce(() => {
      enterDownload();
      return download;
    });
    const pending = invoke("POST", "/api/servers", {
      body: { name: "Pending port", version: "1.21.8", port: requestedPort },
    });
    await entered;
    const automatic = await invoke("POST", "/api/servers", {
      body: { name: "Automatic port", version: "1.21.8" },
    });
    expect(automatic.status).toBe(201);
    expect(mocks.instances.at(-1)!.port).toBe(requestedPort + 1);
    finishDownload();
    expect((await pending).status).toBe(201);
  });

  it("removes a failed creation and releases its requested port reservation", async () => {
    const logError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    mocks.failNextWrite = true;
    try {
      expect(
        await invoke("POST", "/api/servers", {
          body: { name: "Write failure", version: "1.21.8", port: 30434 },
        }),
      ).toEqual({
        status: 502,
        body: { error: "Could not create Paper server" },
      });
      expect(fs.existsSync(path.join(serversPath, "Write failure"))).toBe(
        false,
      );
      expect(
        (
          await invoke("POST", "/api/servers", {
            body: { name: "Write failure", version: "1.21.8", port: 30434 },
          })
        ).status,
      ).toBe(201);
    } finally {
      logError.mockRestore();
    }
  });

  it("watches start files and launches servers configured for autostart", async () => {
    const watchedServer = mocks.instances.find(
      (entry) => entry.name === "survival",
    )!;
    const startFile = path.join(serversPath, "survival", "start");
    fs.writeFileSync(startFile, "start");
    await watchCallbacks.get(startFile)?.({ isFile: () => true } as fs.Stats);
    expect(watchedServer.start).toHaveBeenCalled();
    expect(fs.existsSync(startFile)).toBe(false);
    await backend.stopBackend();
    mocks.autoStart = true;
    await backend.startBackend();
    expect(
      mocks.instances
        .slice(-3)
        .some((entry) => entry.start.mock.calls.length > 0),
    ).toBe(true);
    mocks.autoStart = false;
  });

  it.each(["creationPort", "port"])(
    "continues loading a server when legacy %s cleanup fails",
    async (key) => {
      const directory = path.join(serversPath, "cleanup-failure");
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(
        path.join(directory, "server.properties"),
        "server-port=30126",
      );
      const configPath = path.join(directory, "blockcluster.cfg");
      const config = { [key]: 30123, flags: ["-Xmx2G"], autostart: true };
      fs.writeFileSync(configPath, JSON.stringify(config));
      const writeError = new Error("read-only config");
      mocks.failWritePath = configPath;
      mocks.failWriteError = writeError;
      const logError = vi
        .spyOn(console, "error")
        .mockImplementation(() => undefined);
      const previousCount = mocks.instances.length;
      try {
        await backend.stopBackend();
        await backend.startBackend();
        const restored = mocks.instances.slice(previousCount);
        expect(
          restored.find((entry) => entry.name === "cleanup-failure")?.port,
        ).toBe(30126);
        expect(fs.readFileSync(configPath, "utf8")).toBe(
          JSON.stringify(config),
        );
        expect(logError).toHaveBeenCalledWith(
          'Could not clean up legacy port config for server "cleanup-failure".',
          writeError,
        );
      } finally {
        mocks.failWriteError = undefined;
        logError.mockRestore();
      }
    },
  );

  it("restores configured ports after restart and reports occupied conflicts", async () => {
    const occupied = net.createServer();
    await new Promise<void>((resolve) =>
      occupied.listen(0, "127.0.0.1", resolve),
    );
    const occupiedPort = (occupied.address() as net.AddressInfo).port;
    const previousCount = mocks.instances.length;
    const conflicts = [
      ["z-backend-conflict", backend.port],
      ["z-duplicate-conflict", 25565],
      ["z-host-conflict", occupiedPort],
      ["z-properties-port", 30125],
    ] as const;
    for (const [name, port] of conflicts) {
      const directory = path.join(serversPath, name);
      fs.mkdirSync(directory);
      fs.writeFileSync(path.join(directory, "paper.jar"), "jar");
      fs.writeFileSync(
        path.join(directory, "blockcluster.cfg"),
        JSON.stringify({ creationPort: port }),
      );
    }
    fs.writeFileSync(
      path.join(serversPath, "z-properties-port", "server.properties"),
      "server-port=30125",
    );
    const logError = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      await backend.stopBackend();
      await backend.startBackend();
      const restored = mocks.instances.slice(previousCount);
      expect(
        restored.find((entry) => entry.name === "z-properties-port")!.port,
      ).toBe(30125);
      for (const name of [
        "z-backend-conflict",
        "z-duplicate-conflict",
        "z-host-conflict",
      ]) {
        const value = restored.find((entry) => entry.name === name)!.port;
        expect(value).toBeGreaterThanOrEqual(25565);
        expect(value).not.toBe(
          conflicts.find(([candidate]) => candidate === name)?.[1],
        );
      }
      expect(logError).toHaveBeenCalled();
    } finally {
      logError.mockRestore();
      await new Promise<void>((resolve) => occupied.close(() => resolve()));
    }
  });
});
