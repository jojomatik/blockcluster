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
                      <td>
                        {{ server.jar }}
                        <VersionDialogComponent
                          :server="server"
                          :disabled="server.status !== ServerStatus.Stopped"
                          :updates="updates"
                          @installed="onVersionInstalled"
                        />
                      </td>
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
                      :server="server"
                      :flags="this.server.flags"
                    />
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
            <ResourceChartComponent
              :resource-usage="this.server.resourceUsage"
            />
            <ConsoleComponent
              :server="server"
              :status="server.status"
              @eula-required="showEulaDialog"
            />
            <v-dialog v-model="eulaDialog" persistent max-width="500px">
              <v-card>
                <v-card-title>
                  {{ $t("gui.views.server.eula.title") }}
                </v-card-title>
                <v-card-text>
                  <p>{{ $t("gui.views.server.eula.description") }}</p>
                  <p>
                    <a
                      href="https://www.minecraft.net/en-us/eula"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ $t("gui.views.server.eula.link") }}
                    </a>
                  </p>
                  <v-checkbox
                    v-model="eulaAccepted"
                    :label="$t('gui.views.server.eula.accept')"
                  />
                  <v-alert v-if="eulaError" type="error" dense>
                    {{ eulaError }}
                  </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                  <v-btn text :disabled="eulaLoading" @click="cancelEula">
                    {{ $t("gui.views.server.eula.cancel") }}
                  </v-btn>
                  <v-btn
                    color="secondary"
                    :disabled="!eulaAccepted || eulaLoading"
                    :loading="eulaLoading"
                    @click="acceptEula"
                  >
                    {{ $t("gui.views.server.eula.start") }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-card-text>
          <v-card-actions class="px-4">
            <ToggleButtonComponent
              :status="server.status"
              :disabled="
                !this.javaRuntimes
                  .map((runtime) => runtime.path)
                  .includes(this.server.javaPath)
              "
              @start="handleAction('start')"
              @stop="handleAction('stop')"
            />
            <RestartButtonComponent
              :status="server.status"
              :disabled="
                !this.javaRuntimes
                  .map((runtime) => runtime.path)
                  .includes(this.server.javaPath)
              "
              @restart="handleAction('restart')"
            />
            <PauseButtonComponent
              :status="server.status"
              :disabled="
                !this.javaRuntimes
                  .map((runtime) => runtime.path)
                  .includes(this.server.javaPath)
              "
              @pause="handleAction('pause')"
              @unpause="handleAction('start')"
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
              :server="server"
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

import Server from "@/lib/components/server";
import { PauseOnIdleType, ServerStatus } from "../../common/components/server";
import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import VersionDialogComponent from "@/components/VersionDialogComponent.vue";
import WorldDeleteDialogComponent from "@/components/WorldDeleteDialogComponent.vue";
import JavaRuntime, {
  getDefaultRuntime,
} from "../../common/components/java_runtime";
import FlagDialogComponent from "@/components/FlagDialogComponent.vue";
import Player from "../../common/components/player";
import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";
import ToggleButtonComponent from "@/components/buttons/ToggleButtonComponent.vue";
import RestartButtonComponent from "@/components/buttons/RestartButtonComponent.vue";
import PauseButtonComponent from "@/components/buttons/PauseButtonComponent.vue";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: {
    PauseButtonComponent,
    RestartButtonComponent,
    ToggleButtonComponent,
    PlayerStatsComponent,
    FlagDialogComponent,
    WorldDeleteDialogComponent,
    VersionDialogComponent,
    ResourceChartComponent,
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

  /**
   * The available jar updates, or `null` if unknown or not applicable.
   * @private
   */
  private updates: {
    build: { version: string; build: number } | null;
    patch: { version: string; build: number } | null;
  } | null = null;

  private eulaDialog = false;

  private eulaAccepted = false;

  private eulaLoading = false;

  private eulaError = "";

  constructor() {
    super();
  }

  /**
   * Listens to a channel named according to the {@link Server}'s name for updated information.
   */
  async mounted() {
    this.$socket.client.on(
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
      const response = await fetch("/api/java-runtimes");
      const data: Record<string, unknown>[] = await response.json();
      this.javaRuntimes = data.map((elem) =>
        Object.assign(new JavaRuntime(), elem)
      );
    }
    if (this.detailed) await this.update();
    if (this.detailed) await this.loadUpdates();
  }

  private async loadUpdates(): Promise<void> {
    try {
      this.updates = await this.server.fetchUpdates(
        encodeURIComponent(this.getName())
      );
    } catch (error) {
      this.updates = null;
    }
  }

  private async onVersionInstalled(): Promise<void> {
    await this.update();
    await this.loadUpdates();
  }

  /**
   * Unsubscribes the channels subscribed to in {@link #mounted}.
   */
  destroyed() {
    this.$socket.client.off("server_" + encodeURIComponent(this.getName()));
  }

  /**
   * Fetches the current server snapshot from the REST API.
   * @private
   */
  private async update(): Promise<void> {
    try {
      const data = await this.server.fetchInfo(
        encodeURIComponent(this.getName())
      );
      Object.assign(this.server, data);
      this.server.players.sample = this.server.players.sample.map((player) =>
        Object.assign(new Player(), player)
      );
    } catch (error) {
      console.error("Could not update server information:", error);
    }
  }

  private saveConfig(config: Record<string, unknown>, rollback: () => void) {
    void this.server.updateConfig(config).catch((error: unknown) => {
      rollback();
      console.error("Could not update server configuration:", error);
    });
  }

  private handleAction(action: string): void {
    void this.server
      .sendAction(action)
      .catch((error: unknown) =>
        console.error(`Could not ${action} server:`, error)
      );
  }

  private showEulaDialog(): void {
    this.eulaDialog = true;
  }

  private cancelEula(): void {
    this.eulaDialog = false;
    this.eulaAccepted = false;
    this.eulaError = "";
  }

  private async acceptEula(): Promise<void> {
    this.eulaLoading = true;
    this.eulaError = "";
    try {
      await this.server.acceptEula();
      this.eulaDialog = false;
      this.eulaAccepted = false;
    } catch (error) {
      this.eulaError = error instanceof Error ? error.message : String(error);
      console.error("Could not accept the Minecraft EULA:", error);
    } finally {
      this.eulaLoading = false;
    }
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
    const previousValue = this.server.autostart;
    this.server.autostart = value;
    this.saveConfig({ autostart: value }, () => {
      this.server.autostart = previousValue;
    });
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
    const previousValue = { ...this.server.pauseOnIdle };
    this.server.pauseOnIdle = value;
    this.saveConfig({ pauseOnIdle: value }, () => {
      this.server.pauseOnIdle = previousValue;
    });
  }

  /**
   * Sets the `enabled` property of the `pauseOnIdle` option of the server.
   * @param value the `enabled` property of the `pauseOnIdle` option to be sent to the server.
   */
  setPauseEnabled(value: boolean | null) {
    const pauseOnIdle = { ...this.pauseOnIdle };
    pauseOnIdle.enable = value === true;
    this.pauseOnIdle = pauseOnIdle;
  }

  /**
   * Sets the `timeout` property of the `pauseOnIdle` option of the server.
   * @param value the `timeout` property of the `pauseOnIdle` option to be sent to the server.
   */
  setPauseTimeout(value: string) {
    const pauseOnIdle = { ...this.pauseOnIdle };
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

    const previousValue = this.server.javaPath;
    this.server.javaPath = javaRuntime.path;
    this.saveConfig({ javaPath: javaRuntime.path }, () => {
      this.server.javaPath = previousValue;
    });
  }
}
</script>

<style scoped></style>
