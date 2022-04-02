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
    color="orange"
    icon="mdi-restart"
    :disabled="disabled || this.status !== ServerStatus.Started"
    @click="restart"
  >
    {{ $t("gui.views.server.state_change.restart") }}
  </ButtonComponent>
</template>

<script lang="ts">
import { Component, Emit, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../../common/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that restarts a server.
 */
@Component({
  components: { ButtonComponent },
  data() {
    return { ServerStatus };
  },
})
export default class RestartButtonComponent extends Vue {
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
   * Emits an event `restart`.
   * @private
   */
  @Emit("restart")
  restart(): void {
    return;
  }
}
</script>

<style scoped></style>
