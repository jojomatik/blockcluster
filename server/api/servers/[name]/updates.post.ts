import { defineEventHandler, readBody } from "h3";
import { emptyResponse, errorResponse, findServer } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  const server = findServer(event);
  if (!server) return errorResponse(event, 404, "Server not found");
  const body = await readBody(event);
  let type = body?.type;
  if (type === "existing") {
    if (typeof body.file !== "string") {
      return errorResponse(event, 400, "Invalid file");
    }
    type = { file: body.file };
  } else if (type === "version") {
    type = { version: body.version, build: body.build };
    if (
      typeof type.version !== "string" ||
      !/^\d+(\.\d+)+$/.test(type.version) ||
      !Number.isInteger(type.build)
    ) {
      return errorResponse(event, 400, "Invalid version or build");
    }
  } else if (type !== "build" && type !== "patch") {
    return errorResponse(event, 400, "Invalid update type");
  }
  try {
    await server.installUpdate(type);
    return emptyResponse(event, 204);
  } catch (error) {
    return errorResponse(event, 409, (error as Error).message);
  }
});
