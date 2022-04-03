/*
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
*/

import { JavaStatusResponse } from "minecraft-server-util/dist/types/JavaStatusResponse";
import * as mc from "minecraft-server-util";

import CommonServer, {
  PauseOnIdleType,
  ServerStatus,
} from "../../../common/components/server";

import { basePath, io } from "../backend";

import { ChildProcessWithoutNullStreams, execSync, spawn } from "child_process";
import fs from "fs";
import Message, { MessageType } from "../../../common/components/message";
import ServerConfig from "./server_config";
import pidusage from "pidusage";
import commandExists from "command-exists";
import ResourceUsage from "../../../common/components/resource_usage";
import Player from "../../../common/components/player";
import { getFaceAsBase64 } from "pixelheads";
import { Client, createServer, Server as MCPServer } from "minecraft-protocol";
import { getJavaRuntimes } from "./java_runtime";

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
   * The config of this {@link Server}.
   * @private
   */
  private config: ServerConfig;

  /**
   * A timeout used while starting the server to check the status every second.
   * @private
   */
  private timeout: NodeJS.Timeout | null;

  /**
   * A timeout used to stop the server after a certain amount of inactivity.
   * @private
   */
  private idleTimeout?: NodeJS.Timeout;

  /**
   * A mock server used for listening for connecting clients to start the server.
   * @private
   */
  private wakeUpListener?: MCPServer;

  /**
   * Updates {@link #status} as well as the selected jar file.
   */
  async update(): Promise<void> {
    await this.updateStatus();
    this.jar = this.getJarFile();
    this.config = await this.readConfig();
    this.javaPath = this.getJavaPath();
    this.flags = await this.getFlags();
    this.autostart = this.config.autostart;
    this.pauseOnIdle = this.config.pauseOnIdle;
  }

  /**
   * Updates {@link #status} with the current status.
   */
  async updateStatus(): Promise<void> {
    try {
      const serverInfo = await this.getServerInfo();
      if (this.proc != null) {
        this.favicon = serverInfo.favicon;
        this.players = {
          max: serverInfo.players.max,
          online: serverInfo.players.online,
          sample:
            serverInfo.players.sample !== null
              ? await Promise.all(
                  serverInfo.players.sample.map(async (player) => {
                    return new Player(
                      player.id,
                      player.name,
                      await getFaceAsBase64(player.id)
                    );
                  })
                )
              : [],
        };
        if (this.status != ServerStatus.Stopping)
          this.status = ServerStatus.Started;
      }
    } catch (e) {
      if (
        this.status != ServerStatus.Starting &&
        this.status != ServerStatus.Paused &&
        this.proc == null
      )
        this.status = ServerStatus.Stopped;
      if (this.proc?.exitCode > 0) {
        this.status = ServerStatus.Stopped;
        this.proc = null;
      }
    }
  }

  /**
   * Retrieves the current server info and returns it.
   *
   * @return a promise of the status response.
   */
  async getServerInfo(): Promise<JavaStatusResponse> {
    return await mc
      .status("localhost", this.port, { timeout: 300 })
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
        try {
          await this.start();
        } catch (e) {
          console.log("Could not start server:", e);
        }
        break;
      case "stop":
        await this.stop();
        break;
      case "pause":
        await this.pause();
        break;
      case "restart":
        await this.restart();
        break;
      case "deleteWorld":
        await this.deleteWorld();
        break;
      case "command":
        switch (commandArr[2]) {
          case "stop":
          case "restart":
            this.status = ServerStatus.Stopping;
            break;
        }
        this.writeConsoleCommand(commandArr[2]);
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
                await this.writeConfig();
                break;
              case "autostart":
                this.autostart = data[key];
                await this.writeConfig();
                break;
              case "pauseOnIdle":
                this.pauseOnIdle = data[key];
                await this.writeConfig();
                break;
              case "javaRuntime":
                this.javaPath = data[key];
                await this.writeConfig();
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
      else this.messages.push(message as Message);
      if (this.messages.length > 50)
        this.messages = this.messages.slice(this.messages.length - 50);
    }
    io.emit("server_" + encodeURIComponent(this.name), {
      message: message,
    });
  }

  /**
   * Returns the first jar file in the server directory.
   * @private
   */
  private getJarFile(): string {
    const files = fs.readdirSync(this.getPath());
    return files.find((file) => file.endsWith(".jar"));
  }

  /**
   * Returns the first jar file in the server directory.
   * @private
   */
  private getJavaPath(): string {
    return this.config.javaPath;
  }

  /**
   * Returns the flags found in the `flags.txt` file in the server directory.
   * @private
   */
  private async getFlags(): Promise<string[]> {
    try {
      if (this.config.flags.length == 0) {
        this.config.flags = String(
          fs.readFileSync(this.getPath() + "/flags.txt")
        ).split(" ");
        fs.unlinkSync(this.getPath() + "/flags.txt");
        await this.writeConfig();
      }
      return this.config.flags;
    } catch (e) {
      return [];
    }
  }

  /**
   * Reads the config from the `blockcluster.cfg` file in the server directory.
   * @private
   */
  private async readConfig(): Promise<ServerConfig> {
    let conf: ServerConfig;
    try {
      conf = Object.assign(
        new ServerConfig(),
        JSON.parse(
          String(fs.readFileSync(this.getPath() + "/blockcluster.cfg"))
        )
      );
    } catch (e) {
      conf = new ServerConfig();
    }
    return conf;
  }

  /**
   * Writes the config to the `blockcluster.cfg` file in the server directory.
   * @private
   */
  private async writeConfig(): Promise<void> {
    await fs.writeFileSync(
      this.getPath() + "/blockcluster.cfg",
      JSON.stringify(this.config),
      { mode: 0o666 }
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
    if (this.status === ServerStatus.Starting && this.timeout == null) {
      this.timeout = setInterval(async () => {
        await this.updateStatus();
        if (this.status != ServerStatus.Starting) this.sendServerData();
      }, 1000);
    } else if (this.timeout != null) {
      clearInterval(this.timeout);
      this.timeout = null;
    }
  }

  /**
   * Starts the {@link Server}.
   */
  public async start() {
    if (this.status === ServerStatus.Paused) {
      this.wakeUpListener.close();
    }

    this.status = ServerStatus.Starting;
    const permissionPrefix = commandExists.sync("umask")
      ? "umask 0000 && "
      : "";

    const javaExists = getJavaRuntimes()
      .map((runtime) => runtime.path)
      .includes(this.javaPath);

    if (!javaExists) {
      this.status = ServerStatus.Stopped;
      const error = new Error(
        "Java runtime " + this.javaPath + " does not exist."
      );
      await this.sendConsoleMessage(
        new Message(
          MessageType.Error,
          "Could not start server: " + error.message
        )
      );
      throw error;
    }

    this.proc = spawn(
      permissionPrefix + '"' + this.javaPath + '/bin/java"',
      this.flags.concat(["-jar", this.getJarFile(), "nogui"]),
      {
        cwd: this.getPath(),
        shell: true,
      }
    );
    if (this.pauseOnIdle.enable) this.startPauseTimeout();
    this.proc.stdout.on("data", (data) => {
      const messages = data.toString().split("\n");
      messages.forEach(async (messageText: string) => {
        if (messageText !== "") {
          const message = new Message(MessageType.Default, messageText);
          // Handle message in backend.
          await this.handleConsoleMessage(message);
          // Send message to the frontend.
          await this.sendConsoleMessage(message);
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
  public async stop(): Promise<void> {
    if (this.status == ServerStatus.Paused) {
      this.wakeUpListener.close();
      this.status = ServerStatus.Stopped;
      await this.update();
      this.sendServerData();
      await this.sendConsoleMessage(
        new Message(
          MessageType.Blockcluster,
          "Server has stopped listening for connections."
        )
      );
      return;
    }
    this.status = ServerStatus.Stopping;
    await this.update();
    this.sendServerData();
    return new Promise<void>((resolve) => {
      this.proc.addListener("exit", async () => {
        this.proc = null;
        await this.update();
        this.sendServerData();
        resolve();
      });
      this.writeConsoleCommand("stop");
    });
  }

  /**
   * Restarts the {@link Server}.
   */
  public async restart() {
    await this.stop();
    try {
      await this.start();
    } catch (e) {
      console.log("Could not restart server:", e);
    }
  }

  /**
   * Pauses this {@link Server} and waits for a connection by a client.
   */
  public async pause() {
    await this.stop();

    await this.waitForConnection();
  }

  /**
   * Waits for a connection by a client and starts the server, if a client connects.
   */
  public async waitForConnection() {
    this.status = ServerStatus.Paused;
    this.sendServerData();
    this.wakeUpListener = createServer({
      port: this.port,
      "online-mode": this.properties.onlineMode,
      motd:
        "§7[§3blockcluster§7] ⏸ PAUSED ⏸ §7[§3Join to start§7]\n§r" +
        this.properties.motd.replaceAll("\\u00A7", "§"),
      maxPlayers: this.properties.maxPlayers,
      favicon: this.favicon,
    });

    this.wakeUpListener.on("listening", async () => {
      await this.sendConsoleMessage(
        new Message(
          MessageType.Blockcluster,
          "Server is paused and waiting to be woken up."
        )
      );
    });

    this.wakeUpListener.on("login", async (client: Client) => {
      await this.sendConsoleMessage(
        new Message(
          MessageType.Blockcluster,
          "Player " + client.username + " tried to login. Server is waking up."
        )
      );
      client.end(
        "§7[§3blockcluster§7]§r\nThe server is now waking up.\nPlease try again in a few seconds."
      );
      this.wakeUpListener.close();
      try {
        await this.start();
      } catch (e) {
        console.log("Could not start server:", e);
      }
    });
  }

  /**
   * Handles a console {@link Message}, by calling all relevant methods based on the contents of the {@link Message}.
   * @param message the {@link Message} that should be handled.
   * @private
   */
  private async handleConsoleMessage(message: Message): Promise<void> {
    // Retrieve player count and sample for join- and leave-messages.
    const isJoinMessage =
      /: [^ ]+\[\/\d{1,3}.\d{1,3}.\d{1,3}.\d{1,3}:.\d{1,5}] logged in with entity id \d+ at \((?:\[.+])?\d+.\d+, .\d+.\d+, .\d+.\d+\)/.test(
        message.text
      );
    const isLeaveMessage = /: [^ ]+ lost connection: .+/.test(message.text);
    if (isJoinMessage || isLeaveMessage) {
      // Wait 500ms before updating, as the player count is not refreshed immediately.
      setTimeout(() => {
        this.updateStatus().then(() => {
          this.sendServerData();

          if (
            this.pauseOnIdle.enable &&
            isLeaveMessage &&
            this.players.online === 0
          ) {
            this.startPauseTimeout();
          }

          if (isJoinMessage && this.idleTimeout) {
            this.stopPauseTimeout();
            this.broadcastMessage(
              "The scheduled server stop has been cancelled, as there are players online again."
            );
          }
        });
        // Wait another 4.5s before updating, as the player sample is not refreshed immediately.
        setTimeout(() => {
          this.updateStatus().then(() => this.sendServerData());
        }, 4500);
      }, 500);
    }
  }

  /**
   * Starts {@link #idleTimeout} and stops the server after the defined time if it is not interrupted.
   */
  startPauseTimeout() {
    const timeoutLength = this.pauseOnIdle.timeout;
    this.idleTimeout = setTimeout(async () => {
      if (this.pauseOnIdle.enable) {
        this.broadcastMessage(
          "This server will stop now, as no players are currently online."
        );
        await this.pause();
      } else {
        this.broadcastMessage(
          "The scheduled server stop has been cancelled, as sleep-on-idle has been disabled."
        );
      }
      this.idleTimeout = undefined;
    }, timeoutLength * 1000);
    this.broadcastMessage(
      "This server will stop in " +
        timeoutLength +
        "s, as no players are currently online."
    );
  }

  /**
   * Stops the pause timeout.
   */
  stopPauseTimeout() {
    clearInterval(this.idleTimeout);
    this.idleTimeout = undefined;
  }

  /**
   * Writes a command to `stdin` of the current process.
   * @param command the command to send.
   * @private
   */
  private writeConsoleCommand(command: string) {
    this.proc.stdin.write(command + "\n");
  }

  /**
   * Broadcasts a message on the server and sends a copy to the frontend.
   * @param message the message to broadcast.
   * @private
   */
  private broadcastMessage(message: string) {
    this.sendConsoleMessage(
      new Message(MessageType.Blockcluster, message)
    ).then(() => {
      this.writeConsoleCommand(
        'tellraw @a "§7[§3blockcluster§7]§r ' + message + '"'
      );
    });
  }

  /**
   * Deletes the world defined in {@code server.properties} and stops and starts the server again if it was started.
   * @param gracefully whether the current {@link ServerStatus} should be checked and the server stopped in case it is currently running.
   * @param previousStatus the {@link ServerStatus} the server should return to after deleting the world.
   * @private
   */
  private async deleteWorld(gracefully = true, previousStatus = this.status) {
    if (this.status === ServerStatus.Stopped || gracefully === false) {
      execSync("rm -r " + this.getPath() + "/" + this.world);
      execSync("rm -r " + this.getPath() + "/" + this.world + "_nether");
      execSync("rm -r " + this.getPath() + "/" + this.world + "_the_end");
      if (previousStatus === ServerStatus.Started)
        try {
          await this.start();
        } catch (e) {
          console.log("Could not restart server:", e);
        }
    } else {
      const currentStatus = this.status;
      if (currentStatus === ServerStatus.Started) await this.stop();
      await this.deleteWorld(false, currentStatus);
    }
  }

  /**
   * Returns the path of this {@link Server}.
   *
   * @private
   */
  private getPath(): string {
    return basePath + "/" + this.name;
  }

  /**
   * Returns the flags from the config.
   */
  get flags(): string[] {
    return this.config.flags;
  }

  /**
   * Sets a new value for {@link #flags}.
   * @param value the new value.
   */
  set flags(value: string[]) {
    super.flags = value;
    this.config.flags = value;
  }

  /**
   * Returns {@link #autostart}.
   */
  get autostart(): boolean {
    return this.config.autostart;
  }

  /**
   * Sets a new value for {@link #autostart}.
   * @param value the new value.
   */
  set autostart(value: boolean) {
    super.autostart = value;
    this.config.autostart = value;
  }

  /**
   * Returns {@link #_pauseOnIdle}.
   */
  get pauseOnIdle(): PauseOnIdleType {
    return this.config.pauseOnIdle;
  }

  /**
   * Sets a new value for {@link #_pauseOnIdle}.
   * @param value the new value.
   */
  set pauseOnIdle(value: PauseOnIdleType) {
    super.pauseOnIdle = value;
    this.config.pauseOnIdle = value;
  }

  /**
   * Returns {@link #_javaPath}.
   */
  get javaPath(): string | null {
    return this.config.javaPath;
  }

  /**
   * Sets a new value for {@link #_javaPath}.
   * @param value the new value.
   */
  set javaPath(value: string | null) {
    super.javaPath = value;
    this.config.javaPath = value;
  }

  /**
   * Measures the current resource usage and adds it to the list.
   * @param measuringTime if set this time is used as the time parameter of the data points.
   */
  async measureUsage(measuringTime?: number) {
    if (this.proc != null) {
      try {
        const usage = await pidusage(this.proc.pid);
        this.resourceUsage.push(
          new ResourceUsage(measuringTime, usage.cpu, usage.memory)
        );
      } catch (e) {
        this.resourceUsage.push(new ResourceUsage(measuringTime, 0, 0));
        console.error(
          "Couldn't retrieve resource usage for pid " +
            this.proc.pid +
            " on server " +
            this.name +
            ".",
          e
        );
      }
    } else {
      this.resourceUsage.push(new ResourceUsage(measuringTime, 0, 0));
    }
    if (this.resourceUsage.length > 60) this.resourceUsage.shift();
  }
}
