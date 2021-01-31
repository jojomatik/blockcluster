import express from "express";
import * as socketio from "socket.io";

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
    console.log(data);
    io.emit("MESSAGE", "Server: " + data);
  });
});
