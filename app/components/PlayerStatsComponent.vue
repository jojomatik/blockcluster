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
  <span class="d-flex justify-start bottom">
    <span class="my-auto">
      {{ playerStats.online }} /
      {{ playerStats.max }}
    </span>

    <span
      v-for="player in playerStats.sample"
      :key="player.uuid"
      class="my-auto ml-2"
      :style="'width: ' + width + 'px; image-rendering: pixelated'"
    >
      <v-tooltip location="bottom">
        <template #activator="{ props: tooltipProps }">
          <v-img
            v-bind="tooltipProps"
            :src="'data:image/png;base64,' + player.head"
            aspect-ratio="1"
            :alt="
              t('gui.views.server.players.heads.alt', { name: player.name })
            "
          ></v-img>
        </template>
        <span>{{ player.name }}</span>
      </v-tooltip>
    </span>
  </span>
</template>

<script setup lang="ts">
import type { playerStats as PlayerStats } from "#shared/components/server";

/**
 * A component that shows the current player stats.
 */
withDefaults(
  defineProps<{
    /**
     * The player stats of the {@link Server}.
     */
    playerStats: PlayerStats;

    /**
     * The width (and height) of the player faces.
     */
    width?: number;
  }>(),
  { width: 32 },
);

const { t } = useI18n();
</script>

<style scoped></style>
