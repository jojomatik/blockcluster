import express from "express";
import * as socketio from "socket.io";

import Server from "../../common/components/server";

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
  socket.on("SEND_MESSAGE", (data: string) => {
    const servers: Server[] = [];
    JSON.parse(data).forEach((elem: Record<string, unknown>) =>
      servers.push(Object.assign(new Server("", 0), elem))
    );

    servers.forEach(server => (server.status = (server.status + 1) % 3));
    io.emit("MESSAGE", servers);
  });
});
