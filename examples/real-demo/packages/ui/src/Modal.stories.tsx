import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button, Input, Modal } from "./index";

const meta = {
  title: "Primitives/Modal",
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <Modal
        closeLabel="Dismiss dialog"
        description="Radix handles focus trapping while package styles keep the look aligned with the demo."
        onOpenChange={setOpen}
        open={open}
        title="Invite a teammate"
        trigger={<Button>Open modal</Button>}
      >
        <div style={{ display: "grid", gap: "var(--space-4)", marginTop: "var(--space-5)" }}>
          <label style={{ display: "grid", gap: "var(--space-2)" }}>
            <span>Email</span>
            <Input placeholder="ada@example.com" />
          </label>
          <Button onClick={() => setOpen(false)}>Send invite</Button>
        </div>
      </Modal>
    );
  },
};
