import ButtonComponent from "@/components/buttons/ButtonComponent.vue";

export default {
  component: ButtonComponent,
  argTypes: {
    default: { control: { type: "text" } },
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
