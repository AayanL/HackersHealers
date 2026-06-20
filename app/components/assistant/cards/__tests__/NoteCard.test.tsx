import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { NoteCardData } from "@/lib/assistant";
import NoteCard from "@/app/components/assistant/cards/NoteCard";

const data: NoteCardData = {
  kind: "note",
  citations: ["Encounter/2026-06-10"],
  soap: {
    subjective: "Here for routine follow-up.",
    objective: "K⁺ 5.3, eGFR 58.",
    assessment: "Hypertension controlled.",
    plan: "Repeat BMP next week.",
  },
  todos: ["Confirm indication for metformin", "Record A1c if available"],
};

describe("NoteCard", () => {
  it("defaults to the SOAP progress note with all four blocks", () => {
    render(<NoteCard data={data} />);
    expect(screen.getByText("Subjective")).toBeInTheDocument();
    expect(screen.getByText("Objective")).toBeInTheDocument();
    expect(screen.getByText("Assessment")).toBeInTheDocument();
    expect(screen.getByText("Plan")).toBeInTheDocument();
    expect(screen.getByText("Repeat BMP next week.")).toBeInTheDocument();
  });

  it("switches to the documentation checklist", () => {
    render(<NoteCard data={data} />);
    expect(
      screen.queryByText("Confirm indication for metformin"),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "To document" }));
    expect(
      screen.getByText("Confirm indication for metformin"),
    ).toBeInTheDocument();
    expect(screen.getByText("Record A1c if available")).toBeInTheDocument();
  });

  it("carries a not-signed disclaimer and citations", () => {
    render(<NoteCard data={data} />);
    expect(screen.getByText(/not entered in chart/)).toBeInTheDocument();
    expect(screen.getByText("[Encounter/2026-06-10]")).toBeInTheDocument();
  });
});
