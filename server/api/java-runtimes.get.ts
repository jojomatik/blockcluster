import { defineEventHandler } from "h3";
import { getJavaRuntimes } from "../components/java_runtime";

export default defineEventHandler(() => getJavaRuntimes());
