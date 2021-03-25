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
                      <td>Flags</td>
                      <td style="display: flex; flex-direction: row">
                        <v-text-field
                          hide-details
                          dense
                          class="mt-2 pr-2"
                          v-model="flagString"
                        />
                        <v-btn dense class="mt-1" @click="sendFlags()">
                          Save
                        </v-btn>
                      </td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
            <ConsoleComponent
              :server="this"
              :status="server.status"
            ></ConsoleComponent>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="server.status === ServerStatus.Stopped"
              class="server-card-button"
              color="green"
              text
              v-on:click="start"
            >
              <v-icon left light>mdi-play</v-icon>
              Start
            </v-btn>
            <v-btn
              v-else-if="server.status === ServerStatus.Starting"
              class="server-card-button"
              color="green"
              disabled
              text
              v-on:click="start"
            >
              <v-icon left light>mdi-play</v-icon>
              Start
            </v-btn>
            <v-btn
              v-else-if="server.status === ServerStatus.Started"
              class="server-card-button"
              color="red"
              text
              v-on:click="stop"
            >
              <v-icon left light>mdi-stop</v-icon>
              Stop
            </v-btn>
            <v-btn
              v-else
              class="server-card-button"
              color="red"
              disabled
              text
              v-on:click="stop"
            >
              <v-icon left light>mdi-stop</v-icon>
              Stop
            </v-btn>
            <v-btn
              class="server-card-button"
              color="primary"
              v-on:click="update"
            >
              <v-icon left light>mdi-reload</v-icon>
              Update Status
            </v-btn>
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

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: { ConsoleComponent, ServerStatusComponent },
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
  }

  /**
   * Sends a message `update` to the corresponding channel. The backend is expected to return the current status.
   * @private
   */
  private update(): void {
    this.sendMessage("update");
  }

  /**
   * Sends a message `start` to the corresponding channel. The backend is expected to start the server and return the current status.
   * @private
   */
  private start(): void {
    this.sendMessage("start");
  }

  /**
   * Sends a message `stop` to the corresponding channel. The backend is expected to stop the server and return the current status.
   * @private
   */
  private stop(): void {
    this.sendMessage("stop");
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
}
</script>

<style scoped></style>
