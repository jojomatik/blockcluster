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
  <ButtonComponent
    color="accent"
    :icon="this.status === ServerStatus.Paused ? 'mdi-play-pause' : 'mdi-pause'"
    :disabled="
      disabled ||
      (this.status !== ServerStatus.Started &&
        this.status !== ServerStatus.Paused)
    "
    @click="togglePause"
  >
    {{
      this.status !== ServerStatus.Paused
        ? $t("gui.views.server.state_change.pause")
        : $t("gui.views.server.state_change.unpause")
    }}
  </ButtonComponent>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../../common/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that pauses and unpauses a server.
 */
@Component({
  components: { ButtonComponent },
  data() {
    return { ServerStatus };
  },
})
export default class PauseButtonComponent extends Vue {
  /**
   * The status of the {@link ServerComponent}.
   * @private
   */
  @Prop() status!: ServerStatus;

  /**
   * Whether the button should be disabled.
   * @private
   */
  @Prop({ default: false }) disabled!: boolean;

  /**
   * Emits an event `pause` or `unpause` depending on the current state.
   * @private
   */
  togglePause(): void {
    this.status === ServerStatus.Started ? this.pause() : this.unpause();
  }

  /**
   * Emits an event `pause`.
   * @private
   */
  @Emit("pause")
  pause(): void {
    return;
  }

  /**
   * Emits an event `unpause`.
   * @private
   */
  @Emit("unpause")
  unpause(): void {
    return;
  }
}
</script>

<style scoped></style>
