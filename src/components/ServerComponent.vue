<template>
  <div v-if="detailed" class="server">
    <div v-if="server.name !== ''">
      <h1>{{ server.name }}</h1>
      <div>Status: {{ getStatus() }}</div>
      <div>Port: {{ server.port }}</div>
    </div>
    <button v-on:click="update">Update Status</button>
  </div>
  <div v-else class="server">
    <router-link v-bind:to="'/server/' + server.name">
      <h3>{{ server.name }}</h3>
    </router-link>
    <div>Status: {{ getStatus() }}</div>
    <div>Port: {{ server.port }}</div>
  </div>
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
   * Sends a message `update` to a channel named according to the {@link Server}'s name.
   * @private
   */
  private update(): void {
    this.$socket.emit(
      "server_" +
        (this.server.name !== ""
          ? this.server.name
          : this.$route.params["server"]),
      "update"
    );
  }
}
</script>

<style scoped></style>
