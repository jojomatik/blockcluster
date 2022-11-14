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
  <v-dialog
    v-model="dialog"
    max-width="400px"
    @keydown.esc="closeDialog"
    @click:outside="closeDialog"
  >
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        :class="'server-card-button ' + buttonClass"
        color="red darken-4"
        v-bind="attrs"
        v-on="on"
        :disabled="isDisabled()"
      >
        <v-icon left light>mdi-delete</v-icon>
        {{ $t("gui.views.server.delete_world.text") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>Delete World?</v-card-title>
      <v-card-text>
        <p>{{ $t("gui.views.server.delete_world.dialog.question") }}</p>
        <p>
          {{
            $t("gui.views.server.delete_world.dialog.prompt")
              .toString()
              .split("%%name%%")[0]
          }}
          <span class="font-weight-bold">{{ this.server.name }}</span>
          {{
            $t("gui.views.server.delete_world.dialog.prompt")
              .toString()
              .split("%%name%%")[1]
          }}
        </p>
        <v-form v-model="isFormValid">
          <v-text-field
            dense
            v-model="currentTextInput"
            :rules="[
              currentTextInput === this.server.name
                ? true
                : $t(
                    'gui.views.server.delete_world.dialog.errors.no_match_name'
                  ),
            ]"
          ></v-text-field>
          <p class="font-weight-light" style="font-size: 12px">
            {{
              $t("gui.views.server.delete_world.dialog.description")
                .toString()
                .split("%%file%%")[0]
            }}
            <code>server.properties</code>
            {{
              $t("gui.views.server.delete_world.dialog.description")
                .toString()
                .split("%%file%%")[1]
            }}
          </p>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          class="server-card-button"
          color="red darken-4"
          @click="deleteWorld"
          :disabled="!isFormValid"
        >
          <v-icon left light>mdi-delete</v-icon>
          {{ $t("gui.views.server.delete_world.dialog.confirm") }}
        </v-btn>
        <v-btn
          class="server-card-button"
          color="gray"
          @click="closeDialog"
          text
        >
          <v-icon left light>mdi-cancel</v-icon>
          {{ $t("gui.views.server.delete_world.dialog.cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";
import Server from "@/lib/components/server";

/**
 * A button and dialog that allows the user to delete worlds.
 */
@Component({
  data() {
    return { ServerStatus };
  },
})
export default class WorldDeleteDialogComponent extends Vue {
  /**
   * The linked {@link Server}.
   * @private
   */
  @Prop() private server!: Server;

  /**
   * The status of the {@link ServerComponent}.
   * @private
   */
  @Prop() private status!: ServerStatus;

  /**
   * The class(es) the button should have.
   * @private
   */
  @Prop() private buttonClass!: string;

  /**
   * The current state of the dialog. {@code true} means it's shown.
   * @private
   */
  private dialog = false;

  /**
   * Whether or not the form is currently valid.
   * @private
   */
  private isFormValid = false;

  /**
   * The current input of the text field.
   * @private
   */
  private currentTextInput = "";

  /**
   * Closes the dialog and removes any text from the text input.
   * @private
   */
  private closeDialog(): void {
    this.dialog = false;
    this.currentTextInput = "";
  }

  /**
   * Sends a message `deleteWorld` to the corresponding channel. The backend is expected to start the server and return the current status.
   * @private
   */
  private deleteWorld(): void {
    this.closeDialog();
    this.server.sendMessage("deleteWorld");
  }

  /**
   * Returns {@code true} if the server is in a transitional state (i.e. {@code ServerStatus.Starting} or {@code ServerStatus.Stopping}).
   * @return {@code true} if the server is in a transitional state.
   * @private
   */
  private isDisabled(): boolean {
    return (
      this.status !== ServerStatus.Started &&
      this.status !== ServerStatus.Stopped
    );
  }
}
</script>

<style></style>
