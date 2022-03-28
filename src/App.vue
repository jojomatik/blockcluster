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
        <v-app-bar-title style="letter-spacing: 1px">
          <h3>blockcluster</h3>
        </v-app-bar-title>
      </div>

      <v-tabs color="secondary--text" class="ml-4">
        <v-tab to="/">{{ $t("gui.appbar.navigation.home.title") }}</v-tab>
        <v-tab to="/about">{{ $t("gui.appbar.navigation.about.title") }}</v-tab>
      </v-tabs>

      <v-spacer></v-spacer>
      <v-switch
        v-model="$vuetify.theme.dark"
        hide-details
        color="secondary"
        @change="storeTheme"
      >
        <template v-slot:label>
          <span style="white-space: nowrap" class="secondary--text">
            {{ $t("gui.appbar.dark_mode") }}
          </span>
        </template>
      </v-switch>
      <v-select
        :items="availableLanguages"
        hide-details
        v-model="$i18n.locale"
        @change="storeLanguage"
        dense
        append-icon=""
        style="width: 92px"
        flat
        solo
        background-color="primary"
        color="secondary"
      >
        <template v-slot:item="data">
          <div class="d-flex align-center justify-start">
            {{
              $t("gui.appbar.language_select." + data.item, data.item) +
              " (" +
              data.item +
              ")"
            }}
          </div>
        </template>
        <template v-slot:selection="data">
          <div
            class="d-flex align-center justify-start secondary--text font-weight-medium"
          >
            <v-icon class="mr-1" color="secondary">mdi-translate</v-icon>
            {{ data.item.toUpperCase() }}
          </div>
        </template>
      </v-select>
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
            {{ $t("gui.footer.notice.license") }}
          </span>
        </v-row>
        <v-row class="justify-center">
          <span>
            {{ $t("gui.footer.notice.link_description") }}
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
   * The available languages.
   */
  availableLanguages = this.$i18n.availableLocales;

  /**
   * Loads the selected theme and language from local storage.
   */
  mounted() {
    this.$nextTick(() => {
      this.$nextTick(() => {
        this.$vuetify.theme.dark = localStorage.getItem("dark") === "true";
        const lang = localStorage.getItem("lang");
        if (lang) this.$i18n.locale = lang;
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

  /**
   * Stores the selected language in local storage.
   * @private
   */
  private storeLanguage() {
    localStorage.setItem("lang", this.$i18n.locale);
  }
}
</script>

<style lang="scss" scoped>
.footer {
  font-size: 12px;
}

#gh-link {
  padding: 2px 6px 2px 0;
  margin: 0;
}
</style>
