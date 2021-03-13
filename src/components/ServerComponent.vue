<template>
  <v-container v-if="detailed" class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card v-if="server.name !== ''" class="server">
          <v-card-title>
            {{ server.name }}
            <v-chip
              :color="getColorForStatus(server.status)"
              class="mx-2"
              colored
              text-color="white"
            >
              {{ getStatus() }}
            </v-chip>
          </v-card-title>
          <v-card-text>
            <div>Port: {{ server.port }}</div>
          </v-card-text>
          <v-card-actions>
            <v-btn
              v-if="server.status === getStatusEnum().Stopped"
              class="server-card-button"
              color="green"
              text
              v-on:click="start"
            >
              <v-icon left light>mdi-play</v-icon>
              Start
            </v-btn>
            <v-btn
              v-else-if="server.status === getStatusEnum().Starting"
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
              v-else-if="server.status === getStatusEnum().Started"
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
      <v-chip
        :color="getColorForStatus(server.status)"
        class="mx-2"
        colored
        text-color="white"
      >
        {{ getStatus() }}
      </v-chip>
    </v-card-title>
    <v-card-text>
      <div>Port: {{ server.port }}</div>
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

/**
 * A function that returns a color for a {@link ServerStatus}.
 *
 * @param status the {@link ServerStatus} for which the color is needed.
 */
function getColorForStatus(status: ServerStatus): string {
  switch (status) {
    case ServerStatus.Started:
      return "green";
    case ServerStatus.Stopped:
      return "red";
    case ServerStatus.Unknown:
      return "gray";
    case ServerStatus.Starting:
    case ServerStatus.Stopping:
      return "yellow darken-2";
  }
}

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  methods: {
    getStatusEnum: () => ServerStatus,
    getColorForStatus,
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
      (data: string) => {
        const server = JSON.parse(data);
        Object.assign(this.server, server);
      }
    );
  }

  /**
   * Returns the enum constant name for the {@link Server}'s status.
   * @return the enum constant name for the {@link Server}'s status.
   * @private
   */
  private getStatus(): string {
    return ServerStatus[this.server.status];
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
