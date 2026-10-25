import { defineEventHandler } from "h3";
import { listPaperVersions } from "../../../components/paper";
import { errorResponse } from "../../../utils/api";

export default defineEventHandler(async (event) => {
  try {
    return await listPaperVersions();
  } catch {
    return errorResponse(event, 502, "Could not load Paper versions");
  }
});
