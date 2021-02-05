import express from "express";
import * as socketio from "socket.io";
import * as fs from "fs";
import PropertiesReader from "properties-reader";

import { ServerStatus } from "../../common/components/server";
import Server from "./components/server";

const app = express();

const server = app.listen(3001, () =>
  console.log("Backend running on port 3001.")
);

const options = {
  cors: {
    origin: ["http://localhost:8080"]
  }
};

const io = new socketio.Server(server, options);
io.on("connection", (socket: socketio.Socket) => {
  console.log(socket.id);
  socket.on("SEND_MESSAGE", async (data: string) => {
    const elem = JSON.parse(data);
    if (
      "servers" in elem &&
      Array.isArray(elem["servers"]) &&
      elem["servers"].length === 0
    ) {
      const servers: Server[] = [];
      const basePath: string = PropertiesReader(
        "__dirname/../settings.properties"
      )
        .get("server-path")
        .toString();
      const propertiesFile = "server.properties";

      for (const file of fs.readdirSync(basePath)) {
        const path = basePath + "/" + file;
        const isDir: boolean = fs.lstatSync(path).isDirectory();
        if (isDir && fs.readdirSync(path).includes(propertiesFile)) {
          const properties = PropertiesReader(path + "/" + propertiesFile);
          const port = Number.parseInt(properties.get("server-port") as string);
          const server = new Server(file, ServerStatus.Unknown, port);
          await server.updateStatus();
          servers.push(server);
        }
      }

      io.emit("MESSAGE", servers);
    }
  });
});
