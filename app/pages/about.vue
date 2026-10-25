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
  <v-container class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            {{ t("gui.views.about.title", { name: projectName }) }}
          </v-card-title>
          <v-card-text>
            {{ t("gui.views.about.description") }}
            <NoticeComponent
              v-if="!loading"
              class="mt-4"
              :notice="projectNotice"
            />
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>
            {{
              t("gui.views.about.libraries.backend.title", {
                name: projectName,
              })
            }}
          </v-card-title>
          <v-card-text>
            {{
              t("gui.views.about.libraries.backend.description", {
                name: projectName,
              })
            }}
            <div v-if="!loading" class="mt-4">
              <v-container fluid class="pa-0">
                <v-row>
                  <v-col
                    v-for="notice in backendNotices"
                    :key="notice.name"
                    cols="12"
                    lg="6"
                    xl="4"
                  >
                    <NoticeComponent :notice="notice" />
                  </v-col>
                </v-row>
              </v-container>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <v-card>
          <v-card-title>
            {{
              t("gui.views.about.libraries.frontend.title", {
                name: projectName,
              })
            }}
          </v-card-title>
          <v-card-text>
            {{
              t("gui.views.about.libraries.frontend.description", {
                name: projectName,
              })
            }}
            <div v-if="!loading" class="mt-4">
              <v-container fluid class="pa-0">
                <v-row>
                  <v-col
                    v-for="notice in frontendNotices"
                    :key="notice.name"
                    cols="12"
                    lg="6"
                    xl="4"
                  >
                    <NoticeComponent :notice="notice" />
                  </v-col>
                </v-row>
              </v-container>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import NoticeComponent from "@/components/NoticeComponent.vue";
import { getVersion } from "#shared/version";
import Notice from "#shared/components/software_notice";
import licenseText from "../../LICENSE?raw";

/**
 * A view that shows an about section.
 */
const { t } = useI18n();
const config = useRuntimeConfig();

useHead({ title: "About" });

/**
 * A variable that shows whether loading is done or not.
 */
const loading = ref(true);

/**
 * The name of the project.
 */
const projectName = "blockcluster";

/**
 * The notice block for this project.
 */
const projectNotice = ref<Notice>();

/**
 * The notice blocks of all backend dependencies.
 */
const backendNotices = ref<Notice[]>([]);

/**
 * The notice blocks of all frontend dependencies.
 */
const frontendNotices = ref<Notice[]>([]);

/**
 * Loads the dependency info and licenses.
 */
onMounted(async () => {
  projectNotice.value = getBlockclusterNotice();
  backendNotices.value = await getBackendNotices();
  frontendNotices.value = await getFrontEndNotices();
  loading.value = false;
});

/**
 * Returns the notice block for the current project.
 */
function getBlockclusterNotice(): Notice {
  return new Notice(
    projectName,
    getVersion(config.public.gitRef, config.public.gitSha),
    "jojomatik",
    "git+https://github.com/jojomatik/blockcluster.git",
    licenseText,
  );
}

/**
 * Returns the notice blocks for all backend dependencies.
 */
async function getBackendNotices(): Promise<Notice[]> {
  return (await (await fetch("/api/dependencies")).json())["dependencies"];
}

/**
 * Returns the notice blocks for all frontend dependencies.
 */
async function getFrontEndNotices(): Promise<Notice[]> {
  // Fetch the license information generated at build time by the license module.
  const licenses: {
    name: string;
    version: string;
    author: { name: string } | null;
    license: string;
    licenseText: string | null;
    repository: { url: string } | string | null;
  }[] = await (await fetch("/dependencies.json")).json();

  return licenses
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((license) => {
      let repositoryLink =
        typeof license.repository === "string"
          ? license.repository
          : license.repository?.url;
      let repositoryOwner = "";

      if (repositoryLink) {
        // Normalize github URL to `https://github.com/<owner>/<repository>`.
        const repositoryCoordinates = repositoryLink
          .replace(/.+?(github.com\/)/, "")
          .replace(".git", "");
        repositoryLink = "https://github.com/" + repositoryCoordinates;
        repositoryOwner = repositoryCoordinates.split("/")[0];
      }

      return new Notice(
        license.name,
        license.version,
        license.author?.name ?? repositoryOwner,
        repositoryLink ?? "",
        (license.licenseText ?? license.license).replace(
          /^[\r\n]+|[\r\n]+$/g,
          "",
        ),
      );
    });
}
</script>

<style lang="scss">
code.licenseText {
  white-space: pre-wrap;
  display: block;
  width: fit-content;
}
</style>
