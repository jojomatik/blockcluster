<template>
  <v-chip :color="getColor()" class="mx-2" colored text-color="white">
    {{ getStatus() }}
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component
export default class ServerStatusComponent extends Vue {
  /**
   * The linked {@link ServerStatus}.
   * @private
   */
  @Prop() private status!: ServerStatus;

  /**
   * Returns the enum constant name for the {@link Server}'s status.
   * @return the enum constant name for the {@link Server}'s status.
   * @private
   */
  private getStatus(): string {
    return ServerStatus[this.status];
  }
  /**
   * A function that returns a color for a {@link ServerStatus}.
   *
   * @private
   */
  private getColor(): string {
    switch (this.status) {
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
}
</script>

<style scoped></style>
