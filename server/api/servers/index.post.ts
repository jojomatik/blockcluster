import {
  createError,
  defineEventHandler,
  readValidatedBody,
  setResponseStatus,
} from "h3";
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
      throw createError({
        statusCode: 409,
        statusMessage: "Port is already in use",
        message: "Port is already in use",
      });
    }
  }

  let versions: string[];
  try {
    versions = await listPaperVersions();
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not load Paper versions",
      message: "Could not load Paper versions",
    });
  }
  if (!versions.includes(version)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Paper version is not available",
      message: "Paper version is not available",
    });
  }
  let builds: { build: number; time: string }[];
  try {
    builds = await listPaperBuilds(version);
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not load Paper versions",
      message: "Could not load Paper versions",
    });
  }
  const latestBuild = builds[0];
  if (!latestBuild) {
    throw createError({
      statusCode: 409,
      statusMessage: "No stable Paper build is available",
      message: "No stable Paper build is available",
    });
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
      throw createError({
        statusCode: 409,
        statusMessage: "Port is already in use",
        message: "Port is already in use",
      });
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
    throw createError({
      statusCode: 502,
      statusMessage: "Could not create Paper server",
      message: "Could not create Paper server",
    });
  } finally {
    creatingServerNames.delete(name);
    if (requestedPort) creatingServerPorts.delete(requestedPort);
  }
});
