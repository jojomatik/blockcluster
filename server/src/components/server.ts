import { StatusResponse } from "minecraft-server-util/dist/model/StatusResponse";
import * as mc from "minecraft-server-util";

import CommonServer, { ServerStatus } from "../../../common/components/server";

import { basePath, io } from "../server";

import { exec } from "child_process";
import fs from "fs";

/**
 * The server side implementation of {@link CommonServer} with additional methods that won't run on the client side.
 */
export default class Server extends CommonServer {
  /**
   * The PID the minecraft server runs at.
   * @private
   */
  private pid: number;

  /**
   * Updates {@link #status} with the current status.
   */
  async updateStatus(): Promise<void> {
    try {
      await this.getServerInfo();
      if (this.status != ServerStatus.Stopping)
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
        this.pid = exec(
          "cd " +
            basePath +
            "/" +
            this.name +
            " && java -jar " +
            this.getJarFile()
        ).pid;
        break;
      case "stop":
        this.status = ServerStatus.Stopping;
        exec("kill " + this.pid, () => {
          this.pid = null;
        });
        break;
    }
    await this.updateStatus();
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
    io.emit("server_" + encodeURIComponent(this.name), this.stringify());
  }
}
