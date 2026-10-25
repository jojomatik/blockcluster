import { defineEventHandler } from "h3";
import getDependencyInfo from "../utils/dependency_info";

let dependencyInfo: ReturnType<typeof getDependencyInfo> | undefined;

// Handles queries to the dependencies API endpoint and returns the backend dependencies.
export default defineEventHandler(() => ({
  dependencies: (dependencyInfo ??= getDependencyInfo()),
}));
