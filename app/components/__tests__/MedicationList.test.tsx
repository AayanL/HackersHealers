import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MedicationList from "@/app/components/MedicationList";
import { mapMedications } from "@/lib/fhir";
import { SEED_MEDICATIONS } from "@/lib/seed";

const meds = mapMedications(SEED_MEDICATIONS);

describe("MedicationList", () => {
  it("renders one row per medication with name and sig", () => {
    render(<MedicationList meds={meds} />);
    expect(screen.getAllByTestId("med-row")).toHaveLength(5);
    expect(screen.getByText("Lisinopril 10 mg")).toBeInTheDocument();
    expect(screen.getByText("1 tab PO BID")).toBeInTheDocument();
  });

  it("shows the active count", () => {
    render(<MedicationList meds={meds} />);
    expect(screen.getByText("active=5")).toBeInTheDocument();
  });

  it("flags a medication with no charted indication", () => {
    render(<MedicationList meds={meds} />);
    expect(screen.getByText("no dx")).toBeInTheDocument();
    // Indications that ARE present still render
    expect(screen.getAllByText("Hypertension").length).toBeGreaterThanOrEqual(2);
  });

  it("invokes onReconcile when the Reconcile button is pressed", () => {
    const onReconcile = vi.fn();
    render(<MedicationList meds={meds} onReconcile={onReconcile} />);
    fireEvent.click(screen.getByRole("button", { name: /reconcile/i }));
    expect(onReconcile).toHaveBeenCalledTimes(1);
  });
});
