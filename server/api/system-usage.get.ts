import { defineEventHandler } from "h3";
import { systemUsage } from "../backend";

export default defineEventHandler(() => systemUsage);
