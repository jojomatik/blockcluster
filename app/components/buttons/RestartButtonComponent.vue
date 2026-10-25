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
    :icon="mdiRestart"
    :disabled="disabled || status !== ServerStatus.Started"
    @click="restart"
  >
    {{ t("gui.views.server.state_change.restart") }}
  </ButtonComponent>
</template>

<script setup lang="ts">
import { mdiRestart } from "@mdi/js";
import { ServerStatus } from "#shared/components/server";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

/**
 * A button that restarts a server.
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

const emit = defineEmits<{ (e: "restart"): void }>();

const { t } = useI18n();

/**
 * Emits an event `restart`.
 */
function restart(): void {
  emit("restart");
}
</script>

<style scoped></style>
