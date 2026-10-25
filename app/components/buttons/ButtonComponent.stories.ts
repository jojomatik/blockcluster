import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

export default {
  title: "Atoms/ButtonComponent",
  component: ButtonComponent,
  render: (_args: unknown, { argTypes }: { argTypes: object }) => ({
    props: Object.keys(argTypes),
    components: { ButtonComponent },
    template:
      '<ButtonComponent v-bind="$props" @click="click">{{ $props.default }}</ButtonComponent>',
  }),
  argTypes: {
    default: { control: { type: "text" } },
    click: { action: "clicked" },
  },
};

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
