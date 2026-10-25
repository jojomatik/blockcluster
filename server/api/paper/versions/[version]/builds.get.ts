import { defineEventHandler, getValidatedRouterParams } from "h3";
import { z } from "zod";
import { listPaperBuilds } from "../../../../components/paper";
import { errorResponse } from "../../../../utils/api";

const versionParamsSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)+$/),
});

export default defineEventHandler(async (event) => {
  let version: string;
  try {
    ({ version } = await getValidatedRouterParams(
      event,
      (params) => versionParamsSchema.parse(params),
      { decode: true },
    ));
  } catch {
    return errorResponse(event, 400, "Invalid version");
  }
  try {
    return await listPaperBuilds(version);
  } catch {
    return errorResponse(event, 502, "Could not load Paper builds");
  }
});
