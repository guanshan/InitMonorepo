import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ThemeToggle } from "./ThemeToggle";

describe("ThemeToggle", () => {
  it("cycles through the available theme preferences", async () => {
    const user = userEvent.setup();

    render(<ThemeToggle />);

    const button = screen.getByRole("button", {
      name: "Theme: system",
    });

    await user.click(button);
    expect(button).toHaveTextContent("Theme: light");

    await user.click(button);
    expect(button).toHaveTextContent("Theme: dark");
  });
});
