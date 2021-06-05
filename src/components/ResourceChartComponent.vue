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
