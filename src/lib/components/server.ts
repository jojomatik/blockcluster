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
import CommonServer from "../../../common/components/server";
import { socketIO } from "@/main";

/**
 * The client side implementation of {@link CommonServer} with additional methods that won't run on the client side.
 */
export default class Server extends CommonServer {
  /**
   * Sends the message to a channel named according to the {@link Server}'s name.
   * @param message the message to send.
   * @param name an override for the name of the server.
   * @private
   */
  sendMessage(message: string, name?: string): void {
    socketIO.emit("server_" + encodeURIComponent(name || this.name), message);
  }
}
