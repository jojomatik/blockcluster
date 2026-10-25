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
        <v-btn color="secondary" @click="updateServers">
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

useHead({ title: "Home" });

// noinspection JSMismatchedCollectionQueryUpdate
const servers = ref<Server[]>([]);

/**
 * The {@link ResourceUsage} of the blockcluster backend.
 */
const systemUsage = ref<ResourceUsage[]>([]);

/**
 * Cached version of the total resource usage.
 *
 * Used if not all servers are updated yet.
 */
let totalUsage: ResourceUsage[] = [];

onMounted(async () => {
  socket.on("SYSTEM_USAGE", (data: Record<string, unknown>[]) => {
    systemUsage.value = [];
    data.forEach((elem: Record<string, unknown>) => {
      systemUsage.value.push(Object.assign(new ResourceUsage(), elem));
    });
  });
  void updateServers();
  const response = await fetch("/api/system-usage");
  const data: Record<string, unknown>[] = await response.json();
  systemUsage.value = data.map((elem) =>
    Object.assign(new ResourceUsage(), elem),
  );
});

/**
 * Unsubscribes the channel subscribed to in {@link onMounted}.
 */
onUnmounted(() => {
  socket.off("SYSTEM_USAGE");
});

async function updateServers(): Promise<void> {
  const response = await fetch("/api/servers");
  const data: Record<string, unknown>[] = await response.json();
  servers.value = data.map((elem) => {
    const server = new Server(elem);
    server.players.sample = server.players.sample.map((player) =>
      Object.assign(new Player(), player),
    );
    return server;
  });
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
  if (len == 0) return totalUsage;

  // Return system usage, if no servers are available.
  if (servers.value.length == 0) return systemUsage.value;
  const time = systemUsage.value[0].time;
  for (let i = 0; i < servers.value.length; i++) {
    if (
      servers.value[i].resourceUsage.length != len ||
      servers.value[i].resourceUsage[0].time != time
    )
      return totalUsage;
  }

  const usages: ResourceUsage[] = [];
  for (let i = 0; i < len; i++) {
    let cpu = systemUsage.value[i].cpu;
    let memory = systemUsage.value[i].memory;
    servers.value.forEach((server) => {
      cpu += server.resourceUsage[i].cpu;
      memory += server.resourceUsage[i].memory;
    });
    usages.push(
      new ResourceUsage(servers.value[0].resourceUsage[i].time, cpu, memory),
    );
  }
  return (totalUsage = usages);
}
</script>
