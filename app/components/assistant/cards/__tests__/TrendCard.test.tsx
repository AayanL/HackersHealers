import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TrendCardData } from "@/lib/assistant";
import TrendCard from "@/app/components/assistant/cards/TrendCard";

const data: TrendCardData = {
  kind: "trend",
  label: "Potassium (K⁺)",
  unit: "mmol/L",
  query: "Observation?code=2823-3&date=ge2025-06",
  referenceRange: { low: 3.5, high: 5.1 },
  points: [
    { date: "2025-09-12", value: 4.4, ref: "Observation/k1" },
    { date: "2026-06-10", value: 5.3, ref: "Observation/k", flagged: true },
  ],
};

describe("TrendCard", () => {
  it("renders the measure label and result count", () => {
    render(<TrendCard data={data} />);
    expect(screen.getByText("Potassium (K⁺)")).toBeInTheDocument();
    expect(screen.getByText("2 results")).toBeInTheDocument();
  });

  it("draws a sparkline with one node per point", () => {
    const { container } = render(<TrendCard data={data} />);
    expect(screen.getByTestId("trend-sparkline")).toBeInTheDocument();
    expect(container.querySelectorAll("circle")).toHaveLength(2);
    expect(container.querySelector("polyline")).not.toBeNull();
  });

  it("lists each value and flags the out-of-range one", () => {
    render(<TrendCard data={data} />);
    expect(screen.getAllByTestId("trend-point")).toHaveLength(2);
    expect(screen.getByText(/5.3 mmol\/L ▲/)).toBeInTheDocument();
  });

  it("shows the literal FHIR query as provenance", () => {
    render(<TrendCard data={data} />);
    expect(
      screen.getByText("Observation?code=2823-3&date=ge2025-06"),
    ).toBeInTheDocument();
  });
});
