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
  <v-app>
    <v-app-bar app hide-on-scroll color="primary" class="secondary--text">
      <div class="d-flex align-center">
        <v-chip
          light
          style="height: 40px; padding: 0"
          class="mr-2 rounded-pill"
        >
          <v-img
            alt="blockcluster Icon"
            class="shrink"
            contain
            src="/icon.svg"
            transition="scale-transition"
            width="40"
          />
        </v-chip>
        <h2 style="letter-spacing: 1px">blockcluster</h2>
      </div>

      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>

      <v-spacer></v-spacer>
      <v-switch
        v-model="$vuetify.theme.dark"
        hide-details
        color="secondary"
        @change="storeTheme"
      >
        <template v-slot:label>
          <span class="secondary--text">Dark mode</span>
        </template>
      </v-switch>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
    <v-footer class="footer" color="transparent">
      <v-col>
        <v-row class="justify-center">
          <span> Copyright © 2021 jojomatik </span>
        </v-row>
        <v-row class="justify-center">
          <span>
            The source code of blockcluster is licensed under the AGPL-3.0
            license.
          </span>
        </v-row>
        <v-row class="justify-center">
          <span>
            View the source code and license on
            <v-chip
              small
              :href="GIT_ROOT"
              id="gh-link"
              color="#24292e"
              text-color="white"
            >
              <v-icon class="pr-1">mdi-github</v-icon>
              GitHub
            </v-chip>
            <GitHubVersionLink :git-root="GIT_ROOT" :version="version">
            </GitHubVersionLink>
          </span>
        </v-row>
      </v-col>
    </v-footer>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import GitHubVersionLink from "@/components/GitHubVersionLink.vue";
import { getVersion } from "../common/version";

/**
 * The link to the GitHub repository.
 */
const GIT_ROOT = "https://github.com/jojomatik/blockcluster";

/**
 * The main {@link Vue}-View that contains the App.
 */
@Component({
  components: { GitHubVersionLink },
  metaInfo: {
    titleTemplate: "%s - blockcluster",
  },
  data() {
    return { GIT_ROOT };
  },
})
export default class App extends Vue {
  /**
   * The current version of this software. Either a release version (e.g. `v0.1.0`) or a short commit SHA.
   */
  version = getVersion();

  /**
   * Loads the selected theme from local storage.
   */
  mounted() {
    this.$nextTick(() => {
      this.$nextTick(() => {
        this.$vuetify.theme.dark = localStorage.getItem("dark") === "true";
      });
    });
  }

  /**
   * Stores the selected theme in local storage.
   * @private
   */
  private storeTheme() {
    localStorage.setItem("dark", this.$vuetify.theme.dark.toString());
  }
}
</script>

<style lang="scss" scoped>
.v-application a {
  margin: 10px;
  color: var(--v-accent);
  &.router-link-exact-active {
    text-decoration: none;
  }
}

.footer {
  font-size: 12px;
}

#gh-link {
  padding: 2px 6px 2px 0;
  margin: 0;
}
</style>
