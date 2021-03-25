<template>
  <v-app>
    <v-app-bar app color="primary" dark>
      <div class="d-flex align-center">
        <v-img
          alt="Vuetify Logo"
          class="shrink mr-2"
          contain
          src="https://cdn.vuetifyjs.com/images/logos/vuetify-logo-dark.png"
          transition="scale-transition"
          width="40"
        />
        <h2 style="letter-spacing: 2px">blockcluster</h2>
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
    titleTemplate: "%s - Minecraft Server Manager",
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
