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
  <v-card outlined>
    <v-card-title>
      <a
        v-if="notice.repositoryLink"
        :href="notice.repositoryLink"
        style="display: flex"
        class="ma-0"
      >
        <h5>
          {{ notice.name }}
          <code class="mx-1">{{ notice.version }}</code>
        </h5>
        <v-icon> mdi-github </v-icon>
      </a>
      <h5 v-else>
        {{ notice.name }}
        <code class="mx-1">{{ notice.version }}</code>
      </h5>
    </v-card-title>
    <v-card-subtitle>
      {{ notice.author ? "by " + notice.author : "author not specified" }}
    </v-card-subtitle>
    <v-card-text>
      <code
        class="licenseText"
        v-if="!notice.notice || notice.notice.split(/\n/).length < 2"
      >
        {{ notice.notice }}
      </code>
      <v-expansion-panels v-else accordion flat>
        <v-expansion-panel>
          <v-expansion-panel-header class="px-0">
            License
          </v-expansion-panel-header>
          <v-expansion-panel-content>
            <code class="licenseText">{{ notice.notice }}</code>
          </v-expansion-panel-content>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Notice from "../../common/components/software_notice";

/**
 * A component that renders a single third party notice.
 */
@Component
export default class NoticeComponent extends Vue {
  @Prop() notice?: Notice;
}
</script>

<style scoped lang="scss">
.v-application a {
  margin: 10px;
  color: var(--v-accent);
  text-decoration: none;
}
</style>
