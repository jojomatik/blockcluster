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
  <v-chip :color="getColor()" class="mx-2" colored text-color="white">
    {{ getStatus() }}
  </v-chip>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";

/**
 * The representation of a {@link Server} status in Vue.
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
