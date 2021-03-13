<template>
  <v-chip
    :color="getColorForStatus(status)"
    class="mx-2"
    colored
    text-color="white"
  >
    {{ getStatus() }}
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";

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
    getColorForStatus,
  },
})
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
}
</script>

<style scoped></style>
