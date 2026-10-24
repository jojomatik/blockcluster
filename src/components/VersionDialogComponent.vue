<template>
  <v-dialog v-model="dialog" max-width="450px" @click:outside="close">
    <template v-slot:activator="{ on, attrs }">
      <v-btn
        small
        outlined
        class="ml-2"
        v-bind="attrs"
        v-on="on"
        :disabled="disabled"
        @click="open"
      >
        {{ $t("gui.views.server.version_dialog.choose") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        {{ $t("gui.views.server.version_dialog.main_title") }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" dense text>
          {{ $t("gui.views.server.version_dialog.error") }}
        </v-alert>

        <div v-if="updates && (updates.build || updates.patch)" class="mb-4">
          <v-btn
            v-if="updates.build"
            block
            outlined
            class="mb-2"
            :disabled="installing"
            :loading="installing"
            @click="run(() => server.installUpdate('build', encodedName))"
          >
            {{
              $t("gui.views.server.version_dialog.update_build", {
                build: updates.build.build,
                version: updates.build.version,
              })
            }}
          </v-btn>
          <v-btn
            v-if="updates.patch"
            block
            outlined
            :disabled="installing"
            :loading="installing"
            @click="run(() => server.installUpdate('patch', encodedName))"
          >
            {{
              $t("gui.views.server.version_dialog.update_patch", {
                version: updates.patch.version,
              })
            }}
          </v-btn>
        </div>

        <div class="text-subtitle-2">
          {{ $t("gui.views.server.version_dialog.download_new") }}
        </div>
        <v-select
          dense
          :items="versions"
          :label="$t('gui.views.server.version_dialog.version')"
          :loading="loadingVersions"
          :disabled="installing"
          v-model="version"
          @change="loadBuilds"
        />
        <v-select
          dense
          :items="builds"
          item-value="build"
          :item-text="formatBuild"
          :label="$t('gui.views.server.version_dialog.build')"
          :loading="loadingBuilds"
          :disabled="installing || !version"
          v-model="build"
        />
        <p class="font-weight-light" style="font-size: 12px">
          {{ $t("gui.views.server.version_dialog.warning") }}
        </p>
        <v-btn
          block
          outlined
          class="mb-4"
          :disabled="installing || !version || build === null"
          :loading="installing"
          @click="run(() => server.installVersion(version, build, encodedName))"
        >
          {{ $t("gui.views.server.version_dialog.install") }}
        </v-btn>

        <div class="text-subtitle-2">
          {{ $t("gui.views.server.version_dialog.select_existing") }}
        </div>
        <p
          v-if="!loadingOldJars && oldJars.length === 0"
          class="font-weight-light"
          style="font-size: 12px"
        >
          {{ $t("gui.views.server.version_dialog.no_existing") }}
        </p>
        <template v-else>
          <v-select
            dense
            :items="oldJars"
            :loading="loadingOldJars"
            :disabled="installing"
            v-model="oldJar"
          />
          <v-btn
            block
            outlined
            :disabled="installing || !oldJar"
            :loading="installing"
            @click="run(() => server.installExistingJar(oldJar, encodedName))"
          >
            {{ $t("gui.views.server.version_dialog.install") }}
          </v-btn>
        </template>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn text @click="close">
          {{ $t("gui.views.server.version_dialog.cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";
import Server from "@/lib/components/server";

/**
 * A button and dialog to select a specific Paper version and build to install.
 */
@Component
export default class VersionDialogComponent extends Vue {
  @Prop() private server!: Server;

  @Prop({ default: false }) private disabled!: boolean;

  /**
   * The available quick updates for the current jar.
   */
  @Prop({ default: null }) private updates!: {
    build: { version: string; build: number } | null;
    patch: { version: string; build: number } | null;
  } | null;

  private oldJars: string[] = [];
  private oldJar: string | null = null;
  private loadingOldJars = false;

  private get encodedName(): string {
    return encodeURIComponent(this.server.name);
  }

  private dialog = false;
  private versions: string[] = [];
  private builds: { build: number; time: string }[] = [];
  private version: string | null = null;
  private build: number | null = null;
  private loadingVersions = false;
  private loadingBuilds = false;
  private installing = false;
  private error = false;

  private async open(): Promise<void> {
    this.error = false;
    this.version = null;
    this.build = null;
    this.builds = [];
    this.oldJar = null;
    this.loadingVersions = true;
    this.loadingOldJars = true;
    const [versions, oldJars] = await Promise.allSettled([
      this.server.fetchPaperVersions(),
      this.server.fetchOldJars(this.encodedName),
    ]);
    if (versions.status === "fulfilled") this.versions = versions.value;
    else this.error = true;
    if (oldJars.status === "fulfilled") this.oldJars = oldJars.value;
    else this.error = true;
    this.loadingVersions = false;
    this.loadingOldJars = false;
  }

  private async loadBuilds(version: string): Promise<void> {
    this.build = null;
    this.builds = [];
    this.error = false;
    this.loadingBuilds = true;
    try {
      const builds = await this.server.fetchPaperBuilds(version);
      if (this.version === version) {
        this.builds = builds;
        if (builds.length > 0) this.build = builds[0].build;
      }
    } catch (e) {
      if (this.version === version) this.error = true;
    } finally {
      if (this.version === version) this.loadingBuilds = false;
    }
  }

  private formatBuild(item: { build: number; time: string }): string {
    return `${item.build} (${new Date(item.time).toLocaleDateString()})`;
  }

  private async run(action: () => Promise<unknown>): Promise<void> {
    this.installing = true;
    try {
      await action();
      this.$emit("installed");
      this.close();
    } catch (e) {
      this.error = true;
    } finally {
      this.installing = false;
    }
  }

  private close(): void {
    this.dialog = false;
  }
}
</script>
