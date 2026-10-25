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
    v-if="status === ServerStatus.Stopped || status === ServerStatus.Starting"
    color="green"
    :icon="mdiPlay"
    :disabled="disabled || status !== ServerStatus.Stopped"
    @click="start"
  >
    {{ t("gui.views.server.state_change.start") }}
  </ButtonComponent>
  <ButtonComponent
    v-else
    color="red"
    :icon="mdiStop"
    :disabled="
      disabled ||
      !(status === ServerStatus.Started || status === ServerStatus.Paused)
    "
    @click="stop"
  >
    {{ t("gui.views.server.state_change.stop") }}
  </ButtonComponent>
</template>

<script setup lang="ts">
import { mdiPlay, mdiStop } from "@mdi/js";
import { ServerStatus } from "#shared/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that toggles the current state (i.e. starts/ stops) of a server.
 */
withDefaults(
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
  (e: "start" | "stop"): void;
}>();

const { t } = useI18n();

/**
 * Emits an event `start`.
 */
function start(): void {
  emit("start");
}

/**
 * Emits an event `stop`.
 */
function stop(): void {
  emit("stop");
}
</script>

<style scoped></style>
