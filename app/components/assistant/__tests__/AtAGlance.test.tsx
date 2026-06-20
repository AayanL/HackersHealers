import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AtAGlance from "@/app/components/assistant/AtAGlance";
import { SEED_GLANCE } from "@/lib/assistant";

describe("AtAGlance", () => {
  it("renders the synthesized summary and grounding footer", () => {
    render(<AtAGlance glance={SEED_GLANCE} />);
    expect(screen.getByText(/68F with hypertension/i)).toBeInTheDocument();
    expect(screen.getByText("grounded · 6 resources")).toBeInTheDocument();
  });

  it("toggles the full summary open and closed", () => {
    render(<AtAGlance glance={SEED_GLANCE} />);
    const toggle = screen.getByRole("button", { name: /Full summary/i });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(
      screen.getByRole("button", { name: /Hide summary/i }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  it("collapses the whole panel to reclaim space", () => {
    render(<AtAGlance glance={SEED_GLANCE} />);
    const header = screen.getByRole("button", { name: /Collapse at a glance/i });
    expect(header).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("grounded · 6 resources")).toBeInTheDocument();

    fireEvent.click(header);
    expect(
      screen.getByRole("button", { name: /Expand at a glance/i }),
    ).toHaveAttribute("aria-expanded", "false");
    // Body (summary + grounding footer) is gone while collapsed.
    expect(screen.queryByText("grounded · 6 resources")).not.toBeInTheDocument();
    expect(screen.queryByText(/68F with hypertension/i)).not.toBeInTheDocument();
  });
});
