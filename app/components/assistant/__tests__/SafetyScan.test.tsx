import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SafetyScan from "@/app/components/assistant/SafetyScan";
import { SEED_ALERTS } from "@/lib/assistant";

describe("SafetyScan", () => {
  it("renders nothing when there are no alerts", () => {
    const { container } = render(<SafetyScan alerts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each alert with a flag count", () => {
    render(<SafetyScan alerts={SEED_ALERTS} />);
    expect(
      screen.getByText(`${SEED_ALERTS.length} flags`),
    ).toBeInTheDocument();
    expect(
      screen.getByText("K⁺ 5.3 + active ACE inhibitor"),
    ).toBeInTheDocument();
  });

  it("collapses the whole section to reclaim space", () => {
    render(<SafetyScan alerts={SEED_ALERTS} />);
    const header = screen.getByRole("button", { name: /Collapse safety scan/i });
    expect(header).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(header);
    expect(
      screen.getByRole("button", { name: /Expand safety scan/i }),
    ).toHaveAttribute("aria-expanded", "false");
    // Alert cards are hidden while collapsed; the header chip stays.
    expect(
      screen.queryByText("K⁺ 5.3 + active ACE inhibitor"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(`${SEED_ALERTS.length} flags`),
    ).toBeInTheDocument();
  });
});
