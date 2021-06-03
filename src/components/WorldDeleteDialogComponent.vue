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
        Delete World
      </v-btn>
    </template>
    <v-card>
      <v-card-title>Delete World?</v-card-title>
      <v-card-text>
        <p>Are you sure you want to delete the world?</p>
        <p>
          Type
          <span class="font-weight-bold">{{ this.server.getName() }}</span>
          to delete this world:
        </p>
        <v-form v-model="isFormValid">
          <v-text-field
            dense
            v-model="currentTextInput"
            :rules="[
              currentTextInput === this.server.getName()
                ? true
                : 'Input does\'t match server name.',
            ]"
          ></v-text-field>
          <p class="font-weight-light" style="font-size: 12px">
            This operation will stop the server (if started), delete the world
            defined in <code>server.properties</code> and restart the server
            afterwards.
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
          Delete World
        </v-btn>
        <v-btn
          class="server-card-button"
          color="gray"
          @click="closeDialog"
          text
        >
          <v-icon left light>mdi-cancel</v-icon>
          Cancel
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { ServerStatus } from "../../common/components/server";
import ServerComponent from "@/components/ServerComponent.vue";

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
