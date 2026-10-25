<template>
  <v-app :theme="themeName">
    <v-main>
      <slot v-if="localeReady" name="story"></slot>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { VApp, VMain } from "vuetify/components";
import { useI18n } from "vue-i18n";
import { ref, watch } from "vue";

const i18n = useI18n();
type AppLocale = typeof i18n.locale.value;

const props = defineProps<{ themeName: string; locale: AppLocale }>();

const localeReady = ref(false);

watch(
  () => props.locale,
  async (newLocale) => {
    if (newLocale !== i18n.locale.value) {
      await i18n.setLocale(newLocale);
    }
    localeReady.value = true;
  },
  { immediate: true },
);
</script>

<style>
.docs-story {
  .v-application__wrap {
    min-height: fit-content;
  }
}
</style>
