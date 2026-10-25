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
    <v-app-bar scroll-behavior="hide" color="primary" class="text-secondary">
      <div class="d-flex align-center">
        <v-chip
          theme="light"
          style="height: 40px; padding: 0"
          class="mr-2 rounded-pill"
        >
          <v-img
            alt="blockcluster Icon"
            class="shrink"
            src="/icon.svg"
            width="40"
          />
        </v-chip>
        <v-app-bar-title style="letter-spacing: 1px">
          <h3>blockcluster</h3>
        </v-app-bar-title>
      </div>

      <v-tabs color="secondary" class="ml-4">
        <v-tab to="/">{{ t("gui.appbar.navigation.home.title") }}</v-tab>
        <v-tab to="/about">{{ t("gui.appbar.navigation.about.title") }}</v-tab>
      </v-tabs>

      <v-spacer></v-spacer>
      <v-switch
        :model-value="dark"
        hide-details
        color="secondary"
        @update:model-value="setDark"
      >
        <template #label>
          <span style="white-space: nowrap" class="text-secondary">
            {{ t("gui.appbar.dark_mode") }}
          </span>
        </template>
      </v-switch>
      <v-select
        :items="availableLanguages"
        hide-details
        :model-value="locale"
        density="compact"
        :menu-icon="''"
        style="width: 112px"
        variant="solo"
        flat
        bg-color="primary"
        color="secondary"
        @update:model-value="setLanguage"
      >
        <template #item="{ item, props: itemProps }">
          <v-list-item v-bind="itemProps" :title="undefined">
            <div class="d-flex align-center justify-start">
              {{
                te("gui.appbar.language_select." + item.value)
                  ? t("gui.appbar.language_select." + item.value) +
                    " (" +
                    item.value +
                    ")"
                  : item.value
              }}
            </div>
          </v-list-item>
        </template>
        <template #selection="{ item }">
          <div
            class="d-flex align-center justify-start text-secondary font-weight-medium"
          >
            <v-icon class="mr-1" color="secondary" :icon="mdiTranslate" />
            {{ item.value.toUpperCase() }}
          </div>
        </template>
      </v-select>
    </v-app-bar>

    <v-main>
      <NuxtPage />
    </v-main>
    <v-footer class="footer" color="transparent">
      <v-col>
        <v-row class="justify-center">
          <span> Copyright © 2021 jojomatik </span>
        </v-row>
        <v-row class="justify-center">
          <span>
            {{ t("gui.footer.notice.license") }}
          </span>
        </v-row>
        <v-row class="justify-center">
          <span>
            {{ t("gui.footer.notice.link_description") }}
            <v-chip id="gh-link" size="small" :href="GIT_ROOT" color="#24292e">
              <v-icon class="pr-1" :icon="mdiGithub" />
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

<script setup lang="ts">
import { mdiGithub, mdiTranslate } from "@mdi/js";
import GitHubVersionLink from "@/components/GitHubVersionLink.vue";
import { getVersion } from "#shared/version";

/**
 * The link to the GitHub repository.
 */
const GIT_ROOT = "https://github.com/jojomatik/blockcluster";

const { t, te, locale, availableLocales, setLocale } = useI18n();
const theme = useTheme();
const config = useRuntimeConfig();

useHead({ htmlAttrs: { lang: locale } });

/**
 * The current version of this software. Either a release version (e.g. `v0.1.0`) or a short commit SHA.
 */
const version = getVersion(config.public.gitRef, config.public.gitSha);

/**
 * The available languages.
 */
const availableLanguages = availableLocales;

const dark = computed(() => theme.current.value.dark);

/**
 * Loads the selected theme and language from local storage.
 */
onMounted(() => {
  theme.change(localStorage.getItem("dark") === "true" ? "dark" : "light");
  const lang = localStorage.getItem("lang");
  if (lang && availableLocales.includes(lang))
    void setLocale(lang as typeof locale.value);
});

/**
 * Applies and stores the selected theme in local storage.
 */
function setDark(value: boolean | null) {
  theme.change(value ? "dark" : "light");
  localStorage.setItem("dark", String(value === true));
}

/**
 * Applies and stores the selected language in local storage.
 */
function setLanguage(value: string) {
  void setLocale(value as typeof locale.value);
  localStorage.setItem("lang", value);
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
