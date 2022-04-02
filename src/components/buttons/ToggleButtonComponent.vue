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
    v-if="
      this.status === ServerStatus.Stopped ||
      this.status === ServerStatus.Starting
    "
    color="green"
    icon="mdi-play"
    :disabled="disabled || this.status !== ServerStatus.Stopped"
    @click="start"
  >
    {{ $t("gui.views.server.state_change.start") }}
  </ButtonComponent>
  <ButtonComponent
    v-else
    color="red"
    icon="mdi-stop"
    :disabled="disabled || this.status !== ServerStatus.Started"
    @click="stop"
  >
    {{ $t("gui.views.server.state_change.stop") }}
  </ButtonComponent>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../../common/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that toggles the current state (i.e. starts/ stops) of a server.
 */
@Component({
  components: { ButtonComponent },
  data() {
    return { ServerStatus };
  },
})
export default class ToggleButtonComponent extends Vue {
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
   * Emits an event `start`.
   * @private
   */
  @Emit("start")
  start(): void {
    return;
  }

  /**
   * Emits an event `stop`.
   * @private
   */
  @Emit("stop")
  stop(): void {
    return;
  }
}
</script>

<style scoped></style>
