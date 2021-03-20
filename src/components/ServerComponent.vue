<template>
  <v-container v-if="detailed" class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card v-if="server.name !== ''" class="server">
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
                    <tr>
                      <td>Executable</td>
                      <td>{{ server.jar }}</td>
                    </tr>
                  </tbody>
                </v-simple-table>
              </v-col>
            </v-row>
            <v-card v-if="messages.length !== 0" dark>
              <v-card-title>Console</v-card-title>
              <v-card-text class="pb-8">
                <v-row
                  v-bind:key="message.uuid"
                  v-for="message in this.messages"
                >
                  <v-col class="py-0">
                    <span
                      v-if="message.type === MessageType.Error"
                      class="red--text"
                    >
                      {{ message.text }}
                    </span>
                    <span v-else>{{ message.text }}</span>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
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
import Message, { MessageType } from "@/components/message";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: { ServerStatusComponent },
  data() {
    return { ServerStatus, MessageType };
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
   * The list of messages of this server.
   */
  messages: Message[] = [];

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
      (data: Record<string, unknown>) => {
        if (Object.prototype.hasOwnProperty.call(data, "serverInfo"))
          Object.assign(this.server, data["serverInfo"]);
        else if (Object.prototype.hasOwnProperty.call(data, "serverSTDOUT")) {
          this.messages.push(
            new Message(MessageType.Default, String(data["serverSTDOUT"]))
          );
        } else if (Object.prototype.hasOwnProperty.call(data, "serverSTDERR")) {
          this.messages.push(
            new Message(MessageType.Error, String(data["serverSTDERR"]))
          );
        }
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
   * Sends the message to a channel named according to the {@link Server}'s name.
   * @param message the message to send.
   * @private
   */
  private sendMessage(message: string): void {
    this.$socket.emit("server_" + encodeURIComponent(this.getName()), message);
  }

  /**
   * Returns the name of the {@link Server}. If no server is loaded yet the server name is taken from the route params.
   * @return the name of the {@link Server}.
   * @private
   */
  private getName(): string {
    return this.server.name !== ""
      ? this.server.name
      : this.$route.params["server"];
  }
}
</script>

<style scoped></style>
