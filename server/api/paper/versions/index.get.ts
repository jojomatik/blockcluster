import { defineEventHandler } from "h3";
import { listPaperVersions } from "../../../components/paper";
import { throwApiError } from "../../../utils/api";

export default defineEventHandler(async () => {
  try {
    return await listPaperVersions();
  } catch {
    throwApiError(502, "Could not load Paper versions");
  }
});
