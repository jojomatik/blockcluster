import { defineEventHandler } from "h3";
import getDependencyInfo from "../utils/dependency_info";

// Handles queries to the dependencies API endpoint and returns the backend dependencies.
export default defineEventHandler(() => ({
  dependencies: getDependencyInfo(),
}));
