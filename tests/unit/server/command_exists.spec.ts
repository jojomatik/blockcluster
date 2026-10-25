import { describe, expect, it } from "vitest";
import commandExists from "../../../server/utils/command_exists";

describe("commandExists", () => {
  it("detects available commands and rejects missing commands", () => {
    expect(commandExists("node")).toBe(true);
    expect(commandExists("blockcluster-command-that-does-not-exist")).toBe(
      false,
    );
  });
});
