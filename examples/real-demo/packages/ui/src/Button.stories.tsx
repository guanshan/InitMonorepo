import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./index";

const meta = {
  args: {
    children: "Create user",
    variant: "primary",
  },
  component: Button,
  title: "Primitives/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: {
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    variant: "ghost",
  },
};
