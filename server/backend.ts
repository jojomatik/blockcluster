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

import * as socketio from "socket.io";
import { useRuntimeConfig } from "nitropack/runtime";
import * as fs from "fs";
import PropertiesReader from "properties-reader";

import { ServerStatus } from "#shared/components/server";
import Server from "./components/server";
import path from "path";
import net from "net";
import type ServerConfig from "./components/server_config";

import { getVersion } from "#shared/version";
import type { ServerPropertiesFile } from "#shared/components/server_properties";
import { getPropertiesFromFile } from "#shared/components/server_properties";
import pidusage from "pidusage";
import ResourceUsage from "#shared/components/resource_usage";

/**
 * The current version of this software. Either a release version (e.g. `v0.1.0`) or a short commit SHA.
 */
export const version = getVersion(
  useRuntimeConfig().public.gitRef as string,
  useRuntimeConfig().public.gitSha as string,
);

/**
 * The port the web server of blockcluster is listening on.
 */
export const port = Number(process.env.NITRO_PORT ?? process.env.PORT ?? 3000);

export const servers: Server[] = [];
export const creatingServerNames = new Set<string>();
export const creatingServerPorts = new Set<number>();
export const systemUsage: ResourceUsage[] = [];

export function getAvailablePort(
  servers: Server[],
  unavailablePorts = new Set<number>(),
): number {
  const usedPorts = new Set(servers.map((server) => server.port));
  for (let port = 25565; port <= 65535; port++) {
    if (
      !usedPorts.has(port) &&
      !creatingServerPorts.has(port) &&
      !unavailablePorts.has(port)
    )
      return port;
  }
  throw new Error("No server port is available");
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const listener = net.createServer();
    listener.once("error", () => resolve(false));
    listener.listen(port, () => listener.close(() => resolve(true)));
  });
}

/**
 * The base path for the minecraft servers.
 *
 * The minecraft server path is read from the environment variable `SERVER_PATH` if available.
 *
 * Otherwise the property `server-path` in file `settings.properties` is used (deprecated, this functionality will be removed by v1.0.0).
 *
 * By default its value is the directory `servers/` relative to the working directory of blockcluster.
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
    } catch {
      basePath = "servers";
    }

  if (path.isAbsolute(basePath)) return basePath;
  return path.resolve(process.cwd(), basePath);
})();

/**
 * Returns a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 * @return a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 */
export async function getServers(): Promise<Server[]> {
  const servers: Server[] = [];
  const uninitializedServers: Server[] = [];
  const unavailablePorts = new Set<number>();
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
            }).getAllProperties() as ServerPropertiesFile,
          ),
        })
      : new Server({ _name: file });
    let configuredPort: number | undefined;
    let config: (ServerConfig & { port?: number }) | undefined;
    try {
      const loadedConfig: ServerConfig & { port?: number } = JSON.parse(
        fs.readFileSync(path.join(serverPath, "blockcluster.cfg"), "utf8"),
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
        try {
          fs.writeFileSync(
            path.join(serverPath, "blockcluster.cfg"),
            JSON.stringify(config),
          );
        } catch (error) {
          console.error(
            `Could not clean up legacy port config for server "${server.name}".`,
            error,
          );
        }
      }
    } else if (configuredPort !== undefined) {
      if (
        configuredPort === port ||
        servers.some((server) => server.port === configuredPort) ||
        !(await isPortAvailable(configuredPort))
      ) {
        console.error(
          `Could not restore port ${configuredPort} for server "${server.name}": port is unavailable.`,
        );
        unavailablePorts.add(configuredPort);
        uninitializedServers.push(server);
      } else server.port = configuredPort;
    } else uninitializedServers.push(server);
    servers.push(server);
  }
  for (const server of uninitializedServers) {
    server.port = getAvailablePort(servers, unavailablePorts);
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
      e,
    );
  }
  if (systemUsage.length > 60) systemUsage.shift();
}

/**
 * The socket io instance.
 */
export const io = new socketio.Server({ serveClient: false });

/**
 * The files watched for start requests of single servers.
 */
const watchedFiles: string[] = [];

let usageInterval: ReturnType<typeof setInterval> | undefined;

/**
 * Loads all servers, starts watching them and starts the servers configured to be started automatically.
 */
export async function startBackend(): Promise<void> {
  fs.mkdirSync(basePath, { recursive: true });
  const loadedServers = await getServers();
  servers.splice(0, servers.length, ...loadedServers);

  // Listen to a channel per server
  const time: number = Date.now();
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
    servers.filter((server) => server.status === ServerStatus.Queued),
  );

  usageInterval = setInterval(async () => {
    const time: number = Date.now();
    await measureUsage(time);
    io.emit("SYSTEM_USAGE", systemUsage);
    for (const server of servers) {
      await server.measureUsage(time);
      server.sendServerData();
    }
  }, 10000);
}

/**
 * Stops all running servers and the websocket.
 */
export async function stopBackend(): Promise<void> {
  await Promise.all(
    servers.map((server) => {
      if (server.status == ServerStatus.Started) return server.stop();
      return;
    }),
  );

  watchedFiles.forEach((file) => fs.unwatchFile(file));
  watchedFiles.length = 0;
  clearTimeout(usageInterval);
  await io.close();
  console.log("Websocket stopped.");
}

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
