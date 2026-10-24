/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import express from "express";
import * as socketio from "socket.io";
import * as fs from "fs";
import PropertiesReader from "properties-reader";

import { ServerStatus } from "../../common/components/server";
import Server from "./components/server";
import path from "path";
import net from "net";
import type ServerConfig from "./components/server_config";

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
import { getVersion } from "../../common/version";
import {
  installPaperJar,
  listPaperBuilds,
  listPaperVersions,
} from "./components/paper";
import { getJavaRuntimes } from "./components/java_runtime";
import getDependencyInfo from "./utils/dependency_info";
import {
  getPropertiesFromFile,
  ServerPropertiesFile,
} from "../../common/components/server_properties";
import pidusage from "pidusage";
import ResourceUsage from "../../common/components/resource_usage";

dotenvExpand.expand(dotenv.config({ path: "../.env" }));
dotenvExpand.expand(dotenv.config({ path: "../.env.local" }));

const app = express();

const options = {
  cors: {
    origin: ["http://localhost:8080"],
  },
};

/**
 * The current version of this software. Either a release version (e.g. `v0.1.0`) or a short commit SHA.
 */
const version = getVersion();

let servers: Server[] = [];
const creatingServerNames = new Set<string>();
const creatingServerPorts = new Set<number>();
const systemUsage: ResourceUsage[] = [];

function getAvailablePort(servers: Server[]): number {
  const usedPorts = new Set(servers.map((server) => server.port));
  for (let port = 25565; port <= 65535; port++) {
    if (!usedPorts.has(port) && !creatingServerPorts.has(port)) return port;
  }
  throw new Error("No server port is available");
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const listener = net.createServer();
    listener.once("error", () => resolve(false));
    listener.listen(port, () => listener.close(() => resolve(true)));
  });
}

app.use(express.json());

const asyncHandler =
  (
    handler: (req: express.Request, res: express.Response) => Promise<void>
  ): express.RequestHandler =>
  (req, res, next) => {
    void handler(req, res).catch(next);
  };

// Handles queries to the version API endpoint and returns the version.
app.get("/api/version", (req, res) => {
  res.contentType("application/json");
  res.send({ version: version });
  res.status(200).end();
});

// Handles queries to the dependencies API endpoint and returns the backend dependencies.
app.get("/api/dependencies", (req, res) => {
  res.contentType("application/json");
  res.send({ dependencies: getDependencyInfo() });
  res.status(200).end();
});

app.get("/api/servers", async (req, res) => {
  await Promise.all(servers.map((server) => server.updateStatus()));
  res.json(Server.strip(servers));
});

