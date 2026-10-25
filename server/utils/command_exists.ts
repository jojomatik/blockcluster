import { spawnSync } from "child_process";

/**
 * Returns whether the given command is available, either as an executable in the `PATH` or as a builtin of the shell.
 *
 * @param command the name of the command.
 */
export default function commandExists(command: string): boolean {
  if (process.platform === "win32") {
    return spawnSync("where", [command], { stdio: "ignore" }).status === 0;
  }
  return (
    spawnSync("sh", ["-c", 'command -v -- "$1"', "sh", command], {
      stdio: "ignore",
    }).status === 0
  );
}
