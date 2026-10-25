import { defineEventHandler } from "h3";
import { version } from "../backend";

// Handles queries to the version API endpoint and returns the version.
export default defineEventHandler(() => ({ version }));
