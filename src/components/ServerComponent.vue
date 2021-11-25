<!--
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
-->

<template>
  <v-container v-if="detailed" class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card class="server">
          <v-card-title>
            {{ server.name }}
            <ServerStatusComponent :status="server.status" />
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col>
                <v-simple-table>
                  <colgroup>
                    <col style="width: calc(100% / 8)" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td>Port</td>
                      <td>{{ server.port }}</td>
                    </tr>
                    <tr>
                      <td>Executable</td>
                      <td>{{ server.jar }}</td>
                    </tr>
                    <tr>
                      <td>Autostart</td>
                      <td>
                        <v-switch
                          class="ma-auto mb-1"
                          hide-details
                          color="secondary"
                          v-model="autostart"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Java Runtime</td>
                      <td style="display: flex; flex-direction: row">
                        <v-select
                          hide-details
                          dense
                          :items="javaRuntimes"
                          :item-text="
                            (item) =>
                              `${item.isDefault ? 'Default - ' : ''}${
                                item.name
                              } - ${item.path}`
                          "
                          item-value="_path"
                          item-color="secondary"
                          class="mt-2 pr-2"
                          v-model="javaRuntime"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>Flags</td>
                      <td style="display: flex; flex-direction: row">
                        <v-text-field
                          hide-details
                          dense
                          class="mt-2 pr-2"
                          v-model="flagString"
                        />
                        <v-btn
                          dense
                          class="mt-1"
                          color="secondary"
                          @click="sendFlags()"
                        >
                          Save
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
            <ResourceChartComponent
              :resource-usage="this.server.resourceUsage"
            />
            <ConsoleComponent :server="this" :status="server.status" />
          </v-card-text>
          <v-card-actions class="px-4">
            <StateChangeButtonComponent
              :server="this"
              :status="server.status"
              type="toggle"
            />
            <StateChangeButtonComponent
              :server="this"
              :status="server.status"
              type="restart"
            />
            <v-btn
              class="server-card-button"
              color="secondary"
              v-on:click="update"
            >
              <v-icon left light>mdi-reload</v-icon>
              Update Status
            </v-btn>
            <WorldDeleteDialogComponent
              buttonClass="ml-auto"
              :server="this"
              :status="server.status"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-card
    v-else
    :to="'/server/' + encodeURIComponent(server.name)"
    class="server"
  >
    <v-card-title>
      {{ server.name }}
      <ServerStatusComponent :status="server.status" />
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <v-simple-table>
            <colgroup>
              <col style="width: calc(100% / 4)" />
            </colgroup>
            <tbody>
              <tr>
                <td>Port</td>
                <td>{{ server.port }}</td>
              </tr>
            </tbody>
          </v-simple-table>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn :to="'/server/' + encodeURIComponent(server.name)">
        Details
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import Server, { ServerStatus } from "../../common/components/server";
import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import StateChangeButtonComponent from "@/components/StateChangeButtonComponent.vue";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import WorldDeleteDialogComponent from "@/components/WorldDeleteDialogComponent.vue";
import JavaRuntime, {
  getDefaultRuntime,
} from "../../common/components/java_runtime";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: {
    WorldDeleteDialogComponent,
    ResourceChartComponent,
    StateChangeButtonComponent,
    ConsoleComponent,
    ServerStatusComponent,
  },
  data() {
    return { ServerStatus };
  },
})
export default class ServerComponent extends Vue {
  /**
   * The linked {@link Server}.
   * @private
   */
  @Prop() private server!: Server;

  /**
   * Whether the {@link Server} is viewed in detailed mode or not.
   * @private
   */
  @Prop() private detailed!: boolean;

  /**
   * The list of available {@link JavaRuntime}s.
   * @private
   */
  private javaRuntimes: JavaRuntime[] = [];

  /**
   * The flags that are currently written in the flag input.
   * @private
   */
  private _flagString!: string;

  constructor() {
    super();
    this.update();
  }

  /**
   * Listens to a channel named according to the {@link Server}'s name for updated information.
   */
  mounted() {
    this.sockets.subscribe(
      "server_" + encodeURIComponent(this.getName()),
      async (data: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(data, "serverInfo"))
          Object.assign(this.server, data["serverInfo"]);
      }
    );
    this.sockets.subscribe(
      "JAVA_RUNTIMES",
      (data: Record<string, unknown>[]) => {
        this.javaRuntimes = [];
        data.forEach((elem: Record<string, unknown>) => {
          this.javaRuntimes.push(Object.assign(new JavaRuntime(), elem));
        });
      }
    );
    this.$socket.emit("JAVA_RUNTIMES");
  }

  /**
   * Unsubscribes the channels subscribed to in {@link #mounted}.
   */
  destroyed() {
    this.sockets.unsubscribe("server_" + encodeURIComponent(this.getName()));
    this.sockets.unsubscribe("JAVA_RUNTIMES");
  }

  /**
   * Sends a message `update` to the corresponding channel. The backend is expected to return the current status.
   * @private
   */
  private update(): void {
    this.sendMessage("update");
  }

  /**
   * Sends the flags to the backend.
   */
  private sendFlags() {
    this.sendMessage(
      "set " + JSON.stringify({ flags: this._flagString?.split(" ") })
    );
  }

  /**
   * Sends the message to a channel named according to the {@link Server}'s name.
   * @param message the message to send.
   * @private
   */
  sendMessage(message: string): void {
    this.$socket.emit("server_" + encodeURIComponent(this.getName()), message);
  }

  /**
   * Returns the name of the {@link Server}. If no server is loaded yet the server name is taken from the route params.
   * @return the name of the {@link Server}.
   * @private
   */
  getName(): string {
    return this.server.name !== ""
      ? this.server.name
      : this.$route.params["server"];
  }

  /**
   * Returns the flag String based on the flags of the server.
   */
  get flagString(): string {
    this.flagString = this.server.flags.join(" ");
    return this._flagString;
  }

  /**
   * Sets the flagString.
   * @param flags the flags to set.
   */
  set flagString(flags: string) {
    this._flagString = flags;
  }

  /**
   * Returns the autostart option of the server.
   */
  get autostart(): boolean {
    return this.server.autostart;
  }

  /**
   * Sets the autostart option of the server.
   * @param value the autostart option to be sent to the server.
   */
  set autostart(value: boolean) {
    this.server.autostart = value;
    this.sendMessage("set " + JSON.stringify({ autostart: value }));
  }

  /**
   * Returns the selected {@link JavaRuntime} for the server.
   */
  get javaRuntime(): JavaRuntime | null {
    for (const javaRuntime of this.javaRuntimes) {
      if (javaRuntime.path === this.server.javaPath) return javaRuntime;
    }
    return null;
  }

  /**
   * Sets the selected {@link JavaRuntime} for the server.
   * @param value the selected java runtime to be sent to the server.
   */
  set javaRuntime(value: JavaRuntime | null) {
    let javaRuntime: JavaRuntime | null;

    if (value != null) javaRuntime = value;
    else javaRuntime = getDefaultRuntime(this.javaRuntimes);

    this.server.javaPath = javaRuntime.path;
    this.sendMessage("set " + JSON.stringify({ javaRuntime: value }));
  }
}
</script>

<style scoped></style>
