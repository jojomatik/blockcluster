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
  <tr>
    <td>Flags</td>
    <td style="display: flex; flex-direction: row">
      <v-text-field
        hide-details
        dense
        class="flagInput mt-2 pr-2"
        v-model="flagString"
        @focus="flagsFocussed = true"
        @blur="flagsFocussed = false"
        @input="input"
      />
      <v-btn
        dense
        class="mt-1"
        color="secondary"
        :disabled="!flagsChanged"
        @click="sendFlags()"
      >
        Save
      </v-btn>
    </td>
  </tr>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import ServerComponent from "@/components/ServerComponent.vue";

/**
 * A {@link Component} that contains a dialog to set the java flags.
 */
@Component({
  components: {
    ServerComponent,
  },
})
export default class FlagDialogComponent extends Vue {
  /**
   * The linked {@link ServerComponent}.
   * @private
   */
  @Prop() private server!: ServerComponent;

  /**
   * The flags currently stored in the server.
   * @private
   */
  @Prop() private flags!: string[];

  /**
   * The flags that are currently written in the flag input.
   * @private
   */
  private _flagString!: string;

  /**
   * Whether the flags text field is focussed.
   * @private
   */
  private flagsFocussed = false;

  /**
   * Whether the flags have been changed.
   * @private
   */
  private flagsChanged = false;

  /**
   * Sends the flags to the backend.
   */
  private sendFlags() {
    this.flagsChanged = false;
    this.server.sendMessage(
      "set " + JSON.stringify({ flags: this._flagString?.split(" ") })
    );
  }

  /**
   * Returns the flag string. If the flags have been changed in the frontend that new value is returned, otherwise they are based on the flags of the server.
   */
  get flagString(): string {
    if (!this.flagsFocussed && !this.flagsChanged) {
      this._flagString = this.flags.join(" ");
    }
    return this._flagString;
  }

  /**
   * Sets the flag string.
   *
   * Determines whether the flags have been changed in the frontend and stores that information in {@link flagsChanged}.
   *
   * @param flags the flags to set.
   */
  set flagString(flags: string) {
    this._flagString = flags;
    this.flagsChanged = this._flagString !== this.flags.join(" ");
  }

  /**
   * Handles the input event of the text field by invoking {@link flagString}.
   * @param content the content of the text field.
   */
  input(content: string): void {
    this.flagString = content;
  }
}
</script>

<style scoped lang="scss">
.flagInput.v-input {
  caret-color: auto !important;
}
</style>
