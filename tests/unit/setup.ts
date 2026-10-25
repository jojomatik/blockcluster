import { config } from "@vue/test-utils";
import { createI18n } from "vue-i18n";
import { createVuetify } from "vuetify";
import type { App } from "vue";
import { beforeEach } from "vitest";
import { nuxtMocks } from "./components/nuxt-mock-state";

const VBtnStub = {
  name: "VBtn",
  props: ["color", "disabled", "outlined", "block", "variant", "loading"],
  emits: ["click"],
  template: `<button :disabled="disabled" @click="$emit('click', $event)"><slot /></button>`,
};
const VIconStub = {
  name: "VIcon",
  props: ["icon"],
  template: "<i>{{ icon }}<slot /></i>",
};
const VTextFieldStub = {
  name: "VTextField",
  props: ["hint", "persistentHint", "modelValue"],
  emits: ["update:modelValue"],
  template: `<input :value="modelValue" @input="$emit('update:modelValue', $event.target.value)" />`,
};
const VSelectStub = {
  name: "VSelect",
  props: ["disabled", "modelValue", "items", "loading"],
  emits: ["update:modelValue"],
  template: `<select :value="modelValue" :disabled="disabled" @change="$emit('update:modelValue', $event.target.value)" />`,
};
const VDialogStub = {
  name: "VDialog",
  props: ["modelValue"],
  template: `<div><slot name="activator" :props="{}" /><slot /></div>`,
};

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
  createVuetify(),
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
config.global.stubs = {
  VBtn: VBtnStub,
  "v-btn": VBtnStub,
  VIcon: VIconStub,
  "v-icon": VIconStub,
  VTextField: VTextFieldStub,
  "v-text-field": VTextFieldStub,
  VSelect: VSelectStub,
  "v-select": VSelectStub,
  VDialog: VDialogStub,
  "v-dialog": VDialogStub,
  VCard: { name: "VCard", template: "<div><slot /></div>" },
  "v-card": { name: "VCard", template: "<div><slot /></div>" },
  VCardText: { name: "VCardText", template: "<div><slot /></div>" },
  "v-card-text": { name: "VCardText", template: "<div><slot /></div>" },
  VCardActions: { name: "VCardActions", template: "<div><slot /></div>" },
  "v-card-actions": { name: "VCardActions", template: "<div><slot /></div>" },
  VCardTitle: { name: "VCardTitle", template: "<div><slot /></div>" },
  "v-card-title": { name: "VCardTitle", template: "<div><slot /></div>" },
  VContainer: { name: "VContainer", template: "<div><slot /></div>" },
  "v-container": { name: "VContainer", template: "<div><slot /></div>" },
  VTable: { name: "VTable", template: "<table><slot /></table>" },
  "v-table": { name: "VTable", template: "<table><slot /></table>" },
  ClientOnly: { name: "ClientOnly", template: "<div><slot /></div>" },
  VRow: { name: "VRow", template: "<div><slot /></div>" },
  "v-row": { name: "VRow", template: "<div><slot /></div>" },
  VCol: { name: "VCol", template: "<div><slot /></div>" },
  "v-col": { name: "VCol", template: "<div><slot /></div>" },
  VAlert: { name: "VAlert", template: "<div><slot /></div>" },
  "v-alert": { name: "VAlert", template: "<div><slot /></div>" },
  VChip: { name: "VChip", props: ["color"], template: "<span><slot /></span>" },
  "v-chip": {
    name: "VChip",
    props: ["color"],
    template: "<span><slot /></span>",
  },
  VExpansionPanels: {
    name: "VExpansionPanels",
    template: "<div><slot /></div>",
  },
  "v-expansion-panels": {
    name: "VExpansionPanels",
    template: "<div><slot /></div>",
  },
  VExpansionPanel: { name: "VExpansionPanel", template: "<div><slot /></div>" },
  "v-expansion-panel": {
    name: "VExpansionPanel",
    template: "<div><slot /></div>",
  },
  VExpansionPanelTitle: {
    name: "VExpansionPanelTitle",
    template: "<div><slot /></div>",
  },
  "v-expansion-panel-title": {
    name: "VExpansionPanelTitle",
    template: "<div><slot /></div>",
  },
  VExpansionPanelText: {
    name: "VExpansionPanelText",
    template: "<div><slot /></div>",
  },
  "v-expansion-panel-text": {
    name: "VExpansionPanelText",
    template: "<div><slot /></div>",
  },
  VCardSubtitle: { name: "VCardSubtitle", template: "<div><slot /></div>" },
  "v-card-subtitle": { name: "VCardSubtitle", template: "<div><slot /></div>" },
  VSwitch: {
    name: "VSwitch",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: `<input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />`,
  },
  "v-switch": {
    name: "VSwitch",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: `<input type="checkbox" :checked="modelValue" @change="$emit('update:modelValue', $event.target.checked)" />`,
  },
  VTooltip: {
    name: "VTooltip",
    template: `<div><slot name="activator" :props="{}" /><slot /></div>`,
  },
  "v-tooltip": {
    name: "VTooltip",
    template: `<div><slot name="activator" :props="{}" /><slot /></div>`,
  },
  VImg: {
    name: "VImg",
    props: ["alt", "src"],
    template: `<img :alt="alt" :src="src" />`,
  },
  "v-img": {
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
  "v-form": {
    name: "VForm",
    props: ["modelValue"],
    emits: ["update:modelValue"],
    template: "<form><slot /></form>",
  },
};

beforeEach(() => {
  nuxtMocks.route.params = {};
  nuxtMocks.runtimeConfig.public.gitSha = "abcdef012345";
  nuxtMocks.socket.on.mockReset();
  nuxtMocks.socket.off.mockReset();
});
