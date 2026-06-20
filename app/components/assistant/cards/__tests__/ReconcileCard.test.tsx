import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ReconcileCardData } from "@/lib/assistant";
import ReconcileCard from "@/app/components/assistant/cards/ReconcileCard";

const data: ReconcileCardData = {
  kind: "reconcile",
  findings: [
    {
      id: "gap-metformin",
      type: "gap",
      severity: "moderate",
      title: "Metformin active · no diabetes problem charted",
      detail: "Active but no matching Condition.",
      meds: ["MedicationRequest/metformin"],
      source: "med-without-indication",
    },
    {
      id: "dup-anti",
      type: "duplicate",
      severity: "low",
      title: "Possible duplicate antihypertensive",
      meds: ["MedicationRequest/lisinopril", "MedicationRequest/amlodipine"],
    },
  ],
  coverageGaps: ["eGFR 58 — renal-dose check limited"],
};

describe("ReconcileCard", () => {
  it("renders one entry per finding with its title", () => {
    render(<ReconcileCard data={data} />);
    expect(screen.getAllByTestId("reconcile-finding")).toHaveLength(2);
    expect(
      screen.getByText("Metformin active · no diabetes problem charted"),
    ).toBeInTheDocument();
  });

  it("tags findings by type and summarizes counts", () => {
    render(<ReconcileCard data={data} />);
    expect(screen.getByText("GAP")).toBeInTheDocument();
    expect(screen.getByText("DUP")).toBeInTheDocument();
    expect(screen.getByText("1 duplicate · 1 gap")).toBeInTheDocument();
  });

  it("shows offending-drug chips by short reference", () => {
    render(<ReconcileCard data={data} />);
    expect(screen.getByText("metformin")).toBeInTheDocument();
    expect(screen.getByText("lisinopril")).toBeInTheDocument();
  });

  it("surfaces coverage gaps and the advisory banner", () => {
    render(<ReconcileCard data={data} />);
    expect(screen.getByText(/renal-dose check limited/)).toBeInTheDocument();
    expect(
      screen.getByText(/Advisory only — does not modify orders/),
    ).toBeInTheDocument();
  });
});
