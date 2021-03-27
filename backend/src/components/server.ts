import { StatusResponse } from "minecraft-server-util/dist/model/StatusResponse";
import * as mc from "minecraft-server-util";

import CommonServer, { ServerStatus } from "../../../common/components/server";

import { basePath, io } from "../backend";

import { ChildProcessWithoutNullStreams, exec, spawn } from "child_process";
import fs from "fs";
import Message, { MessageType } from "../../../common/components/message";

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
   * An array of the latest messages from the server.
   * @private
   */
  private messages: Message[] = [];

  /**
   * Updates {@link #status} as well as the selected jar file.
   */
  async update(): Promise<void> {
    await this.updateStatus();
    this.jar = this.getJarFile();
    this.flags = this.getFlags();
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
      if (this.status != ServerStatus.Starting && this.proc == null)
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
    // Split command at first space
    const commandArr = command.split(/^([^ ]+) ?(.*)$/);
    switch (commandArr[1]) {
      case "start":
        await this.start();
        break;
      case "stop":
        await this.stop();
        break;
      case "command":
        switch (commandArr[2]) {
          case "stop":
          case "restart":
            this.status = ServerStatus.Stopping;
            this.proc.addListener("exit", () => {
              this.proc = null;
            });
            break;
        }
        this.proc.stdin.write(commandArr[2] + "\n");
        break;
      case "getMessages":
        await this.sendConsoleMessage(this.messages, false);
        break;
      case "set":
        // eslint-disable-next-line no-case-declarations
        const data = JSON.parse(commandArr[2]);
        for (const key in data) {
          if (Object.prototype.hasOwnProperty.call(data, key)) {
            switch (key) {
              case "flags":
                this.flags = data[key];
                await this.writeFlags();
                break;
            }
          }
        }
        break;
    }
    await this.update();
    this.sendServerData();
  }

  /**
   * Sends one or multiple console message(s) to the frontend and adds it to the list of messages.
   *
   * If the list of messages is `>= 50` the first element is removed.
   *
   * @param message the message(s) to send.
   * @param cache if the message should be cached.
   * @private
   */
  private async sendConsoleMessage(message: Message | Message[], cache = true) {
    if (cache) {
      if (Array.isArray(message)) this.messages = this.messages.concat(message);
      else await this.messages.push(message as Message);
      if (this.messages.length > 50)
        this.messages = this.messages.slice(this.messages.length - 50);
    }
    await io.emit("server_" + encodeURIComponent(this.name), {
      message: message,
    });
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
   * Returns the flags found in the `flags.txt` file in the server directory.
   * @private
   */
  private getFlags(): string[] {
    try {
      return String(
        fs.readFileSync(basePath + "/" + this.name + "/flags.txt")
      ).split(" ");
    } catch (e) {
      return [];
    }
  }

  /**
   * Writes the flags to the `flags.txt` file in the server directory.
   * @private
   */
  private async writeFlags(): Promise<void> {
    await fs.writeFileSync(
      basePath + "/" + this.name + "/flags.txt",
      this.flags.join(" ")
    );
  }

  /**
   * Sends this {@link Server} to the client.
   *
   * Only fields in the common superclass are transported.
   */
  sendServerData() {
    io.emit("server_" + encodeURIComponent(this.name), {
      serverInfo: this.strip(),
    });
    if (
      this.status === ServerStatus.Starting ||
      this.status === ServerStatus.Stopping
    ) {
      setTimeout(async () => {
        await this.updateStatus();
        this.sendServerData();
      }, 1000);
    }
  }

  /**
   * Starts the {@link Server}.
   */
  public async start() {
    this.status = ServerStatus.Starting;
    this.proc = spawn("java", this.flags.concat(["-jar", this.getJarFile()]), {
      cwd: basePath + "/" + this.name,
    });
    this.proc.stdout.on("data", (data) => {
      const messages = data.toString().split("\n");
      messages.forEach(async (messageText: string) => {
        if (messageText !== "") {
          await this.sendConsoleMessage(
            new Message(MessageType.Default, messageText)
          );
        }
      });
    });

    this.proc.stderr.on("data", (data) => {
      const messages = data.toString().split("\n");
      messages.forEach(async (messageText: string) => {
        if (messageText !== "") {
          await this.sendConsoleMessage(
            new Message(MessageType.Error, messageText)
          );
        }
      });
    });
  }

  /**
   * Stops the {@link Server}.
   */
  public async stop() {
    this.status = ServerStatus.Stopping;
    exec("kill " + this.proc.pid, () => {
      this.proc.addListener("exit", () => {
        this.proc = null;
      });
    });
  }
}
