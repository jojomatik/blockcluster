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
    <template #activator="{ props: activatorProps }">
      <v-btn
        :class="'server-card-button ' + buttonClass"
        color="red-darken-4"
        v-bind="activatorProps"
        :disabled="isDisabled"
      >
        <v-icon start :icon="mdiDelete" />
        {{ t("gui.views.server.delete_world.text") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>Delete World?</v-card-title>
      <v-card-text>
        <p>{{ t("gui.views.server.delete_world.dialog.question") }}</p>
        <p>
          {{
            t("gui.views.server.delete_world.dialog.prompt")
              .toString()
              .split("%%name%%")[0]
          }}
          <span class="font-weight-bold">{{ server.name }}</span>
          {{
            t("gui.views.server.delete_world.dialog.prompt")
              .toString()
              .split("%%name%%")[1]
          }}
        </p>
        <v-form v-model="isFormValid">
          <v-text-field
            v-model="currentTextInput"
            density="compact"
            :rules="[
              currentTextInput === server.name
                ? true
                : t(
                    'gui.views.server.delete_world.dialog.errors.no_match_name',
                  ),
            ]"
          ></v-text-field>
          <p class="font-weight-light" style="font-size: 12px">
            {{
              t("gui.views.server.delete_world.dialog.description")
                .toString()
                .split("%%file%%")[0]
            }}
            <code>server.properties</code>
            {{
              t("gui.views.server.delete_world.dialog.description")
                .toString()
                .split("%%file%%")[1]
            }}
          </p>
        </v-form>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn
          class="server-card-button"
          color="red-darken-4"
          :disabled="!isFormValid"
          @click="deleteWorld"
        >
          <v-icon start :icon="mdiDelete" />
          {{ t("gui.views.server.delete_world.dialog.confirm") }}
        </v-btn>
        <v-btn
          class="server-card-button"
          color="grey"
          variant="text"
          @click="closeDialog"
        >
          <v-icon start :icon="mdiCancel" />
          {{ t("gui.views.server.delete_world.dialog.cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { mdiCancel, mdiDelete } from "@mdi/js";
import { ServerStatus } from "#shared/components/server";
import type Server from "@/lib/components/server";

/**
 * A button and dialog that allows the user to delete worlds.
 */
const props = defineProps<{
  /**
   * The linked {@link Server}.
   */
  server: Server;

  /**
   * The status of the {@link ServerComponent}.
   */
  status: ServerStatus;

  /**
   * The class(es) the button should have.
   */
  buttonClass?: string;
}>();

const { t } = useI18n();

/**
 * The current state of the dialog. {@code true} means it's shown.
 */
const dialog = ref(false);

/**
 * Whether or not the form is currently valid.
 */
const isFormValid = ref(false);

/**
 * The current input of the text field.
 */
const currentTextInput = ref("");

/**
 * Closes the dialog and removes any text from the text input.
 */
function closeDialog(): void {
  dialog.value = false;
  currentTextInput.value = "";
}

/**
 * Requests world deletion through the REST API.
 */
async function deleteWorld(): Promise<void> {
  try {
    await props.server.sendAction("deleteWorld");
    closeDialog();
  } catch (error) {
    console.error("Could not delete server world:", error);
  }
}

/**
 * {@code true} if the server is in a transitional state (i.e. {@code ServerStatus.Starting} or {@code ServerStatus.Stopping}).
 */
const isDisabled = computed<boolean>(
  () =>
    props.status !== ServerStatus.Started &&
    props.status !== ServerStatus.Stopped,
);
</script>

<style></style>