app.post(
  "/api/servers",
  asyncHandler(async (req, res) => {
    const version = req.body?.version;
    const requestedName = req.body?.name;
    if (typeof version !== "string" || !/^\d+(\.\d+)+$/.test(version)) {
      res.status(400).json({ error: "Invalid Paper version" });
      return;
    }
    if (
      typeof requestedName !== "string" ||
      requestedName.trim() !== requestedName ||
      !/^[A-Za-z0-9 _.-]{1,64}$/.test(requestedName) ||
      requestedName === "." ||
      requestedName === ".."
    ) {
      res.status(400).json({ error: "Invalid server name" });
      return;
    }

    const requestedPort = req.body?.port;
    if (requestedPort !== undefined && requestedPort !== null) {
      if (
        !Number.isInteger(requestedPort) ||
        requestedPort < 1024 ||
        requestedPort > 65535
      ) {
        res.status(400).json({ error: "Invalid port" });
        return;
      }
      if (
        !(await isPortAvailable(requestedPort)) ||
        requestedPort === port ||
        creatingServerPorts.has(requestedPort) ||
        servers.some((server) => server.port === requestedPort)
      ) {
        res.status(409).json({ error: "Port is already in use" });
        return;
      }
    }

    let builds: { build: number; time: string }[];
    try {
      const versions = await listPaperVersions();
      if (!versions.includes(version)) {
        res.status(400).json({ error: "Paper version is not available" });
        return;
      }
      builds = await listPaperBuilds(version);
    } catch (error) {
      res.status(502).json({ error: "Could not load Paper versions" });
      return;
    }
    if (builds.length === 0) {
      res.status(409).json({ error: "No stable Paper build is available" });
      return;
    }

    const nameBase = requestedName;
    let name = nameBase;
    let suffix = 2;
    while (
      creatingServerNames.has(name) ||
      fs.existsSync(path.join(basePath, name))
    ) {
      name = `${nameBase}-${suffix++}`;
    }

    creatingServerNames.add(name);
    if (requestedPort) {
      if (
        !(await isPortAvailable(requestedPort)) ||
        requestedPort === port ||
        creatingServerPorts.has(requestedPort) ||
        servers.some((server) => server.port === requestedPort)
      ) {
        creatingServerNames.delete(name);
        res.status(409).json({ error: "Port is already in use" });
        return;
      }
      creatingServerPorts.add(requestedPort);
    }
    const serverPath = path.join(basePath, name);
    let createdDirectory = false;
    let registeredServer: Server | null = null;
    try {
      fs.mkdirSync(serverPath);
      createdDirectory = true;
      await installPaperJar(serverPath, {
        version,
        build: builds[0].build,
      });

      const server = new Server({ _name: name });
      server.port = requestedPort ?? getAvailablePort(servers);
      fs.writeFileSync(
        path.join(serverPath, "blockcluster.cfg"),
        JSON.stringify({ creationPort: server.port })
      );
      servers.push(server);
      registeredServer = server;
      await server.update();
      void server.start().catch((error) => {
        console.error("Could not start newly created Paper server:", error);
      });
      server.sendServerData();
      res.status(201).json(Server.strip([server])[0]);
    } catch (error) {
      if (registeredServer)
        servers = servers.filter((server) => server !== registeredServer);
      if (createdDirectory)
        fs.rmSync(serverPath, { recursive: true, force: true });
      console.error("Could not create Paper server:", error);
      res.status(502).json({ error: "Could not create Paper server" });
    } finally {
      creatingServerNames.delete(name);
      if (requestedPort) creatingServerPorts.delete(requestedPort);
    }
  })
);

app.get(
  "/api/servers/:name",
  asyncHandler(async (req, res) => {
    const server = servers.find((entry) => entry.name === req.params.name);
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }

    await server.update();
    res.json(Server.strip([server])[0]);
  })
);

app.get("/api/servers/:name/messages", (req, res) => {
  const server = servers.find((entry) => entry.name === req.params.name);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }

  res.json(server.getRecentMessages());
});

app.get("/api/java-runtimes", (req, res) => {
  res.json(getJavaRuntimes());
});

app.get("/api/system-usage", (req, res) => {
  res.json(systemUsage);
});

app.post("/api/servers/:name/actions", (req, res) => {
  const server = servers.find((entry) => entry.name === req.params.name);
  const actions = ["start", "stop", "pause", "restart", "deleteWorld"];
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (!actions.includes(req.body?.action)) {
    res.status(400).json({ error: "Invalid server action" });
    return;
  }

  const runAction = async () => {
    switch (req.body.action) {
      case "start":
        try {
          await server.start();
        } catch (error) {
          console.log("Could not start server:", error);
        }
        break;
      case "stop":
        await server.stop();
        break;
      case "pause":
        await server.pause();
        break;
      case "restart":
        await server.restart();
        break;
      case "deleteWorld":
        await server.deleteWorld();
        break;
    }
    await server.update();
    server.sendServerData();
  };

  void runAction().catch(console.error);
  res.status(202).end();
});

app.post("/api/servers/:name/commands", (req, res) => {
  const server = servers.find((entry) => entry.name === req.params.name);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  if (typeof req.body?.command !== "string") {
    res.status(400).json({ error: "Command must be a string" });
    return;
  }

  void server.executeCommand(req.body.command).catch(console.error);
  res.status(202).end();
});

app.patch(
  "/api/servers/:name/config",
  asyncHandler(async (req, res) => {
    const server = servers.find((entry) => entry.name === req.params.name);
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    if (
      req.body === null ||
      typeof req.body !== "object" ||
      Array.isArray(req.body)
    ) {
      res.status(400).json({ error: "Configuration must be an object" });
      return;
    }

    await server.updateConfig(req.body);
    res.status(204).end();
  })
);

