import { createError, defineEventHandler } from "h3";
import { listPaperVersions } from "../../../components/paper";

export default defineEventHandler(async () => {
  try {
    return await listPaperVersions();
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: "Could not load Paper versions",
      message: "Could not load Paper versions",
    });
  }
});
