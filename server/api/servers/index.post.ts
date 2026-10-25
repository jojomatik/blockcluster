import { defineEventHandler, readBody, setResponseStatus } from "h3";
import fs from "fs";
import path from "path";
import {
  basePath,
  creatingServerNames,
  creatingServerPorts,
  getAvailablePort,
  isPortAvailable,
  port,
  servers,
} from "../../backend";
import Server from "../../components/server";
import {
  installPaperJar,
  listPaperBuilds,
  listPaperVersions,
} from "../../components/paper";
import { errorResponse } from "../../utils/api";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const version = body?.version;
  const requestedName = body?.name;
  if (typeof version !== "string" || !/^\d+(\.\d+)+$/.test(version)) {
    return errorResponse(event, 400, "Invalid Paper version");
  }
  if (
    typeof requestedName !== "string" ||
    requestedName.trim() !== requestedName ||
    !/^[A-Za-z0-9 _.-]{1,64}$/.test(requestedName) ||
    requestedName === "." ||
    requestedName === ".."
  ) {
    return errorResponse(event, 400, "Invalid server name");
  }

  const requestedPort = body?.port;
  if (requestedPort !== undefined && requestedPort !== null) {
    if (
      !Number.isInteger(requestedPort) ||
      requestedPort < 1024 ||
      requestedPort > 65535
    ) {
      return errorResponse(event, 400, "Invalid port");
    }
    if (
      !(await isPortAvailable(requestedPort)) ||
      requestedPort === port ||
      creatingServerPorts.has(requestedPort) ||
      servers.some((server) => server.port === requestedPort)
    ) {
      return errorResponse(event, 409, "Port is already in use");
    }
  }

  let builds: { build: number; time: string }[];
  try {
    const versions = await listPaperVersions();
    if (!versions.includes(version)) {
      return errorResponse(event, 400, "Paper version is not available");
    }
    builds = await listPaperBuilds(version);
  } catch {
    return errorResponse(event, 502, "Could not load Paper versions");
  }
  if (builds.length === 0) {
    return errorResponse(event, 409, "No stable Paper build is available");
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
      return errorResponse(event, 409, "Port is already in use");
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
      JSON.stringify({ creationPort: server.port }),
    );
    servers.push(server);
    registeredServer = server;
    await server.update();
    void server.start().catch((error) => {
      console.error("Could not start newly created Paper server:", error);
    });
    server.sendServerData();
    setResponseStatus(event, 201);
    return Server.strip([server])[0];
  } catch (error) {
    if (registeredServer) {
      servers.splice(servers.indexOf(registeredServer), 1);
    }
    if (createdDirectory)
      fs.rmSync(serverPath, { recursive: true, force: true });
    console.error("Could not create Paper server:", error);
    return errorResponse(event, 502, "Could not create Paper server");
  } finally {
    creatingServerNames.delete(name);
    if (requestedPort) creatingServerPorts.delete(requestedPort);
  }
});
