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
      {{ loadError }}
    </v-alert>
    <v-row>
      <v-col cols="12">
        <v-card>
          <v-card-title>
            {{ t("gui.views.home.resource_usage.total") }}
          </v-card-title>
          <v-card-text>
            <ResourceChartComponent :resource-usage="getTotalUsage()">
            </ResourceChartComponent>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row v-for="server in servers" :key="server.name" dense>
      <v-col cols="12">
        <ServerComponent :detailed="false" :server="server"></ServerComponent>
      </v-col>
    </v-row>
    <v-row>
      <v-col cols="12">
        <CreateServerDialogComponent @created="updateServers" />
        <v-btn variant="elevated" color="secondary" @click="updateServers">
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

const { data: initialData, error: initialLoadError } = await useAsyncData(
  "home-dashboard",
  async () => {
    const [serverData, systemUsageData] = await Promise.all([
      requestFetch<ServerData[]>("/api/servers"),
      requestFetch<ResourceUsageData[]>("/api/system-usage"),
    ]);
    return { serverData, systemUsageData };
  },
);

// noinspection JSMismatchedCollectionQueryUpdate
const servers = shallowRef<Server[]>(
  (initialData.value?.serverData ?? []).map(createServer),
);

/**
 * The {@link ResourceUsage} of the blockcluster backend.
 */
const systemUsage = ref(
  (initialData.value?.systemUsageData ?? []).map(createResourceUsage),
);
const refreshError = ref<string | null>(null);
const loadError = computed(
  () => initialLoadError.value?.message ?? refreshError.value,
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

async function updateServers(): Promise<void> {
  try {
    const data = await requestFetch<ServerData[]>("/api/servers");
    servers.value = data.map(createServer);
    refreshError.value = null;
  } catch (error) {
    refreshError.value =
      error instanceof Error ? error.message : "Failed to refresh servers.";
  }
}

function createServer(data: ServerData): Server {
  const server = new Server(data);
  server.players.sample = server.players.sample.map((player) =>
    Object.assign(new Player(), player),
  );
  return server;
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
