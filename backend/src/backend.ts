import express from "express";
import * as socketio from "socket.io";
import * as fs from "fs";
import PropertiesReader from "properties-reader";

import { ServerStatus } from "../../common/components/server";
import Server from "./components/server";

const app = express();

const backend = app.listen(3001, () =>
  console.log("Backend running on port 3001.")
);

const options = {
  cors: {
    origin: ["http://localhost:8080"],
  },
};

/**
 * The base path for the servers.
 */
export const basePath: string = PropertiesReader("./settings.properties")
  .get("server-path")
  .toString();

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
      const server = new Server(file, ServerStatus.Unknown, port);
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
  for (const server of servers) {
    const watchFilePath = basePath + "/" + server.name + "/start";
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
  }

  process.on("SIGTERM", function () {
    servers.forEach(async (server) => {
      if (server.status == ServerStatus.Started) await server.stop();
    });
  });
});
