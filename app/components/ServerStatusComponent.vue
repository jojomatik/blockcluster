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
  <v-chip variant="flat" :color="color" class="mx-2">
    {{ status_text }}
  </v-chip>
</template>

<script setup lang="ts">
import { ServerStatus } from "#shared/components/server";

/**
 * The representation of a {@link Server} status in Vue.
 */
const props = defineProps<{
  /**
   * The linked {@link ServerStatus}.
   */
  status: ServerStatus;
}>();

const { t } = useI18n();

/**
 * The translated name for the {@link Server}'s status.
 */
const status_text = computed<string>(() =>
  t("gui.views.server.status." + ServerStatus[props.status].toLowerCase()),
);

/**
 * A color for the {@link ServerStatus}.
 */
const color = computed<string>(() => {
  switch (props.status) {
    case ServerStatus.Started:
      return "green";
    case ServerStatus.Stopped:
      return "red";
    case ServerStatus.Unknown:
      return "grey";
    case ServerStatus.Starting:
    case ServerStatus.Stopping:
      return "yellow-darken-2";
    case ServerStatus.Queued:
    case ServerStatus.Paused:
      return "secondary";
  }
  return "grey";
});
</script>

<style scoped></style>
