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

import dotenv from "dotenv";
import dotenvExpand from "dotenv-expand";
dotenvExpand(dotenv.config({ path: "../.env" }));
dotenvExpand(dotenv.config({ path: "../.env.local" }));

import { getVersion } from "../../common/version";
import { getJavaRuntimes } from "./components/java_runtime";
import getDependencyInfo from "./utils/dependency_info";

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

// Handles queries to the version API endpoint and returns the version.
app.get("/api/version", async (req, res) => {
  res.contentType("application/json");
  res.send({ version: version });
  res.status(200).end();
});

// Handles queries to the dependencies API endpoint and returns the backend dependencies.
app.get("/api/dependencies", async (req, res) => {
  res.contentType("application/json");
  res.send({ dependencies: getDependencyInfo() });
  res.status(200).end();
});

app.use(express.static(path.join(__dirname, "../../../../dist")));

app.get("*", (req, res) => {
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
 * By default its value is the directory `servers/` relative to the root directory of blockcluster.
 */
export const basePath: string = ((): string => {
  let basePath: string = process.env.SERVER_PATH;
  if (!basePath) basePath = "servers";

  if (path.isAbsolute(basePath)) return basePath;
  return path.join(__dirname, "../../../..", basePath);
})();

/**
 * Returns a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 * @return a promise for an array of {@link Server}s based on base directory from `settings.properties`.
 */
async function getServers(): Promise<Server[]> {
  const servers: Server[] = [];
  const propertiesFile = "server.properties";

  for (const file of fs.readdirSync(basePath)) {
    const path = basePath + "/" + file;
    const isDir: boolean = fs.lstatSync(path).isDirectory();
    if (isDir && fs.readdirSync(path).includes(propertiesFile)) {
      const properties = PropertiesReader(path + "/" + propertiesFile);
      const port = Number.parseInt(properties.get("server-port") as string);
      const world = properties.get("level-name") as string;
      const server = new Server(file, ServerStatus.Unknown, port, world);
      servers.push(server);
    }
  }
  return servers;
}

/**
 * The socket io instance.
 */
export const io = new socketio.Server(backend, options);

getServers().then((servers) => {
  io.on("connection", async (socket: socketio.Socket) => {
    console.log(socket.id);
    // Listen to general channel
    await socket.on("SEND_MESSAGE", async (data: string) => {
      const elem = JSON.parse(data);
      if (
        "servers" in elem &&
        Array.isArray(elem["servers"]) &&
        elem["servers"].length === 0
      ) {
        await Promise.all(servers.map(async (server) => await server.update()));
        io.emit("MESSAGE", Server.strip(servers));
      }
    });

    // Respond with the available java runtimes when a message is received on `JAVA_RUNTIMES`.
    socket.on("JAVA_RUNTIMES", () => {
      io.emit("JAVA_RUNTIMES", getJavaRuntimes());
    });

    // Listen to a channel per server
    for (const server of servers) {
      await socket.on(
        "server_" + encodeURIComponent(server.name),
        async (data: string) => {
          await server.handleMessage(data);
        }
      );
    }
  });

  // Listen to a channel per server
  const time: number = Date.now();
  const watchedFiles: string[] = [];
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
    server.update().then(async () => {
      if (server.autostart) {
        await server.start();
      }
    });
    server.measureUsage(time).then(() => {
      server.sendServerData();
    });
  }

  const timeout = setInterval(async () => {
    const time: number = Date.now();
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
