import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AssistantDock from "@/app/components/assistant/AssistantDock";
import { SEED_GLANCE } from "@/lib/assistant";

const baseProps = {
  patientLabel: "Jane Doe",
  glance: SEED_GLANCE,
  alerts: [],
  messages: [],
};

describe("AssistantDock", () => {
  it("collapses the whole chatbox to a thin rail and back", () => {
    render(<AssistantDock {...baseProps} />);

    // Expanded: composer and the at-a-glance panel are present.
    expect(screen.getByLabelText("Ask the assistant")).toBeInTheDocument();
    expect(screen.getByText(/68F with hypertension/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Collapse assistant" }));

    // Collapsed: the chatbox internals are gone, only the re-open control stays.
    expect(screen.queryByLabelText("Ask the assistant")).not.toBeInTheDocument();
    expect(screen.queryByText(/68F with hypertension/i)).not.toBeInTheDocument();
    const reopen = screen.getByRole("button", { name: "Expand assistant" });
    expect(reopen).toBeInTheDocument();

    fireEvent.click(reopen);
    expect(screen.getByLabelText("Ask the assistant")).toBeInTheDocument();
  });

  it("keeps the Assistant landmark name in both states", () => {
    render(<AssistantDock {...baseProps} />);
    expect(
      screen.getByRole("complementary", { name: "Assistant" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Collapse assistant" }));
    expect(
      screen.getByRole("complementary", { name: "Assistant" }),
    ).toBeInTheDocument();
  });
});
