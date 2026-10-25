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
    :icon="status === ServerStatus.Paused ? mdiPlayPause : mdiPause"
    :disabled="
      disabled ||
      (status !== ServerStatus.Started && status !== ServerStatus.Paused)
    "
    @click="togglePause"
  >
    {{
      status !== ServerStatus.Paused
        ? t("gui.views.server.state_change.pause")
        : t("gui.views.server.state_change.unpause")
    }}
  </ButtonComponent>
</template>

<script setup lang="ts">
import { mdiPause, mdiPlayPause } from "@mdi/js";
import { ServerStatus } from "#shared/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that pauses and unpauses a server.
 */
const props = withDefaults(
  defineProps<{
    /**
     * The status of the {@link ServerComponent}.
     */
    status: ServerStatus;

    /**
     * Whether the button should be disabled.
     */
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{
  (e: "pause" | "unpause"): void;
}>();

const { t } = useI18n();

/**
 * Emits an event `pause` or `unpause` depending on the current state.
 */
function togglePause(): void {
  if (props.status === ServerStatus.Started) pause();
  else unpause();
}

/**
 * Emits an event `pause`.
 */
function pause(): void {
  emit("pause");
}

/**
 * Emits an event `unpause`.
 */
function unpause(): void {
  emit("unpause");
}
</script>

<style scoped></style>
