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
            <img
              class="mr-2"
              style="height: 32px"
              v-if="server.favicon"
              v-bind:src="server.favicon"
              :alt="$t('gui.views.server.favicon.alt', { name: server.name })"
            />
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
                      <td>{{ $t("gui.views.server.players.title") }}</td>
                      <td>
                        <PlayerStatsComponent :player-stats="server.players" />
                      </td>
                    </tr>
                    <tr>
                      <td>{{ $t("gui.views.server.port") }}</td>
                      <td>{{ server.port }}</td>
                    </tr>
                    <tr>
                      <td>
                        {{ $t("gui.views.server.executable") }}
                      </td>
                      <td>{{ server.jar }}</td>
                    </tr>
                    <tr>
                      <td>
                        {{ $t("gui.views.server.autostart") }}
                      </td>
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
                      <td>
                        {{ $t("gui.views.server.pause_on_idle.title") }}
                      </td>
                      <td>
                        <v-switch
                          class="ma-auto mb-1"
                          hide-details
                          color="secondary"
                          v-bind:value="pauseOnIdle.enable"
                          @change="setPauseEnabled"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ $t("gui.views.server.pause_on_idle.timeout") }}
                      </td>
                      <td>
                        <v-text-field
                          hide-details
                          dense
                          single-line
                          type="number"
                          v-bind:value="pauseOnIdle.timeout"
                          @change="setPauseTimeout"
                        >
                        </v-text-field>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ $t("gui.views.server.java_runtime") }}
                      </td>
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
                    <FlagDialogComponent
                      :server="this"
                      :flags="this.server.flags"
                    />
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
              :disabled="
                !this.javaRuntimes
                  .map((runtime) => runtime.path)
                  .includes(this.server.javaPath)
              "
            />
            <StateChangeButtonComponent
              :server="this"
              :status="server.status"
              type="restart"
              :disabled="
                !this.javaRuntimes
                  .map((runtime) => runtime.path)
                  .includes(this.server.javaPath)
              "
            />
            <v-btn
              class="server-card-button"
              color="secondary"
              v-on:click="update"
            >
              <v-icon left light>mdi-reload</v-icon>
              {{ $t("gui.views.server.update_status") }}
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
      <img
        class="mr-2"
        style="height: 32px"
        v-if="server.favicon"
        v-bind:src="server.favicon"
        :alt="$t('gui.views.server.favicon.alt', { name: server.name })"
      />
      {{ server.name }}
      <ServerStatusComponent :status="server.status" />
      <v-chip v-if="server.status === ServerStatus.Started">
        <PlayerStatsComponent :player-stats="server.players" :width="24" />
      </v-chip>
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
                <td>{{ $t("gui.views.server.port") }}</td>
                <td>{{ server.port }}</td>
              </tr>
            </tbody>
          </v-simple-table>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn :to="'/server/' + encodeURIComponent(server.name)">
        {{ $t("gui.views.home.server.details") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import Server, {
  PauseOnIdleType,
  ServerStatus,
} from "../../common/components/server";
import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import StateChangeButtonComponent from "@/components/StateChangeButtonComponent.vue";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import WorldDeleteDialogComponent from "@/components/WorldDeleteDialogComponent.vue";
import JavaRuntime, {
  getDefaultRuntime,
} from "../../common/components/java_runtime";
import FlagDialogComponent from "@/components/FlagDialogComponent.vue";
import Player from "../../common/components/player";
import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: {
    PlayerStatsComponent,
    FlagDialogComponent,
    WorldDeleteDialogComponent,
    ResourceChartComponent,
    StateChangeButtonComponent,
    ConsoleComponent,
    ServerStatusComponent,
  },
  data() {
    return { ServerStatus, Player };
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

  constructor() {
    super();
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
        this.server.players.sample = this.server.players.sample.map(
          (player) => {
            return Object.assign(new Player(), player);
          }
        );
      }
    );
    if (this.detailed) {
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
    if (this.detailed) this.update();
  }

  /**
   * Unsubscribes the channels subscribed to in {@link #mounted}.
   */
  destroyed() {
    this.sockets.unsubscribe("server_" + encodeURIComponent(this.getName()));
    if (this.detailed) this.sockets.unsubscribe("JAVA_RUNTIMES");
  }

  /**
   * Sends a message `update` to the corresponding channel. The backend is expected to return the current status.
   * @private
   */
  private update(): void {
    this.sendMessage("update");
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
   * Returns the `pauseOnIdle` option of the server.
   */
  get pauseOnIdle(): PauseOnIdleType {
    return this.server.pauseOnIdle;
  }

  /**
   * Sets the `pauseOnIdle` option of the server.
   * @param value the `pauseOnIdle` option to be sent to the server.
   */
  set pauseOnIdle(value: PauseOnIdleType) {
    this.server.pauseOnIdle = value;
    this.sendMessage("set " + JSON.stringify({ pauseOnIdle: value }));
  }

  /**
   * Sets the `enabled` property of the `pauseOnIdle` option of the server.
   * @param value the `enabled` property of the `pauseOnIdle` option to be sent to the server.
   */
  setPauseEnabled(value: boolean | null) {
    const pauseOnIdle = this.pauseOnIdle;
    pauseOnIdle.enable = value === true;
    this.pauseOnIdle = pauseOnIdle;
  }

  /**
   * Sets the `timeout` property of the `pauseOnIdle` option of the server.
   * @param value the `timeout` property of the `pauseOnIdle` option to be sent to the server.
   */
  setPauseTimeout(value: string) {
    const pauseOnIdle = this.pauseOnIdle;
    pauseOnIdle.timeout = parseInt(value);
    this.pauseOnIdle = pauseOnIdle;
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
