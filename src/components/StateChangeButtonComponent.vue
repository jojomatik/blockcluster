<template>
  <v-btn
    v-if="this.status === ServerStatus.Stopped"
    class="server-card-button"
    color="green"
    text
    v-on:click="start"
  >
    <v-icon left light>mdi-play</v-icon>
    Start
  </v-btn>
  <v-btn
    v-else-if="this.status === ServerStatus.Starting"
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
    v-else-if="this.status === ServerStatus.Started"
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
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";
import ServerComponent from "@/components/ServerComponent.vue";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  data() {
    return { ServerStatus };
  },
})
export default class StateChangeButtonComponent extends Vue {
  /**
   * The linked {@link ServerComponent}.
   * @private
   */
  @Prop() private server!: ServerComponent;

  /**
   * The status of the {@link ServerComponent}.
   * @private
   */
  @Prop() private status!: ServerStatus;

  /**
   * Sends a message `start` to the corresponding channel. The backend is expected to start the server and return the current status.
   * @private
   */
  private start(): void {
    this.server.sendMessage("start");
  }

  /**
   * Sends a message `stop` to the corresponding channel. The backend is expected to stop the server and return the current status.
   * @private
   */
  private stop(): void {
    this.server.sendMessage("stop");
  }
}
</script>

<style scoped></style>
