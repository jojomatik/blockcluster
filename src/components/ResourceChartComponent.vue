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
  <VueApexChart
    height="200px"
    :options="{
      chart: {
        id: 'resource-usage',
        foreColor: this.$vuetify.theme.currentTheme.text,
        toolbar: {
          show: false,
        },
        background: this.$vuetify.theme.dark
          ? this.$vuetify.theme.currentTheme.primary
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
        this.$vuetify.theme.currentTheme.accent,
        this.$vuetify.theme.currentTheme.secondary,
      ],
      theme: {
        mode: this.$vuetify.theme.dark ? 'dark' : 'light',
      },
    }"
    :series="[
      {
        name: 'cpu',
        data: resourceUsage.map((usage) => {
          return usage.cpu / 100;
        }),
      },
      {
        name: 'memory',
        data: resourceUsage.map((usage) => {
          return usage.memory / 1024 / 1024;
        }),
      },
    ]"
  >
  </VueApexChart>
</template>

<script lang="ts">
import { Component, Prop, Vue } from "vue-property-decorator";

import VueApexChart from "vue-apexcharts";
import ResourceUsage from "../../common/components/resource_usage";

/**
 * The representation of a {@link Server} in Vue.
 */
@Component({
  components: {
    VueApexChart,
  },
})
export default class ResourceChartComponent extends Vue {
  /**
   * The resource usage.
   * @private
   */
  @Prop() private resourceUsage!: ResourceUsage[];
}
</script>

<style scoped></style>
