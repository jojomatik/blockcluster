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
      class="my-auto ml-2"
      :style="'width: ' + width + 'px; image-rendering: pixelated'"
      v-for="player in playerStats.sample"
      :key="player.uuid"
    >
      <v-tooltip bottom>
        <template v-slot:activator="{ on, attrs }">
          <v-img
            v-bind="attrs"
            v-on="on"
            :src="'data:image/png;base64,' + player.head"
            aspect-ratio="1"
            :alt="'Head of ' + player.name"
          ></v-img>
        </template>
        <span>{{ player.name }}</span>
      </v-tooltip>
    </span>
  </span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import { playerStats } from "../../common/components/server";

/**
 * A component that shows the current player stats.
 */
@Component
export default class PlayerStatsComponent extends Vue {
  /**
   * The player stats of the {@link Server}.
   * @private
   */
  @Prop() private playerStats!: playerStats;

  /**
   * The width (and height) of the player faces.
   * @private
   */
  @Prop({ default: 32 }) private width!: number;
}
</script>

<style scoped></style>
