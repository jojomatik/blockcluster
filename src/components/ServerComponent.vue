<template>
  <div class="server">
    <h1>{{ getName() }}</h1>
    <div>Status: {{ getStatus() }}</div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import Server, { ServerStatus } from "../../common/components/server";

@Component
export default class ServerComponent extends Vue {
  @Prop() private server!: Server;

  private getStatus(): string {
    return ServerStatus[this.server.status];
  }

  private getName(): string {
    return this.server.name;
  }
}
</script>

<style scoped></style>
