import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";

const app = express();
// Vue serve hot reload web-socket
app.use(
  "/",
  createProxyMiddleware(
    pathname => {
      return pathname.startsWith("/sockjs-node/");
    },
    {
      target: "http://localhost:8080",
      ws: true
    }
  )
);
// server web-socket
app.use(
  "/",
  createProxyMiddleware(
    pathname => {
      return pathname.startsWith("/socket.io/");
    },
    {
      target: "http://localhost:3001",
      ws: true
    }
  )
);
app.use(
  "/",
  createProxyMiddleware({
    target: "http://localhost:8080",
    // Remove path, if it has no file extension. Important for vue router.
    pathRewrite: { ".*\\/[^.]*$": "" }
  })
);
app.listen(80);
