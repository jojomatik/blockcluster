import { createError, defineEventHandler, getValidatedRouterParams } from "h3";
import { z } from "zod";
import { listPaperBuilds } from "../../../../components/paper";

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
    throw createError({
      statusCode: 502,
      statusMessage: "Could not load Paper builds",
      message: "Could not load Paper builds",
    });
  }
});
