<template>
  <v-app>
    <v-app-bar app color="primary" class="secondary--text">
      <div class="d-flex align-center">
        <v-img
          alt="blockcluster Icon"
          class="shrink mr-2"
          contain
          src="/icon.svg"
          transition="scale-transition"
          width="40"
        />
        <h2 style="letter-spacing: 1px">blockcluster</h2>
      </div>

      <router-link to="/">Home</router-link> |
      <router-link to="/about">About</router-link>

      <v-spacer></v-spacer>
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
