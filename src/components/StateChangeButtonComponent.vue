<!--
blockcluster - An in-browser manager for your minecraft servers.
Copyright (C) 2021 jojomatik

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.
-->

<template>
  <v-btn
    v-if="isToggle() && this.status === ServerStatus.Stopped"
    class="server-card-button"
    color="green"
    text
    v-on:click="start"
  >
    <v-icon left light>mdi-play</v-icon>
    Start
  </v-btn>
  <v-btn
    v-else-if="isToggle() && this.status === ServerStatus.Starting"
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
    v-else-if="isToggle() && this.status === ServerStatus.Started"
    class="server-card-button"
    color="red"
    text
    v-on:click="stop"
  >
    <v-icon left light>mdi-stop</v-icon>
    Stop
  </v-btn>
  <v-btn
    v-else-if="isToggle()"
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
    v-else-if="!isToggle() && this.status === ServerStatus.Started"
    class="server-card-button"
    color="orange"
    text
    v-on:click="restart"
  >
    <v-icon left light>mdi-restart</v-icon>
    Restart
  </v-btn>
  <v-btn
    v-else
    class="server-card-button"
    color="orange"
    disabled
    text
    v-on:click="restart"
  >
    <v-icon left light>mdi-restart</v-icon>
    Restart
  </v-btn>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";
import ServerComponent from "@/components/ServerComponent.vue";

/**
 * A button that changes the current state of a server.
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
   * Whether the button should toggle the status (i.e. start and stop) or restart the server.
   * @private
   */
  @Prop() private type!: "toggle" | "restart";

  /**
   * Returns {@code true} if {@code this.type === "toggle"} (i.e. if the button should toggle the status/ start or stop the server) and {@code false} if the button should restart the server.
   * @return {@code true} if {@code this.type === "toggle"}.
   * @private
   */
  private isToggle(): boolean {
    return this.type === "toggle";
  }

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

  /**
   * Sends a message `restart` to the corresponding channel. The backend is expected to restart the server and return the current status.
   * @private
   */
  private restart(): void {
    this.server.sendMessage("restart");
  }
}
</script>

<style scoped></style>
