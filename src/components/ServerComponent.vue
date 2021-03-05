<template>
  <v-container v-if="detailed" class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card class="server">
          <div class="server">
            <div v-if="server.name !== ''">
              <v-card-title>
                {{ server.name }}
              </v-card-title>
              <v-card-text>
                <div>Status: {{ getStatus() }}</div>
                <div>Port: {{ server.port }}</div>
              </v-card-text>
            </div>
            <v-card-actions>
              <v-btn
                class="server-card-button"
                color="primary"
                v-on:click="update"
              >
                <v-icon left light>mdi-reload</v-icon>
                Update Status
              </v-btn>
            </v-card-actions>
          </div>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-card v-else class="server">
    <v-card-title>
      <router-link v-bind:to="'/server/' + server.name">
        <h3>{{ server.name }}</h3>
      </router-link>
    </v-card-title>
    <v-card-text>
      <div>Status: {{ getStatus() }}</div>
      <div>Port: {{ server.port }}</div>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import Server, { ServerStatus } from "../../common/components/server";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component
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
      "server_" +
        (this.server.name !== ""
          ? this.server.name
          : this.$route.params["server"]),
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
   * Sends a message `update` to the corresponding channel.
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
  private sendMessage(message: string): void {
    this.$socket.emit("server_" + this.getName(), message);
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
