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
    <v-alert v-if="serversError" class="mb-4" type="error">
      {{ t("gui.views.home.load_error.servers") }}
      {{ serversError.message }}
    </v-alert>
    <v-alert v-if="systemUsageError" class="mb-4" type="error">
      {{ t("gui.views.home.load_error.system_usage") }}
      {{ systemUsageError.message }}
    </v-alert>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            {{ t("gui.views.home.resource_usage.total") }}
          </v-card-title>
          <v-card-text>
            <v-skeleton-loader
              v-if="systemUsageLoading && systemUsage.length === 0"
              type="image"
            />
            <ResourceChartComponent v-else :resource-usage="getTotalUsage()">
            </ResourceChartComponent>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-if="serversLoading && servers.length === 0" dense>
      <v-col cols="12">
        <v-skeleton-loader type="card" />
      </v-col>
    </v-row>
    <v-row v-for="server in servers" :key="server.name" dense>
      <v-col cols="12">
        <ServerComponent :detailed="false" :server="server"></ServerComponent>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <CreateServerDialogComponent @created="refreshServers()" />
        <v-btn
          variant="elevated"
          color="secondary"
          :loading="serversLoading"
          @click="refreshServers()"
        >
          <v-icon start :icon="mdiReload"></v-icon>
          {{ t("gui.views.home.update_status") }}
        </v-btn>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup lang="ts">
import { mdiReload } from "@mdi/js";
import ServerComponent from "@/components/ServerComponent.vue";
import CreateServerDialogComponent from "@/components/CreateServerDialogComponent.vue";
import Server from "@/lib/components/server";
import ResourceChartComponent from "@/components/ResourceChartComponent.vue";
import ResourceUsage from "#shared/components/resource_usage";
import Player from "#shared/components/player";

const { t } = useI18n();
const socket = useSocket();
const requestFetch = useRequestFetch();

useHead({ title: "Home" });

type ServerData = ConstructorParameters<typeof Server>[0];
type ResourceUsageData = Pick<ResourceUsage, "time" | "cpu" | "memory">;

const [
  {
    data: serverData,
    status: serversStatus,
    error: serversError,
    refresh: refreshServers,
  },
  { data: systemUsageData, status: systemUsageStatus, error: systemUsageError },
] = await Promise.all([
  useAsyncData("home-servers", () =>
    requestFetch<ServerData[]>("/api/servers"),
  ),
  useAsyncData("home-system-usage", () =>
    requestFetch<ResourceUsageData[]>("/api/system-usage"),
  ),
]);

const serversLoading = computed(() => serversStatus.value === "pending");
const systemUsageLoading = computed(
  () => systemUsageStatus.value === "pending",
);

// noinspection JSMismatchedCollectionQueryUpdate
const servers = shallowRef<Server[]>([]);

/**
 * The {@link ResourceUsage} of the blockcluster backend.
 */
const systemUsage = ref<ResourceUsage[]>([]);

/**
 * Keeps existing {@link Server} instances (and thereby their live socket state) when the list is refreshed.
 */
watch(
  serverData,
  (data) => {
    if (!data) return;
    const existingServers = new Map(
      servers.value.map((server) => [server.name, server]),
    );
    servers.value = data.map((entry) => {
      const existingServer = existingServers.get(entry._name);
      if (!existingServer) return createServer(entry);
      Object.assign(existingServer, createServer(entry));
      return existingServer;
    });
  },
  { immediate: true },
);

watch(
  systemUsageData,
  (data) => {
    if (data) systemUsage.value = data.map(createResourceUsage);
  },
  { immediate: true },
);

/**
 * Cached version of the total resource usage.
 *
 * Used if not all servers are updated yet.
 */
let totalUsage: ResourceUsage[] = [];

onMounted(() => {
  socket.on("SYSTEM_USAGE", (data: ResourceUsageData[]) => {
    systemUsage.value = data.map(createResourceUsage);
  });
});

/**
 * Unsubscribes the channel subscribed to in {@link onMounted}.
 */
onUnmounted(() => {
  socket.off("SYSTEM_USAGE");
});

function createServer(data: ServerData): Server {
  const server = new Server(data);
  server.players.sample = server.players.sample.map((player) =>
    Object.assign(new Player(), player),
  );
  return shallowReactive(server);
}

function createResourceUsage(data: ResourceUsageData): ResourceUsage {
  return Object.assign(new ResourceUsage(), data);
}

/**
 * Returns the total resource usage.
 *
 * If all servers have the same length of resource objects, the usage is computed from the sum of the servers' usages.
 *
 * Otherwise the cached version {@link totalUsage} is returned.
 */
function getTotalUsage(): ResourceUsage[] {
  // Return cached usage, if lengths don't equal or the first timestamp doesn't equal. This means that not all servers have been updated yet.
  const len = systemUsage.value.length;

  // Return empty cached usage if length is 0.
  if (len === 0) return totalUsage;

  // Return system usage, if no servers are available.
  if (servers.value.length === 0) return systemUsage.value;
  const firstSystemUsage = systemUsage.value[0];
  if (!firstSystemUsage) return totalUsage;
  const time = firstSystemUsage.time;
  for (const server of servers.value) {
    const firstServerUsage = server.resourceUsage[0];
    if (server.resourceUsage.length !== len || firstServerUsage?.time !== time)
      return totalUsage;
  }

  const usages: ResourceUsage[] = [];
  for (let i = 0; i < len; i++) {
    const systemSample = systemUsage.value[i];
    const serverSamples = servers.value.map(
      (server) => server.resourceUsage[i],
    );
    const firstServerSample = serverSamples[0];
    if (
      !systemSample ||
      !firstServerSample ||
      serverSamples.some((sample) => !sample)
    )
      return totalUsage;
    let cpu = systemSample.cpu;
    let memory = systemSample.memory;
    for (const sample of serverSamples) {
      if (!sample) return totalUsage;
      cpu += sample.cpu;
      memory += sample.memory;
    }
    usages.push(new ResourceUsage(firstServerSample.time, cpu, memory));
  }
  return (totalUsage = usages);
}
</script>
