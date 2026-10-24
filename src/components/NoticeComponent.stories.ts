import { expect } from "@storybook/jest";
import { userEvent, within } from "@storybook/testing-library";
import NoticeComponent from "@/components/NoticeComponent.vue";

const license = `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction.`;

export default {
  title: "Components/NoticeComponent",
  component: NoticeComponent,
};

export const SingleLine = {
  args: {
    notice: {
      name: "left-pad",
      version: "1.3.0",
      author: "Jane Doe",
      repositoryLink: "https://github.com/example/left-pad",
      notice: "MIT",
    },
  },
};

export const MultiLineExpandable = {
  args: {
    notice: {
      name: "vue",
      version: "2.7.16",
      author: "Evan You",
      repositoryLink: "https://github.com/vuejs/vue",
      notice: license,
    },
  },
  play: async ({ canvasElement }: { canvasElement: HTMLElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByText("License"));
    await expect(await canvas.findByText(/Permission is hereby/)).toBeVisible();
  },
};

export const NoAuthorNoLink = {
  args: {
    notice: {
      name: "mystery-lib",
      version: "0.0.1",
      author: "",
      notice: "Unknown license",
    },
  },
};
