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
  <span style="display: inline-flex; margin: 2px">
    (
    <a v-if="this.isRelease()" :href="gitRoot + '/releases/tag/' + version">
      {{ version }}
    </a>
    <a v-else :href="gitRoot + '/tree/' + version">
      <code>{{ version }}</code>
    </a>
    )
  </span>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

const VERSION_REGEXP = new RegExp("v\\d.\\d.\\d");

/**
 * A {@link Vue}-component that renders the current version as a link to the GitHub repository in parenthesis.
 */
@Component({})
export default class GitHubVersionLink extends Vue {
  /**
   * The current version of this software. Either a release version (e.g. `v0.1.0`) or a short commit SHA.
   */
  @Prop() version!: string;

  /**
   * The link to the root of the GitHub repository.
   */
  @Prop() gitRoot!: string;

  /**
   * Returns `true` if {@link #version} is a release version (e.g. `v0.1.0`) and false if it's a commit SHA.
   */
  isRelease(): boolean | null {
    return this.version != null
      ? this.version.match(VERSION_REGEXP) != null
      : null;
  }
}
</script>

<style scoped lang="scss">
.v-application a {
  color: var(--v-accent);
}
</style>
