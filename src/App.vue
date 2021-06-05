<template>
  <v-app>
    <v-app-bar app color="primary" class="secondary--text">
      <div class="d-flex align-center">
        <v-chip
          light
          style="height: 40px; padding: 0"
          class="mr-2 rounded-pill"
        >
          <v-img
            alt="blockcluster Icon"
            class="shrink"
            contain
            src="/icon.svg"
            transition="scale-transition"
            width="40"
          />
        </v-chip>
        <h2 style="letter-spacing: 1px">blockcluster</h2>
      </div>

      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>

      <v-spacer></v-spacer>
      <v-switch v-model="$vuetify.theme.dark" hide-details color="secondary">
        <template v-slot:label>
          <span class="secondary--text">Dark mode</span>
        </template>
      </v-switch>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>

<script lang="ts">
import { Component, Vue } from "vue-property-decorator";

/**
 * The main {@link Vue}-View that contains the App.
 */
@Component({
  metaInfo: {
    titleTemplate: "%s - blockcluster",
  },
})
export default class App extends Vue {}
</script>

<style lang="scss" scoped>
.v-application a {
  margin: 10px;
  color: var(--v-accent);
  &.router-link-exact-active {
    text-decoration: none;
  }
}
</style>
