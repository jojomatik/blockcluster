import { StatusResponse } from "minecraft-server-util/dist/model/StatusResponse";
import * as mc from "minecraft-server-util";

import CommonServer, { ServerStatus } from "../../../common/components/server";

import { basePath, io } from "../server";

import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import fs from "fs";

/**
 * The server side implementation of {@link CommonServer} with additional methods that won't run on the client side.
 */
export default class Server extends CommonServer {
  /**
   * The process of the minecraft server.
   * @private
   */
  private proc: ChildProcessWithoutNullStreams;

  /**
   * Updates {@link #status} as well as the selected jar file.
   */
  async update(): Promise<void> {
    await this.updateStatus();
    this.jar = this.getJarFile();
  }

  /**
   * Updates {@link #status} with the current status.
   */
  async updateStatus(): Promise<void> {
    try {
      await this.getServerInfo();
      if (this.status != ServerStatus.Stopping && this.proc != null)
        this.status = ServerStatus.Started;
    } catch (e) {
      if (this.status != ServerStatus.Starting)
        this.status = ServerStatus.Stopped;
    }
  }

  /**
   * Retrieves the current server info and returns it.
   *
   * @return a promise of the status response.
   */
  async getServerInfo(): Promise<StatusResponse> {
    return await mc
      .status("localhost", { port: this.port, timeout: 300 })
      .then((response) => {
        return response;
      })
      .catch((error) => {
        throw error;
      });
  }

  /**
   * Handles an incoming message from the client.
   *
   * @param command the message from the client.
   */
  async handleMessage(command: string): Promise<void> {
    switch (command) {
      case "start":
        this.status = ServerStatus.Starting;
        this.proc = spawn("java", ["-jar", this.getJarFile()], {
          cwd: basePath + "/" + this.name,
        });
        break;
      case "stop":
        this.status = ServerStatus.Stopping;
        exec("kill " + this.proc.pid, () => {
          this.proc = null;
        });
        break;
    }
    await this.update();
    this.sendServerData();
  }

  /**
   * Returns the first jar file in the server directory.
   * @private
   */
  private getJarFile(): string {
    const files = fs.readdirSync(basePath + "/" + this.name);
    return files.find((file) => file.endsWith(".jar"));
  }

  /**
   * Sends this {@link Server} to the client.
   *
   * Only fields in the common superclass are transported.
   * @private
   */
  private sendServerData() {
    io.emit("server_" + encodeURIComponent(this.name), {
      serverInfo: this.strip(),
    });
  }
}