app.get(
  "/api/paper/versions",
  asyncHandler(async (req, res) => {
    try {
      res.json(await listPaperVersions());
    } catch (error) {
      res.status(502).json({ error: "Could not load Paper versions" });
    }
  })
);

app.get(
  "/api/paper/versions/:version/builds",
  asyncHandler(async (req, res) => {
    const version = req.params.version;
    if (typeof version !== "string" || !/^\d+(\.\d+)+$/.test(version)) {
      res.status(400).json({ error: "Invalid version" });
      return;
    }
    try {
      res.json(await listPaperBuilds(version));
    } catch (error) {
      res.status(502).json({ error: "Could not load Paper builds" });
    }
  })
);

app.get(
  "/api/servers/:name/updates",
  asyncHandler(async (req, res) => {
    const server = servers.find((entry) => entry.name === req.params.name);
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    try {
      res.json(await server.getUpdates());
    } catch (error) {
      res.status(502).json({ error: "Could not check for updates" });
    }
  })
);

app.get("/api/servers/:name/oldjars", (req, res) => {
  const server = servers.find((entry) => entry.name === req.params.name);
  if (!server) {
    res.status(404).json({ error: "Server not found" });
    return;
  }
  res.json(server.getOldJars());
});

app.post(
  "/api/servers/:name/updates",
  asyncHandler(async (req, res) => {
    const server = servers.find((entry) => entry.name === req.params.name);
    if (!server) {
      res.status(404).json({ error: "Server not found" });
      return;
    }
    let type = req.body?.type;
    if (type === "existing") {
      if (typeof req.body.file !== "string") {
        res.status(400).json({ error: "Invalid file" });
        return;
      }
      type = { file: req.body.file };
    } else if (type === "version") {
      type = { version: req.body.version, build: req.body.build };
      if (
        typeof type.version !== "string" ||
        !/^\d+(\.\d+)+$/.test(type.version) ||
        !Number.isInteger(type.build)
      ) {
        res.status(400).json({ error: "Invalid version or build" });
        return;
      }
    } else if (type !== "build" && type !== "patch") {
      res.status(400).json({ error: "Invalid update type" });
      return;
    }
    try {
      await server.installUpdate(type);
      res.status(204).end();
    } catch (error) {
      res.status(409).json({ error: (error as Error).message });
    }
  })
);

app.use(express.static(path.join(__dirname, "../../../../dist")));

app.get("/{*splat}", (req, res) => {
  res.sendFile(path.join(__dirname, "../../../../dist/index.html"));
});

const port = process.env.NODE_ENV === "develop" ? 3001 : 8081;

const backend = app.listen(port, () =>
  console.log(
    "Backend (revision " + version + ") running on port " + port + "."
  )
);

/**
 * The base path for the minecraft servers.
 *
 * The minecraft server path is read from the environment variable `SERVER_PATH` if available.
 *
 * Otherwise the property `server-path` in file `settings.properties` is used (deprecated, this functionality will be removed by v1.0.0).
 *
 * By default its value is the directory `servers/` relative to the root directory of blockcluster.
 */
export const basePath: string = ((): string => {
  let basePath: string = process.env.SERVER_PATH ?? "";
  if (!basePath)
    try {
      const configuredPath = PropertiesReader({
        sourceFile: "./settings.properties",
      }).get("server-path");
      if (configuredPath == null) throw new Error("Missing server-path");
      basePath = configuredPath.toString();
    } catch (error) {
      basePath = "servers";
    }

  if (path.isAbsolute(basePath)) return basePath;
  return path.join(__dirname, "../../../..", basePath);
})();

/**
 * Returns a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 * @return a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 */
