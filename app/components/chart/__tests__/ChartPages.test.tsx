import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import AllergiesView from "@/app/components/chart/AllergiesView";
import NotesView from "@/app/components/chart/NotesView";
import OrdersView from "@/app/components/chart/OrdersView";
import ProblemsView from "@/app/components/chart/ProblemsView";
import ResultsView from "@/app/components/chart/ResultsView";
import type { ContextObservation, ContextProblem } from "@/lib/grounding";

const problems: ContextProblem[] = [
  { name: "Essential hypertension", ref: "Condition/I10" },
  { name: "Hyperlipidemia", ref: "Condition/E78.5" },
];

const observations: ContextObservation[] = [
  { code: "2823-3", label: "Potassium", value: 5.3, unit: "mmol/L", date: "2026-06-10", ref: "Observation/k" },
  { code: "33914-3", label: "eGFR", value: 58, unit: "mL/min/1.73m²", date: "2026-06-01", ref: "Observation/egfr" },
];

describe("chart section views", () => {
  it("ProblemsView lists each problem with its count", () => {
    render(<ProblemsView problems={problems} />);
    expect(screen.getByText("Essential hypertension")).toBeInTheDocument();
    expect(screen.getByText("Hyperlipidemia")).toBeInTheDocument();
    expect(screen.getByText("2 on file")).toBeInTheDocument();
  });

  it("ProblemsView shows an empty state when there are none", () => {
    render(<ProblemsView problems={[]} />);
    expect(screen.getByText(/No problems charted/i)).toBeInTheDocument();
  });

  it("ResultsView flags an out-of-range result and sorts newest first", () => {
    render(<ResultsView observations={observations} />);
    expect(screen.getByText("Potassium")).toBeInTheDocument();
    // K⁺ 5.3 is above the 3.5–5.1 reference range → flagged "high".
    expect(screen.getByText("high")).toBeInTheDocument();
    const rows = screen.getAllByTestId("result-row");
    expect(rows[0]).toHaveTextContent("Potassium"); // 2026-06-10 before 2026-06-01
  });

  it("AllergiesView lists allergies, and warns when none are recorded", () => {
    const { rerender } = render(
      <AllergiesView allergies={["Penicillin (rash)"]} />,
    );
    expect(screen.getByText("Penicillin (rash)")).toBeInTheDocument();
    rerender(<AllergiesView allergies={[]} />);
    expect(screen.getByText(/No known allergies/i)).toBeInTheDocument();
  });

  it("NotesView and OrdersView fire their draft actions", () => {
    const onNote = vi.fn();
    const { unmount } = render(<NotesView onDraft={onNote} />);
    fireEvent.click(screen.getByRole("button", { name: "Draft a note" }));
    expect(onNote).toHaveBeenCalledTimes(1);
    unmount();

    const onOrder = vi.fn();
    render(<OrdersView onDraft={onOrder} />);
    fireEvent.click(screen.getByRole("button", { name: "Draft an order" }));
    expect(onOrder).toHaveBeenCalledTimes(1);
  });
});
