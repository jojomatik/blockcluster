import PlayerStatsComponent from "@/components/PlayerStatsComponent.vue";

// 1x1 green PNG
const head =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==";

export default {
  title: "Components/PlayerStatsComponent",
  component: PlayerStatsComponent,
  argTypes: { width: { control: { type: "range", min: 16, max: 64 } } },
};

export const Default = {
  args: {
    playerStats: {
      online: 2,
      max: 20,
      sample: [
        { uuid: "1", name: "Steve", head },
        { uuid: "2", name: "Alex", head },
      ],
    },
  },
};

export const Empty = {
  args: { playerStats: { online: 0, max: 20, sample: [] } },
};

export const Small = {
  args: { ...Default.args, width: 24 },
};
