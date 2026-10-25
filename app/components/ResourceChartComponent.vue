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
    <VueApexChart
      height="200px"
      :options="{
        chart: {
          id: 'resource-usage',
          foreColor: theme.current.value.colors['on-background'],
          toolbar: {
            show: false,
          },
          background: theme.current.value.dark
            ? theme.current.value.colors.primary
            : '#FFFFFF',
        },
        xaxis: {
          categories: resourceUsage.map((usage) => {
            return usage.time;
          }),
          type: 'datetime',
        },
        yaxis: [
          {
            labels: {
              formatter: function (value) {
                return Math.round(value * 100) + '%';
              },
            },
            max: (max) => {
              return Math.max(max, 1);
            },
            tickAmount: 4,
            forceNiceScale: true,
          },
          {
            opposite: true,
            labels: {
              formatter: function (value) {
                return Math.round(value) + 'MB';
              },
            },
            max: (max) => {
              return Math.max(max, 1600);
            },
            tickAmount: 4,
            forceNiceScale: true,
          },
        ],
        tooltip: {
          x: {
            format: 'HH:mm:ss',
          },
        },
        stroke: {
          curve: 'smooth',
        },
        colors: [
          theme.current.value.colors.accent,
          theme.current.value.colors.secondary,
        ],
        theme: {
          mode: theme.current.value.dark ? 'dark' : 'light',
        },
      }"
      :series="[
        {
          name: t('gui.views.server.resource_usage.cpu'),
          data: resourceUsage.map((usage) => {
            return usage.cpu / 100;
          }),
        },
        {
          name: t('gui.views.server.resource_usage.memory'),
          data: resourceUsage.map((usage) => {
            return usage.memory / 1024 / 1024;
          }),
        },
      ]"
    >
    </VueApexChart>
  </ClientOnly>
</template>

<script setup lang="ts">
import VueApexChart from "vue3-apexcharts";
import type ResourceUsage from "#shared/components/resource_usage";

/**
 * The representation of a {@link Server}'s resource usage as a chart.
 */
defineProps<{
  /**
   * The resource usage.
   */
  resourceUsage: ResourceUsage[];
}>();

const { t } = useI18n();
const theme = useTheme();
</script>

<style scoped></style>
