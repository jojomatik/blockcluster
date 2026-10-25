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
    <v-alert v-if="loadError" class="mb-4" type="error">
      {{ loadError.message }}
    </v-alert>
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

interface FrontendLicense {
  name: string;
  version: string;
  author: { name: string } | null;
  license: string;
  licenseText: string | null;
  repository: { url: string } | string | null;
}

/**
 * A view that shows an about section.
 */
const { t } = useI18n();
const config = useRuntimeConfig();
const requestFetch = useRequestFetch();

useHead({ title: "About" });

/**
 * A variable that shows whether loading is done or not.
 */
/**
 * The name of the project.
 */
const projectName = "blockcluster";

/**
 * The notice block for this project.
 */
const projectNotice = getBlockclusterNotice();

/**
 * The notice blocks of all backend dependencies.
 */
const {
  data: notices,
  pending: loading,
  error: loadError,
} = await useAsyncData("about-dependency-notices", async () => {
  const [backendResponse, frontendLicenses] = await Promise.all([
    requestFetch<{ dependencies: Notice[] }>("/api/dependencies"),
    requestFetch<FrontendLicense[]>("/dependencies.json"),
  ]);

  return {
    backend: backendResponse.dependencies,
    // Plain objects, since class instances can not be serialized into the SSR payload.
    frontend: parseFrontendNotices(frontendLicenses).map((notice) => ({
      ...notice,
    })),
  };
});
const backendNotices = computed(() => notices.value?.backend ?? []);
const frontendNotices = computed(() => notices.value?.frontend ?? []);

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
 * Returns the notice blocks for all frontend dependencies.
 */
function parseFrontendNotices(licenses: FrontendLicense[]): Notice[] {
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
        repositoryOwner = repositoryCoordinates.split("/")[0] ?? "";
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
