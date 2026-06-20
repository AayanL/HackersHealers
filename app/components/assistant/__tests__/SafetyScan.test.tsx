import { render, screen } from "@testing-library/react";
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
});
