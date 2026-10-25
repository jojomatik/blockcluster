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
  <v-card variant="outlined" class="notice-card">
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
        <v-icon :icon="mdiGithub" class="text-medium-emphasis" />
      </a>
      <h5 v-else>
        {{ notice.name }}
        <code class="mx-1">{{ notice.version }}</code>
      </h5>
    </v-card-title>
    <v-card-subtitle>
      {{
        notice.author
          ? t("gui.views.about.notice.author.by_author", {
              author: notice.author,
            })
          : t("gui.views.about.notice.author.not_specified")
      }}
    </v-card-subtitle>
    <v-card-text>
      <code
        v-if="!notice.notice || notice.notice.split(/\n/).length < 2"
        class="licenseText"
      >
        {{ notice.notice }}
      </code>
      <v-expansion-panels v-else variant="accordion" flat>
        <v-expansion-panel>
          <v-expansion-panel-title class="px-0">
            {{ t("gui.views.about.notice.license") }}
          </v-expansion-panel-title>
          <v-expansion-panel-text>
            <code class="licenseText">{{ notice.notice }}</code>
          </v-expansion-panel-text>
        </v-expansion-panel>
      </v-expansion-panels>
    </v-card-text>
  </v-card>
</template>

<script setup lang="ts">
import { mdiGithub } from "@mdi/js";
import type Notice from "#shared/components/software_notice";

/**
 * A component that renders a single third party notice.
 */
defineProps<{ notice: Notice }>();

const { t } = useI18n();
</script>

<style scoped>
.v-application a {
  margin: 10px;
  color: inherit;
  text-decoration: none;
}

.notice-card {
  border-color: rgba(var(--v-border-color), var(--v-border-opacity));
}

code {
  display: inline;
  padding: 0 0.4em;
  border-radius: 3px;
  background-color: rgba(var(--v-theme-on-surface), 0.05);
  font-size: 85%;
  white-space: normal;
}

.notice-card
  :deep(.v-expansion-panel-title--active > .v-expansion-panel-title__overlay) {
  opacity: 0;
}
</style>
