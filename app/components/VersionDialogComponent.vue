<template>
  <v-dialog v-model="dialog" max-width="450px" @click:outside="close">
    <template #activator="{ props: activatorProps }">
      <v-btn
        size="small"
        variant="outlined"
        class="ml-2"
        v-bind="activatorProps"
        :disabled="disabled"
        @click="open"
      >
        {{ t("gui.views.server.version_dialog.choose") }}
      </v-btn>
    </template>
    <v-card>
      <v-card-title>
        {{ t("gui.views.server.version_dialog.main_title") }}
      </v-card-title>
      <v-card-text>
        <v-alert v-if="error" type="error" density="compact" variant="tonal">
          {{ t("gui.views.server.version_dialog.error") }}
        </v-alert>

        <div v-if="updates && (updates.build || updates.patch)" class="mb-4">
          <v-btn
            v-if="updates.build"
            block
            variant="outlined"
            class="mb-2"
            :disabled="installing"
            :loading="installing"
            @click="run(() => server.installUpdate('build', encodedName))"
          >
            {{
              t("gui.views.server.version_dialog.update_build", {
                build: updates.build.build,
                version: updates.build.version,
              })
            }}
          </v-btn>
          <v-btn
            v-if="updates.patch"
            block
            variant="outlined"
            :disabled="installing"
            :loading="installing"
            @click="run(() => server.installUpdate('patch', encodedName))"
          >
            {{
              t("gui.views.server.version_dialog.update_patch", {
                version: updates.patch.version,
              })
            }}
          </v-btn>
        </div>

        <div class="text-subtitle-2">
          {{ t("gui.views.server.version_dialog.download_new") }}
        </div>
        <v-select
          v-model="version"
          variant="underlined"
          density="compact"
          :items="versions"
          :label="t('gui.views.server.version_dialog.version')"
          :loading="loadingVersions"
          :disabled="installing"
          @update:model-value="loadBuilds"
        />
        <v-select
          v-model="build"
          variant="underlined"
          density="compact"
          :items="builds"
          item-value="build"
          :item-title="formatBuild"
          :label="t('gui.views.server.version_dialog.build')"
          :loading="loadingBuilds"
          :disabled="installing || !version"
        />
        <p class="font-weight-light" style="font-size: 12px">
          {{ t("gui.views.server.version_dialog.warning") }}
        </p>
        <v-btn
          block
          variant="outlined"
          class="mb-4"
          :disabled="installing || !version || build === null"
          :loading="installing"
          @click="run(installSelectedVersion)"
        >
          {{ t("gui.views.server.version_dialog.install") }}
        </v-btn>

        <div class="text-subtitle-2">
          {{ t("gui.views.server.version_dialog.select_existing") }}
        </div>
        <p
          v-if="!loadingOldJars && oldJars.length === 0"
          class="font-weight-light"
          style="font-size: 12px"
        >
          {{ t("gui.views.server.version_dialog.no_existing") }}
        </p>
        <template v-else>
          <v-select
            v-model="oldJar"
            variant="underlined"
            density="compact"
            :items="oldJars"
            :loading="loadingOldJars"
            :disabled="installing"
          />
          <v-btn
            block
            variant="outlined"
            :disabled="installing || !oldJar"
            :loading="installing"
            @click="run(installSelectedJar)"
          >
            {{ t("gui.views.server.version_dialog.install") }}
          </v-btn>
        </template>
      </v-card-text>
      <v-card-actions class="justify-end">
        <v-btn variant="text" @click="close">
          {{ t("gui.views.server.version_dialog.cancel") }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import type Server from "@/lib/components/server";

/**
 * A button and dialog to select a specific Paper version and build to install.
 */
const props = withDefaults(
  defineProps<{
    server: Server;

    disabled?: boolean;

    /**
     * The available quick updates for the current jar.
     */
    updates?: {
      build: { version: string; build: number } | null;
      patch: { version: string; build: number } | null;
    } | null;
  }>(),
  { disabled: false, updates: null },
);

const emit = defineEmits<{ (e: "installed"): void }>();

const { t } = useI18n();

const oldJar = ref<string | null>(null);

const encodedName = computed<string>(() =>
  encodeURIComponent(props.server.name),
);

const dialog = ref(false);
const version = ref<string | null>(null);
const build = ref<number | null>(null);
const installing = ref(false);
const installError = ref(false);

const asyncOptions = { immediate: false, server: false } as const;
const {
  data: versions,
  status: versionsStatus,
  error: versionsError,
  refresh: refreshVersions,
} = useAsyncData(
  "paper-versions",
  () => $fetch<string[]>("/api/paper/versions"),
  { ...asyncOptions, default: () => [] },
);
const {
  data: oldJars,
  status: oldJarsStatus,
  error: oldJarsError,
  refresh: refreshOldJars,
  clear: clearOldJars,
} = useAsyncData(
  () => "old-jars-" + encodedName.value,
  () => $fetch<string[]>(`/api/servers/${encodedName.value}/oldjars`),
  { ...asyncOptions, default: () => [] },
);
const {
  data: builds,
  status: buildsStatus,
  error: buildsError,
  refresh: refreshBuilds,
  clear: clearBuilds,
} = useAsyncData(
  () => "paper-builds-" + encodedName.value,
  () =>
    $fetch<{ build: number; time: string }[]>(
      `/api/paper/versions/${encodeURIComponent(version.value ?? "")}/builds`,
    ),
  { ...asyncOptions, default: () => [] },
);
const loadingVersions = computed(() => versionsStatus.value === "pending");
const loadingOldJars = computed(() => oldJarsStatus.value === "pending");
const loadingBuilds = computed(() => buildsStatus.value === "pending");
const error = computed(
  () =>
    installError.value ||
    !!versionsError.value ||
    !!oldJarsError.value ||
    !!buildsError.value,
);

async function open(): Promise<void> {
  dialog.value = true;
  installError.value = false;
  version.value = null;
  build.value = null;
  oldJar.value = null;
  clearBuilds();
  clearOldJars();
  await Promise.all([refreshVersions(), refreshOldJars()]);
}

async function loadBuilds(selectedVersion: string): Promise<void> {
  build.value = null;
  clearBuilds();
  installError.value = false;
  await refreshBuilds();
  // Ignore results of superseded requests.
  if (version.value !== selectedVersion || buildsError.value) return;
  const latestBuild = builds.value?.[0];
  if (latestBuild) build.value = latestBuild.build;
}

function installSelectedVersion(): Promise<Response> {
  if (version.value === null || build.value === null)
    return Promise.reject(new Error("Select a Paper version and build first."));
  return props.server.installVersion(
    version.value,
    build.value,
    encodedName.value,
  );
}

function installSelectedJar(): Promise<Response> {
  if (oldJar.value === null)
    return Promise.reject(new Error("Select an existing server jar first."));
  return props.server.installExistingJar(oldJar.value, encodedName.value);
}

function formatBuild(item: { build: number; time: string }): string {
  return `${item.build} (${new Date(item.time).toLocaleDateString()})`;
}

async function run(action: () => Promise<unknown>): Promise<void> {
  installing.value = true;
  try {
    await action();
    emit("installed");
    close();
  } catch {
    installError.value = true;
  } finally {
    installing.value = false;
  }
}

function close(): void {
  dialog.value = false;
}
</script>
