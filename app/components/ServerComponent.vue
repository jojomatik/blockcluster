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
  <v-container v-if="detailed" class="home" fluid>
    <v-row>
      <v-col cols="12">
        <v-card class="server">
          <v-skeleton-loader v-if="infoLoading" type="text" />
          <v-alert
            v-if="infoError"
            class="ma-4"
            type="error"
            density="compact"
            variant="tonal"
          >
            {{ t("gui.views.server.load_error.info") }}
            {{ infoError.message }}
            <template #append>
              <v-btn variant="text" @click="refreshInfo()">
                {{ t("gui.views.server.load_error.retry") }}
              </v-btn>
            </template>
          </v-alert>
          <v-card-title>
            <img
              v-if="server.favicon"
              class="mr-2"
              style="height: 32px"
              :src="server.favicon"
              :alt="t('gui.views.server.favicon.alt', { name: server.name })"
            />
            {{ server.name }}
            <ServerStatusComponent :status="server.status" />
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col>
                <v-table>
                  <colgroup>
                    <col style="width: calc(100% / 8)" />
                  </colgroup>
                  <tbody>
                    <tr>
                      <td>{{ t("gui.views.server.players.title") }}</td>
                      <td>
                        <PlayerStatsComponent :player-stats="server.players" />
                      </td>
                    </tr>
                    <tr>
                      <td>{{ t("gui.views.server.port") }}</td>
                      <td>{{ server.port }}</td>
                    </tr>
                    <tr>
                      <td>
                        {{ t("gui.views.server.executable") }}
                      </td>
                      <td>
                        {{ server.jar }}
                        <VersionDialogComponent
                          :server="server"
                          :disabled="server.status !== ServerStatus.Stopped"
                          :updates="updates"
                          @installed="onVersionInstalled"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ t("gui.views.server.autostart") }}
                      </td>
                      <td>
                        <v-switch
                          v-model="autostart"
                          class="ma-auto mb-1"
                          hide-details
                          color="secondary"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ t("gui.views.server.pause_on_idle.title") }}
                      </td>
                      <td>
                        <v-switch
                          class="ma-auto mb-1"
                          hide-details
                          color="secondary"
                          :model-value="pauseOnIdle.enable"
                          @update:model-value="setPauseEnabled"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ t("gui.views.server.pause_on_idle.timeout") }}
                      </td>
                      <td>
                        <v-text-field
                          variant="underlined"
                          hide-details
                          density="compact"
                          single-line
                          type="number"
                          :model-value="pauseOnIdle.timeout"
                          @update:model-value="setPauseTimeout"
                        >
                        </v-text-field>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        {{ t("gui.views.server.java_runtime") }}
                      </td>
                      <td style="display: flex; flex-direction: row">
                        <v-select
                          v-model="javaRuntime"
                          variant="underlined"
                          hide-details
                          density="compact"
                          :items="javaRuntimes"
                          :loading="javaRuntimesLoading"
                          :error-messages="
                            javaRuntimesError
                              ? t('gui.views.server.load_error.java_runtimes')
                              : undefined
                          "
                          :item-title="
                            (item) =>
                              `${item.isDefault ? 'Default - ' : ''}${
                                item.name
                              } - ${item.path}`
                          "
                          item-value="path"
                          item-color="secondary"
                          class="mt-2 pr-2"
                        />
                      </td>
                    </tr>
                    <FlagDialogComponent
                      :server="server"
                      :flags="server.flags"
                    />
                  </tbody>
                </v-table>
              </v-col>
            </v-row>
            <ResourceChartComponent :resource-usage="server.resourceUsage" />
            <ConsoleComponent
              :server="server"
              :status="server.status"
              @eula-required="showEulaDialog"
            />
            <v-dialog v-model="eulaDialog" persistent max-width="500px">
              <v-card>
                <v-card-title>
                  {{ t("gui.views.server.eula.title") }}
                </v-card-title>
                <v-card-text>
                  <p>{{ t("gui.views.server.eula.description") }}</p>
                  <p>
                    <a
                      href="https://www.minecraft.net/en-us/eula"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {{ t("gui.views.server.eula.link") }}
                    </a>
                  </p>
                  <v-checkbox
                    v-model="eulaAccepted"
                    :label="t('gui.views.server.eula.accept')"
                  />
                  <v-alert v-if="eulaError" type="error" density="compact">
                    {{ eulaError }}
                  </v-alert>
                </v-card-text>
                <v-card-actions class="justify-end">
                  <v-btn
                    variant="text"
                    :disabled="eulaLoading"
                    @click="cancelEula"
                  >
                    {{ t("gui.views.server.eula.cancel") }}
                  </v-btn>
                  <v-btn
                    variant="elevated"
                    color="secondary"
                    :disabled="!eulaAccepted || eulaLoading"
                    :loading="eulaLoading"
                    @click="acceptEula"
                  >
                    {{ t("gui.views.server.eula.start") }}
                  </v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-card-text>
          <v-card-actions class="px-4">
            <ToggleButtonComponent
              :status="server.status"
              :disabled="!hasJavaRuntime"
              @start="handleAction('start')"
              @stop="handleAction('stop')"
            />
            <RestartButtonComponent
              :status="server.status"
              :disabled="!hasJavaRuntime"
              @restart="handleAction('restart')"
            />
            <PauseButtonComponent
              :status="server.status"
              :disabled="!hasJavaRuntime"
              @pause="handleAction('pause')"
              @unpause="handleAction('start')"
            />
            <v-btn
              variant="elevated"
              class="server-card-button"
              color="secondary"
              @click="update"
            >
              <v-icon start :icon="mdiReload" />
              {{ t("gui.views.server.update_status") }}
            </v-btn>
            <WorldDeleteDialogComponent
              button-class="ml-auto"
              :server="server"
              :status="server.status"
            />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
  <v-card
    v-else
    :to="'/server/' + encodeURIComponent(server.name)"
    class="server"
  >
    <v-card-title>
      <img
        v-if="server.favicon"
        class="mr-2"
        style="height: 32px"
        :src="server.favicon"
        :alt="t('gui.views.server.favicon.alt', { name: server.name })"
      />
      {{ server.name }}
      <ServerStatusComponent :status="server.status" />
      <v-chip v-if="server.status === ServerStatus.Started" variant="flat">
        <PlayerStatsComponent :player-stats="server.players" :width="24" />
      </v-chip>
    </v-card-title>
    <v-card-text>
      <v-row>
        <v-col cols="6">
          <v-table>
            <colgroup>
              <col style="width: calc(100% / 4)" />
            </colgroup>
            <tbody>
              <tr>
                <td>{{ t("gui.views.server.port") }}</td>
                <td>{{ server.port }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-col>
      </v-row>
    </v-card-text>
    <v-card-actions>
      <v-btn
        variant="elevated"
        :to="'/server/' + encodeURIComponent(server.name)"
      >
        {{ t("gui.views.home.server.details") }}
      </v-btn>
    </v-card-actions>
  </v-card>
</template>

<script setup lang="ts">
import { mdiReload } from "@mdi/js";
import type Server from "@/lib/components/server";
import type { PauseOnIdleType } from "#shared/components/server";
import { ServerStatus } from "#shared/components/server";
import ServerStatusComponent from "@/components/ServerStatusComponent.vue";
import ConsoleComponent from "@/components/ConsoleComponent.vue";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import VersionDialogComponent from "@/components/VersionDialogComponent.vue";
import WorldDeleteDialogComponent from "@/components/WorldDeleteDialogComponent.vue";
import JavaRuntime, {
  getDefaultRuntime,
} from "#shared/components/java_runtime";
import FlagDialogComponent from "@/components/FlagDialogComponent.vue";
import Player from "#shared/components/player";
import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";
import ToggleButtonComponent from "@/components/buttons/ToggleButtonComponent.vue";
import RestartButtonComponent from "@/components/buttons/RestartButtonComponent.vue";
import PauseButtonComponent from "@/components/buttons/PauseButtonComponent.vue";

/**
 * The representation of a {@link Server} in Vue.
 */
const props = defineProps<{
  /**
   * The linked {@link Server}.
   */
  server: Server;

  /**
   * Whether the {@link Server} is viewed in detailed mode or not.
   */
  detailed?: boolean;
}>();

const server = props.server;
const { t } = useI18n();
const route = useRoute();
const socket = useSocket();

const detailed = props.detailed === true;

// Detailed data is only needed (and only available for the right server) on the client in detailed mode.
const detailedOptions = { immediate: detailed, server: false } as const;

/**
 * The list of available {@link JavaRuntime}s.
 */
const {
  data: javaRuntimeData,
  status: javaRuntimesStatus,
  error: javaRuntimesError,
} = useAsyncData(
  "java-runtimes",
  () => $fetch<Record<string, unknown>[]>("/api/java-runtimes"),
  detailedOptions,
);
const javaRuntimesLoading = computed(
  () => javaRuntimesStatus.value === "pending",
);
const javaRuntimes = computed<JavaRuntime[]>(() =>
  (javaRuntimeData.value ?? []).map((elem) =>
    Object.assign(new JavaRuntime(), elem),
  ),
);

const hasJavaRuntime = computed(
  () =>
    server.javaPath !== null &&
    javaRuntimes.value.some((runtime) => runtime.path === server.javaPath),
);

/**
 * The current server snapshot from the REST API.
 */
const {
  data: serverInfo,
  status: infoStatus,
  error: infoError,
  refresh: refreshInfo,
} = useAsyncData(
  () => "server-info-" + encodeURIComponent(getName()),
  () =>
    $fetch<Record<string, unknown>>(
      `/api/servers/${encodeURIComponent(getName())}`,
    ),
  detailedOptions,
);
const infoLoading = computed(() => infoStatus.value === "pending");

watch(serverInfo, (data) => {
  if (!data) return;
  Object.assign(server, data);
  server.players.sample = server.players.sample.map((player) =>
    Object.assign(new Player(), player),
  );
});

/**
 * The available jar updates, or `null` if unknown or not applicable.
 */
type JarUpdates = {
  build: { version: string; build: number } | null;
  patch: { version: string; build: number } | null;
};
const { data: updatesData, refresh: refreshUpdates } = useAsyncData(
  () => "server-updates-" + encodeURIComponent(getName()),
  () =>
    $fetch<JarUpdates | null>(
      `/api/servers/${encodeURIComponent(getName())}/updates`,
    ),
  detailedOptions,
);
const updates = computed(() => updatesData.value ?? null);

const eulaDialog = ref(false);

const eulaAccepted = ref(false);

const eulaLoading = ref(false);

const eulaError = ref("");

/**
 * Listens to a channel named according to the {@link Server}'s name for updated information.
 */
onMounted(() => {
  socket.on(
    "server_" + encodeURIComponent(getName()),
    async (data: Record<string, unknown>) => {
      if (Object.prototype.hasOwnProperty.call(data, "serverInfo"))
        Object.assign(server, data["serverInfo"]);
      server.players.sample = server.players.sample.map((player) => {
        return Object.assign(new Player(), player);
      });
    },
  );
});

async function onVersionInstalled(): Promise<void> {
  await Promise.all([refreshInfo(), refreshUpdates()]);
}

/**
 * Unsubscribes the channels subscribed to in {@link onMounted}.
 */
onBeforeUnmount(() => {
  socket.off("server_" + encodeURIComponent(getName()));
});

function saveConfig(config: Record<string, unknown>, rollback: () => void) {
  void server.updateConfig(config).catch((error: unknown) => {
    rollback();
    console.error("Could not update server configuration:", error);
  });
}

function handleAction(action: string): void {
  void server
    .sendAction(action)
    .catch((error: unknown) =>
      console.error(`Could not ${action} server:`, error),
    );
}

function showEulaDialog(): void {
  eulaDialog.value = true;
}

function cancelEula(): void {
  eulaDialog.value = false;
  eulaAccepted.value = false;
  eulaError.value = "";
}

async function acceptEula(): Promise<void> {
  eulaLoading.value = true;
  eulaError.value = "";
  try {
    await server.acceptEula();
    eulaDialog.value = false;
    eulaAccepted.value = false;
  } catch (error) {
    eulaError.value = error instanceof Error ? error.message : String(error);
    console.error("Could not accept the Minecraft EULA:", error);
  } finally {
    eulaLoading.value = false;
  }
}

/**
 * Returns the name of the {@link Server}. If no server is loaded yet the server name is taken from the route params.
 * @return the name of the {@link Server}.
 */
function getName(): string {
  return server.name !== "" ? server.name : (route.params["server"] as string);
}

/**
 * The autostart option of the server. Setting it sends the new value to the server.
 */
const autostart = computed<boolean>({
  get: () => server.autostart,
  set: (value) => {
    const previousValue = server.autostart;
    server.autostart = value;
    saveConfig({ autostart: value }, () => {
      server.autostart = previousValue;
    });
  },
});

/**
 * The `pauseOnIdle` option of the server. Setting it sends the new value to the server.
 */
const pauseOnIdle = computed<PauseOnIdleType>({
  get: () => server.pauseOnIdle,
  set: (value) => {
    const previousValue = { ...server.pauseOnIdle };
    server.pauseOnIdle = value;
    saveConfig({ pauseOnIdle: value }, () => {
      server.pauseOnIdle = previousValue;
    });
  },
});

/**
 * Sets the `enabled` property of the `pauseOnIdle` option of the server.
 * @param value the `enabled` property of the `pauseOnIdle` option to be sent to the server.
 */
function setPauseEnabled(value: boolean | null) {
  const newPauseOnIdle = { ...pauseOnIdle.value };
  newPauseOnIdle.enable = value === true;
  pauseOnIdle.value = newPauseOnIdle;
}

/**
 * Sets the `timeout` property of the `pauseOnIdle` option of the server.
 * @param value the `timeout` property of the `pauseOnIdle` option to be sent to the server.
 */
function setPauseTimeout(value: string | number) {
  const timeout = parseInt(String(value));
  if (!Number.isFinite(timeout)) return;
  const newPauseOnIdle = { ...pauseOnIdle.value };
  newPauseOnIdle.timeout = timeout;
  pauseOnIdle.value = newPauseOnIdle;
}

/**
 * The path of the selected {@link JavaRuntime} for the server. Setting it sends the new value to the server.
 */
const javaRuntime = computed<string | null>({
  get: () => {
    for (const runtime of javaRuntimes.value) {
      if (runtime.path === server.javaPath) return runtime.path;
    }
    return null;
  },
  set: (value) => {
    const runtime =
      javaRuntimes.value.find((elem) => elem.path === value) ??
      getDefaultRuntime(javaRuntimes.value);

    const previousValue = server.javaPath;
    server.javaPath = runtime.path;
    saveConfig({ javaPath: runtime.path }, () => {
      server.javaPath = previousValue;
    });
  },
});
</script>

<style scoped></style>
