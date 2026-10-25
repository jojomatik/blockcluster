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
  <ClientOnly>
    <VueApexChart height="200px" :options="chartOptions" :series="series" />
  </ClientOnly>
</template>

<script setup lang="ts">
import type { ApexOptions } from "apexcharts";
import VueApexChart from "vue3-apexcharts";
import type ResourceUsage from "#shared/components/resource_usage";

/**
 * The representation of a {@link Server}'s resource usage as a chart.
 */
const props = defineProps<{
  /**
   * The resource usage.
   */
  resourceUsage: ResourceUsage[];
}>();

const { t } = useI18n();
const theme = useTheme();

const chartOptions = computed<ApexOptions>(() => ({
  chart: {
    id: "resource-usage",
    foreColor: theme.current.value.colors["on-background"],
    toolbar: { show: false },
    background: theme.current.value.dark
      ? theme.current.value.colors.primary
      : "#FFFFFF",
  },
  xaxis: {
    categories: props.resourceUsage.map((usage) => usage.time),
    type: "datetime",
  },
  yaxis: [
    {
      labels: {
        formatter: (value: number) => `${Math.round(value * 100)}%`,
      },
      max: (max: number) => Math.max(max, 1),
      tickAmount: 4,
      forceNiceScale: true,
    },
    {
      opposite: true,
      labels: {
        formatter: (value: number) => `${Math.round(value)}MB`,
      },
      max: (max: number) => Math.max(max, 1600),
      tickAmount: 4,
      forceNiceScale: true,
    },
  ],
  tooltip: { x: { format: "HH:mm:ss" } },
  stroke: { curve: "smooth" },
  colors: [
    theme.current.value.colors.accent ?? "#ff9800",
    theme.current.value.colors.secondary ?? "#2196f3",
  ],
  theme: { mode: theme.current.value.dark ? "dark" : "light" },
}));

const series = computed(() => [
  {
    name: t("gui.views.server.resource_usage.cpu"),
    data: props.resourceUsage.map((usage) => usage.cpu / 100),
  },
  {
    name: t("gui.views.server.resource_usage.memory"),
    data: props.resourceUsage.map((usage) => usage.memory / 1024 / 1024),
  },
]);
</script>

<style scoped></style>
