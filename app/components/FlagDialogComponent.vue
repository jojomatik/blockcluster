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
        v-model="flagString"
        variant="underlined"
        hide-details
        density="compact"
        class="flagInput mt-2 pr-2"
        @focus="flagsFocussed = true"
        @blur="flagsFocussed = false"
        @update:model-value="input"
      />
      <v-btn
        variant="elevated"
        class="mt-1"
        color="secondary"
        :disabled="!flagsChanged"
        @click="sendFlags()"
      >
        {{ t("gui.views.server.flags.save") }}
      </v-btn>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type Server from "@/lib/components/server";

/**
 * A component that contains a dialog to set the java flags.
 */
const props = defineProps<{
  /**
   * The linked {@link Server}.
   */
  server: Server;

  /**
   * The flags currently stored in the server.
   */
  flags: string[];
}>();

const { t } = useI18n();

/**
 * The flags that are currently written in the flag input.
 */
const writtenFlagString = ref("");

/**
 * Whether the flags text field is focussed.
 */
const flagsFocussed = ref(false);

/**
 * Whether the flags have been changed.
 */
const flagsChanged = ref(false);

/**
 * Sends the flags to the backend.
 */
function sendFlags(): void {
  flagsChanged.value = false;
  void props.server
    .updateConfig({ flags: flagString.value?.split(" ") })
    .catch((error: unknown) => {
      flagsChanged.value = true;
      console.error("Could not update server flags:", error);
    });
}

/**
 * The flag string. If the flags have been changed in the frontend that new value is used, otherwise they are based on the flags of the server.
 *
 * Setting it determines whether the flags have been changed in the frontend and stores that information in {@link flagsChanged}.
 */
const flagString = computed<string>({
  get: () => {
    if (!flagsFocussed.value && !flagsChanged.value) {
      return props.flags.join(" ");
    }
    return writtenFlagString.value;
  },
  set: (flags) => {
    writtenFlagString.value = flags;
    flagsChanged.value = flags !== props.flags.join(" ");
  },
});

/**
 * Handles the input event of the text field by invoking {@link flagString}.
 * @param content the content of the text field.
 */
function input(content: string): void {
  flagString.value = content;
}
</script>

<style scoped>
.flagInput.v-input {
  caret-color: auto !important;
}
</style>
