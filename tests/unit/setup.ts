import { config } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import type { App } from "vue";
import { beforeEach } from "vitest";
import { nuxtMocks } from "./components/nuxt-mock-state";

const vuetifyStubs: Record<string, unknown> = Object.fromEntries(
  Object.keys(components).flatMap((name) => {
    const kebabName = name
      .replace(/^V/, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
    return [
      [name, true],
      [`v-${kebabName}`, true],
    ];
  }),
);
const vuetifyBehaviorStubs = {
  VBtn: {
    name: "VBtn",
    props: ["color", "disabled", "outlined", "block", "variant", "loading"],
    emits: ["click"],
    template: `<button :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
  },
  VIcon: {
    name: "VIcon",
    props: ["icon"],
    template: "<i>{{ icon }}<slot /></i>",
  },
  VTextField: {
    name: "VTextField",
    props: ["hint", "persistentHint", "modelValue"],
    emits: ["update:modelValue"],
    template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
  },
  VSelect: {
    name: "VSelect",
    props: ["disabled", "modelValue", "items", "loading"],
    emits: ["update:modelValue"],
    template: `<select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)" />`,
  },
  VDialog: {
    name: "VDialog",
    props: ["modelValue"],
    template: `<div><slot name="activator" :props="{}" /><slot /></div>`,
  },
  VSwitch: {
    name: "VSwitch",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: `<input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />`,
  },
  VTooltip: {
    name: "VTooltip",
    template: `<div><slot name="activator" :props="{}" /><slot /></div>`,
  },
  VImg: {
    name: "VImg",
    props: ["alt", "src"],
    template: `<img :alt="alt" :src="src" />`,
  },
  VForm: {
    name: "VForm",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<form><slot /></form>",
  },
};
for (const [name, stub] of Object.entries(vuetifyBehaviorStubs)) {
  const kebabName = name
    .replace(/^V/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .toLowerCase();
  vuetifyStubs[name] = stub;
  vuetifyStubs[`v-${kebabName}`] = stub;
}

config.global.plugins = [
  createI18n({
    legacy: false,
    locale: "en",
    messages: {
      de: {},
      fr: {},
      en: {
        gui: {
          views: {
            server: { players: { heads: { alt: "Player head for {name}" } } },
          },
        },
      },
    },
    missing: (_locale, key) => key,
    missingWarn: false,
    fallbackWarn: false,
  }),
  createVuetify({ components }),
  {
    install(app: App) {
      const nuxtApp = (
        app as App & {
          $nuxt?: {
            $socket: unknown;
            $config: { public: Record<string, unknown> };
          };
        }
      ).$nuxt;
      if (!nuxtApp) return;
      nuxtApp.$socket = nuxtMocks.socket as never;
      Object.assign(nuxtApp.$config.public, nuxtMocks.runtimeConfig.public);
    },
  },
];
config.global.mocks = { $t: (key: string) => key };
config.global.renderStubDefaultSlot = true;
config.global.stubs = {
  ...vuetifyStubs,
  ClientOnly: { name: "ClientOnly", template: "<div><slot /></div>" },
};

beforeEach(() => {
  nuxtMocks.route.params = {};
  nuxtMocks.runtimeConfig.public.gitSha = "abcdef012345";
  nuxtMocks.socket.on.mockReset();
  nuxtMocks.socket.off.mockReset();
});
