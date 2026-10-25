import { defineEventHandler, getValidatedRouterParams } from "h3";
import { z } from "zod";
import { listPaperBuilds } from "../../../../components/paper";
import { errorResponse } from "../../../../utils/api";

const versionParamsSchema = z.object({
  version: z.string().regex(/^\d+(?:\.\d+)+$/),
});

export default defineEventHandler(async (event) => {
  const { version } = await getValidatedRouterParams(
    event,
    versionParamsSchema.parse,
    { decode: true },
  );
  try {
    return await listPaperBuilds(version);
  } catch {
    return errorResponse(event, 502, "Could not load Paper builds");
  }
});
