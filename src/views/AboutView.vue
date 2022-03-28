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
            {{ $t("gui.views.about.title", { name: projectName }) }}
          </v-card-title>
          <v-card-text>
            {{ $t("gui.views.about.description") }}
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
              $t("gui.views.about.libraries.backend.title", {
                name: projectName,
              })
            }}
          </v-card-title>
          <v-card-text>
            {{
              $t("gui.views.about.libraries.backend.description", {
                name: projectName,
              })
            }}
            <div class="mt-4" v-if="!this.loading">
              <v-container fluid class="pa-0">
                <v-row>
                  <v-col
                    cols="12"
                    lg="6"
                    xl="4"
                    v-for="notice in backendNotices"
                    :key="notice.name"
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
              $t("gui.views.about.libraries.frontend.title", {
                name: projectName,
              })
            }}
          </v-card-title>
          <v-card-text>
            {{
              $t("gui.views.about.libraries.frontend.description", {
                name: projectName,
              })
            }}
            <div class="mt-4" v-if="!this.loading">
              <v-container fluid class="pa-0">
                <v-row>
                  <v-col
                    cols="12"
                    lg="6"
                    xl="4"
                    v-for="notice in frontendNotices"
                    :key="notice.name"
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

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";
import NoticeComponent from "@/components/NoticeComponent.vue";
import { getVersion } from "../../common/version";
import Notice from "../../common/components/software_notice";

/**
 * A {@link Vue}-View that shows an about section.
 */
@Component({
  components: { NoticeComponent },
  metaInfo: {
    title: "About",
  },
})
export default class AboutView extends Vue {
  /**
   * A variable that shows whether loading is done or not.
   */
  loading = true;

  /**
   * The name of the project.
   */
  projectName = "blockcluster";

  /**
   * The notice block for this project.
   */
  projectNotice!: Notice;

  /**
   * The notice blocks of all backend dependencies.
   */
  backendNotices!: Notice[];

  /**
   * The notice blocks of all frontend dependencies.
   */
  frontendNotices!: Notice[];

  /**
   * Loads the dependency info and licenses.
   */
  async created() {
    this.projectNotice = await this.getBlockclusterNotice();
    this.backendNotices = await this.getBackendNotices();
    this.frontendNotices = await this.getFrontEndNotices();
    this.loading = false;
  }

  /**
   * Returns the notice block for the current project.
   */
  async getBlockclusterNotice(): Promise<Notice> {
    return new Notice(
      this.projectName,
      getVersion(),
      "jojomatik",
      "git+https://github.com/jojomatik/blockcluster.git",
      await (await fetch("LICENSE")).text()
    );
  }

  /**
   * Returns the notice blocks for all backend dependencies.
   */
  async getBackendNotices(): Promise<Notice[]> {
    return (await (await fetch("api/dependencies")).json())["dependencies"];
  }

  /**
   * Returns the notice blocks for all frontend dependencies.
   */
  async getFrontEndNotices(): Promise<Notice[]> {
    // Fetch license file from LicenseCheckerWebpackPlugin and split it with dash-line separation.
    const split = (await (await fetch("ThirdPartyNotices.txt")).text()).split(
      "--------------------------------------------------------------------------------\n"
    );

    const notices: Notice[] = [];
    for (let i = 1; i < split.length; i = i + 2) {
      // Header: part between two dash-lines
      const header: string = split[i];
      const headerSplitByNewline = header.split(/\n/);
      const headerSplitByDash = headerSplitByNewline[0].split(/ - /);
      const headerSplitBySpace = headerSplitByDash[0].split(/[( -) \n]/);

      const title = headerSplitBySpace[0];
      const version = headerSplitBySpace[1];
      const author = headerSplitByDash.length > 1 ? headerSplitByDash[1] : "";
      const link = headerSplitByNewline[1];

      notices.push(
        new Notice(
          title,
          version,
          author,
          link,
          split[i + 1].replace(/^[\r\n]+|[\r\n]+$/g, "")
        )
      );
    }
    return notices;
  }
}
</script>

<style lang="scss">
code.licenseText {
  white-space: pre-wrap;
  display: block;
  width: fit-content;
}
</style>
