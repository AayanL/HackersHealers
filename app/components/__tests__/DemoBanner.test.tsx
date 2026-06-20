import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import DemoBanner from "@/app/components/DemoBanner";

describe("DemoBanner", () => {
  it("shows the synthetic-data / no-PHI notice", () => {
    render(<DemoBanner />);
    expect(
      screen.getByText("DEMO · SYNTHETIC DATA · NO PHI"),
    ).toBeInTheDocument();
  });

  it("reflects the data mode", () => {
    render(<DemoBanner dataMode="synthetic" />);
    expect(screen.getByText("DataMode=synthetic")).toBeInTheDocument();
  });

  it("does NOT claim NO PHI on a live SMART session", () => {
    render(<DemoBanner dataMode="live" />);
    expect(
      screen.queryByText("DEMO · SYNTHETIC DATA · NO PHI"),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/LIVE SMART SESSION/)).toBeInTheDocument();
  });
});
