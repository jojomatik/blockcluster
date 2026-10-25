import { defineEventHandler, getRouterParam } from "h3";
import { listPaperBuilds } from "../../../../components/paper";
import { errorResponse } from "../../../../utils/api";

export default defineEventHandler(async (event) => {
  const version = getRouterParam(event, "version", { decode: true });
  if (typeof version !== "string" || !/^\d+(\.\d+)+$/.test(version)) {
    return errorResponse(event, 400, "Invalid version");
  }
  try {
    return await listPaperBuilds(version);
  } catch {
    return errorResponse(event, 502, "Could not load Paper builds");
  }
});
