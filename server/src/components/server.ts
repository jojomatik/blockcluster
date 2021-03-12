import { StatusResponse } from "minecraft-server-util/dist/model/StatusResponse";
import * as mc from "minecraft-server-util";

import CommonServer, {
  emptyServer,
  ServerStatus,
} from "../../../common/components/server";

import { io } from "../server";

/**
 * The server side implementation of {@link CommonServer} with additional methods that won't run on the client side.
 */
export default class Server extends CommonServer {
  /**
   * Updates {@link #status} with the current status.
   */
  async updateStatus(): Promise<void> {
    try {
      await this.getServerInfo();
      this.status = ServerStatus.Online;
    } catch (e) {
      this.status = ServerStatus.Offline;
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
    if (command === "update") {
      await this.updateStatus();
      this.sendServerData();
    }
  }

  /**
   * Sends this {@link Server} to the client.
   *
   * Only fields in the common superclass are transported.
   */
  sendServerData() {
    io.emit(
      "server_" + encodeURIComponent(this.name),
      JSON.stringify(this, (key, value) => {
        if (key === "" || key in emptyServer) return value;
        return undefined;
      })
    );
  }
}
