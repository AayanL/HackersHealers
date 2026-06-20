import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { SummaryCardData } from "@/lib/assistant";
import SummaryCard from "@/app/components/assistant/cards/SummaryCard";

const data: SummaryCardData = {
  kind: "summary",
  citations: ["Condition/I10"],
  sbar: {
    situation: "68F in for routine follow-up.",
    background: "5 active meds.",
    assessment: "BP stable; K⁺ 5.3 high.",
    recommendation: "[clinician to complete]",
  },
  patient: "Jane is here for a regular check-up.",
};

describe("SummaryCard", () => {
  it("defaults to the SBAR handoff view with all four blocks", () => {
    render(<SummaryCard data={data} />);
    expect(screen.getByText("Situation")).toBeInTheDocument();
    expect(screen.getByText("Background")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("Recommendation")).toBeInTheDocument();
    expect(screen.getByText("[clinician to complete]")).toBeInTheDocument();
  });

  it("switches to the plain-language patient view", () => {
    render(<SummaryCard data={data} />);
    expect(
      screen.queryByText("Jane is here for a regular check-up."),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "For the patient" }));
    expect(
      screen.getByText("Jane is here for a regular check-up."),
    ).toBeInTheDocument();
  });

  it("renders source citations and a draft disclaimer", () => {
    render(<SummaryCard data={data} />);
    expect(screen.getByText("[Condition/I10]")).toBeInTheDocument();
    expect(screen.getByText(/review before use/)).toBeInTheDocument();
  });
});