async function getServers(): Promise<Server[]> {
  const servers: Server[] = [];
  const uninitializedServers: Server[] = [];
  const propertiesFile = "server.properties";

  for (const file of fs.readdirSync(basePath)) {
    const serverPath = path.join(basePath, file);
    if (!fs.lstatSync(serverPath).isDirectory()) continue;
    const files = fs.readdirSync(serverPath);
    const hasProperties = files.includes(propertiesFile);
    if (!hasProperties && !files.some((entry) => entry.endsWith(".jar")))
      continue;

    const server = hasProperties
      ? new Server({
          _name: file,
          _properties: getPropertiesFromFile(
            PropertiesReader({
              sourceFile: path.join(serverPath, propertiesFile),
            }).getAllProperties() as ServerPropertiesFile
          ),
        })
      : new Server({ _name: file });
    let configuredPort: number | undefined;
    let config: (ServerConfig & { port?: number }) | undefined;
    try {
      const loadedConfig: ServerConfig & { port?: number } = JSON.parse(
        fs.readFileSync(path.join(serverPath, "blockcluster.cfg"), "utf8")
      );
      config = loadedConfig;
      const savedPort = loadedConfig.creationPort ?? loadedConfig.port;
      if (
        typeof savedPort === "number" &&
        Number.isInteger(savedPort) &&
        savedPort >= 1024 &&
        savedPort <= 65535
      ) {
        configuredPort = savedPort;
      }
    } catch {
      // Existing servers may not have a blockcluster config yet.
    }
    if (hasProperties) {
      if (config && ("creationPort" in config || "port" in config)) {
        delete config.creationPort;
        delete config.port;
        fs.writeFileSync(
          path.join(serverPath, "blockcluster.cfg"),
          JSON.stringify(config)
        );
      }
    } else if (configuredPort !== undefined) {
      if (
        configuredPort === port ||
        servers.some((server) => server.port === configuredPort)
      ) {
        console.error(
          `Could not restore port ${configuredPort} for server "${server.name}": port is already in use.`
        );
      } else server.port = configuredPort;
    } else uninitializedServers.push(server);
    servers.push(server);
  }
  for (const server of uninitializedServers) {
    server.port = getAvailablePort(servers);
  }
  return servers;
}

/**
 * Measures the current resource usage of the backend and adds it to the list.
 * @param measuringTime if set this time is used as the time parameter of the data points.
 */
async function measureUsage(measuringTime?: number) {
  try {
    const usage = await pidusage(process.pid);
    systemUsage.push(new ResourceUsage(measuringTime, usage.cpu, usage.memory));
  } catch (e) {
    systemUsage.push(new ResourceUsage(measuringTime, 0, 0));
    console.error(
      "Couldn't retrieve resource usage for the main pid " + process.pid + ".",
      e
    );
  }
  if (systemUsage.length > 60) systemUsage.shift();
}

/**
 * The socket io instance.
 */
export const io = new socketio.Server(backend, options);

getServers().then(async (loadedServers) => {
  servers = loadedServers;

  // Listen to a channel per server
  const time: number = Date.now();
  const watchedFiles: string[] = [];
  measureUsage(time).then(() => io.emit("SYSTEM_USAGE", systemUsage));
  for (const server of servers) {
    const watchFilePath = basePath + "/" + server.name + "/start";
    watchedFiles.push(watchFilePath);
    fs.watchFile(watchFilePath, async (curr) => {
      if (curr.isFile()) {
        await server.start();
        server.sendServerData();
        fs.unlinkSync(watchFilePath);
      }
    });
    await server.update();
    if (server.autostart) server.status = ServerStatus.Queued;
    server.measureUsage(time).then(() => {
      server.sendServerData();
    });
  }

  startServers(
    servers.filter((server) => server.status === ServerStatus.Queued)
  );

  const timeout = setInterval(async () => {
    const time: number = Date.now();
    await measureUsage(time);
    io.emit("SYSTEM_USAGE", systemUsage);
    for (const server of servers) {
      await server.measureUsage(time);
      server.sendServerData();
    }
  }, 10000);

  process.on("SIGTERM", async function () {
    await Promise.all(
      servers.map((server) => {
        if (server.status == ServerStatus.Started) return server.stop();
        return;
      })
    );

    watchedFiles.forEach((file) => fs.unwatchFile(file));
    clearTimeout(timeout);
    io.close(() => {
      console.log("Websocket stopped.");
      backend.close(() => {
        console.log("Backend stopped.");
      });
    });
  });
});

/**
 * Starts all provided asynchronously servers in the background.
 *
 * @param servers the servers to start.
 * @param sequentially whether to wait until one server is in {@link ServerStatus#Started} before starting the next one.
 */
function startServers(servers: Server[], sequentially = true): void {
  (async () => {
    // Start servers one after another
    for (const server of servers) {
      await server.start(sequentially);
    }
  })();
}
