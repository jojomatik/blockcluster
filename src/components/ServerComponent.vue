<template>
  <div class="server">
    <h1>{{ server.name }}</h1>
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
   * Returns the enum constant name for the {@link server}s status.
   * @return the enum constant name for the {@link server}s status.
   * @private
   */
  private getStatus(): string {
    return ServerStatus[this.server.status];
  }
}
</script>

<style scoped></style>
