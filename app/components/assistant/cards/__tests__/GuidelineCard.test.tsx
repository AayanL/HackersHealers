import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { GuidelineCardData } from "@/lib/assistant";
import GuidelineCard from "@/app/components/assistant/cards/GuidelineCard";

const data: GuidelineCardData = {
  kind: "guideline",
  sourceCondition: "Condition/I10",
  bullets: [
    {
      text: "Check eGFR annually during metformin therapy.",
      source: "ADA Standards of Care 2025",
    },
  ],
  codes: [
    {
      id: "icd-e119",
      system: "ICD-10",
      code: "E11.9",
      display: "Type 2 diabetes without complications",
      confidence: "needs confirmation",
    },
    {
      id: "snomed-44054006",
      system: "SNOMED",
      code: "44054006",
      display: "Diabetes mellitus type 2",
    },
  ],
  unverifiedNote: "no diabetes Condition charted",
};

describe("GuidelineCard", () => {
  it("renders monitoring bullets with external-knowledge sources", () => {
    render(<GuidelineCard data={data} />);
    expect(
      screen.getByText("Check eGFR annually during metformin therapy."),
    ).toBeInTheDocument();
    expect(screen.getByText("ADA Standards of Care 2025")).toBeInTheDocument();
    expect(screen.getByText("external knowledge")).toBeInTheDocument();
  });

  it("renders selectable code rows for each system", () => {
    render(<GuidelineCard data={data} />);
    expect(screen.getAllByTestId("code-option")).toHaveLength(2);
    expect(screen.getByText("E11.9")).toBeInTheDocument();
    expect(screen.getByText("44054006")).toBeInTheDocument();
  });

  it("selects a code on click and reveals its confidence note", () => {
    render(<GuidelineCard data={data} />);
    const [icd] = screen.getAllByTestId("code-option");
    expect(icd).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(icd);
    expect(icd).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText(/Confidence: needs confirmation/)).toBeInTheDocument();
  });

  it("labels unsourced model text as unverified and cites the source Condition", () => {
    render(<GuidelineCard data={data} />);
    expect(
      screen.getByText(/Model summary, unverified/),
    ).toBeInTheDocument();
    expect(screen.getByText("source: Condition/I10")).toBeInTheDocument();
  });
});
