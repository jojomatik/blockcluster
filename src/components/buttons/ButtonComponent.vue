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
  <v-btn :color="this.color" :disabled="disabled" text @click="clicked">
    <v-icon left light>{{ this.icon }}</v-icon>
    <slot></slot>
  </v-btn>
</template>

<script lang="ts">
import { Component, Prop, Emit, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../../common/components/server";

/**
 * A customizable button component.
 */
@Component({
  data() {
    return { ServerStatus };
  },
})
export default class ButtonComponent extends Vue {
  /**
   * The color of this {@link ButtonComponent} Button.
   * @private
   */
  @Prop() color!: string;

  /**
   * The icon of this {@link ButtonComponent} Button.
   * @private
   */
  @Prop() icon!: string;

  /**
   * Whether the button should be disabled.
   * @private
   */
  @Prop({ default: false }) disabled!: boolean;

  /**
   * Emits an event `click`.
   */
  @Emit("click")
  clicked() {
    return;
  }
}
</script>

<style scoped></style>
