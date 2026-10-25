import { defineEventHandler, readValidatedBody, setResponseStatus } from "h3";
import fs from "fs";
import path from "path";
import { z } from "zod";
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

const createServerBodySchema = z.object({
  version: z
    .string()
    .regex(/^\d+(?:\.\d+)+$/, { error: "Invalid Paper version" }),
  name: z
    .string()
    .refine(
      (name) =>
        name.trim() === name &&
        /^[A-Za-z0-9 _.-]{1,64}$/.test(name) &&
        name !== "." &&
        name !== "..",
      { error: "Invalid server name" },
    ),
  port: z.number().int().min(1024).max(65535).nullable().optional(),
});

export default defineEventHandler(async (event) => {
  const {
    version,
    name: requestedName,
    port: requestedPort,
  } = await readValidatedBody(event, createServerBodySchema.parse);
  if (requestedPort !== undefined && requestedPort !== null) {
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
  const latestBuild = builds[0];
  if (!latestBuild) {
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
      build: latestBuild.build,
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
