import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import BillingCard from "@/app/components/assistant/cards/BillingCard";
import type { BillingCardData } from "@/lib/assistant";

const data: BillingCardData = {
  kind: "billing",
  total: "$37.95",
  lines: [
    {
      id: "svc-assessment",
      kind: "service",
      code: "A007",
      display: "Intermediate assessment (office visit)",
      fee: "$37.95",
      basis: "Office visit / encounter",
      note: "synthetic schedule — confirm",
    },
    {
      id: "dx-Condition/I10",
      kind: "diagnostic",
      code: "401",
      display: "Hypertension",
      basis: "Essential hypertension",
      ref: "Condition/I10",
    },
  ],
  findings: [
    {
      id: "specimen-collection",
      severity: "moderate",
      title: "Bloodwork on file — specimen-collection fee may be missing",
      detail: "If you personally collected the specimen…",
      refs: ["Observation/k"],
    },
  ],
  coverageNote: "Curated synthetic fee subset — VERA does not submit claims.",
};

describe("BillingCard", () => {
  it("renders code lines with fee and the running total", () => {
    render(<BillingCard data={data} />);
    expect(screen.getByTestId("billing-card")).toBeInTheDocument();
    expect(screen.getByText("A007")).toBeInTheDocument();
    expect(screen.getByText("Hypertension")).toBeInTheDocument();
    expect(screen.getAllByText("$37.95").length).toBeGreaterThan(0);
  });

  it("shows the missing-code check and the synthetic disclaimer", () => {
    render(<BillingCard data={data} />);
    expect(screen.getByTestId("billing-finding")).toBeInTheDocument();
    expect(screen.getByText(/synthetic fee subset/i)).toBeInTheDocument();
    expect(screen.getByText(/review before billing/i)).toBeInTheDocument();
  });

  it("makes a diagnostic line's source Condition a clickable citation", () => {
    const onClick = vi.fn();
    render(<BillingCard data={data} onCitationClick={onClick} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Open reference: Condition\/I10/i }),
    );
    expect(onClick).toHaveBeenCalledWith("Condition/I10");
  });
});
