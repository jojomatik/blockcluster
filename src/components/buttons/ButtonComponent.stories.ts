import type { Meta } from "@storybook/vue";
import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

export default {
  title: "Atoms/ButtonComponent",
  component: ButtonComponent,
  render: (args, { argTypes }) => ({
    props: Object.keys(argTypes),
    components: { ButtonComponent },
    template:
      '<ButtonComponent v-bind="$props" @click="click">{{ $props.default }}</ButtonComponent>',
  }),
  argTypes: {
    default: { control: { type: "text" } },
    click: { action: "clicked" },
  },
} satisfies Meta;

export const Default = {
  args: {
    color: "red",
    icon: "mdi-cog",
    disabled: false,
    default: "Click me",
  },
};

export const Disabled = {
  args: {
    color: "red",
    icon: "mdi-cog",
    disabled: true,
    default: "Click me",
  },
};
