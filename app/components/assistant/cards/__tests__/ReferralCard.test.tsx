import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ReferralCard from "@/app/components/assistant/cards/ReferralCard";
import type { ReferralCardData } from "@/lib/assistant";

const data: ReferralCardData = {
  kind: "referral",
  specialty: "Cardiology",
  reason: "Essential hypertension",
  reasonRef: "Condition/I10",
  candidates: [
    { id: "c0", name: "Dr. A. Okafor", clinic: "Riverside Cardiology", wait: "~4 weeks", selected: true },
    { id: "c1", name: "Dr. M. Lindqvist", clinic: "Lakeshore Heart Centre", wait: "~4 weeks" },
  ],
  fields: [
    { key: "patient", label: "Patient", value: "Jane Doe" },
    {
      key: "reason",
      label: "Reason for referral",
      value: "Essential hypertension",
      ref: "Condition/I10",
    },
    { key: "urgency", label: "Urgency", value: null },
  ],
  attachments: [
    { id: "att-labs", label: "Recent bloodwork", present: true, ref: "Observation/k", note: "most recent 2026-06-10" },
    { id: "att-0", label: "Recent ECG", present: false, note: "not in chart — attach manually" },
  ],
  slots: [
    { id: "slot-0", date: "2026-07-08", time: "09:20", mode: "In person" },
    { id: "slot-1", date: "2026-07-10", time: "13:40", mode: "Virtual" },
  ],
  letter: "Dear Cardiology colleague,\n\nThank you for seeing Jane Doe.",
  toComplete: ["Urgency", "Recent ECG"],
  disclosureNote: "AI-drafted referral — review and complete before sending. Not sent.",
};

describe("ReferralCard", () => {
  it("renders the specialty, candidate specialists, and the letter", () => {
    render(<ReferralCard data={data} />);
    expect(screen.getByTestId("referral-card")).toBeInTheDocument();
    expect(screen.getByText("Dr. A. Okafor")).toBeInTheDocument();
    expect(screen.getByText("Riverside Cardiology")).toBeInTheDocument();
    expect(screen.getByText(/Thank you for seeing Jane Doe/)).toBeInTheDocument();
  });

  it("marks unfilled fields as clinician-to-complete and lists them", () => {
    render(<ReferralCard data={data} />);
    expect(screen.getByText("[clinician to complete]")).toBeInTheDocument();
    expect(screen.getByText(/To complete:/i)).toBeInTheDocument();
  });

  it("shows present vs. missing supporting attachments", () => {
    render(<ReferralCard data={data} />);
    expect(screen.getByText("attached")).toBeInTheDocument();
    expect(screen.getByText("missing")).toBeInTheDocument();
  });

  it("proposes appointment times and labels them not booked", () => {
    render(<ReferralCard data={data} />);
    expect(screen.getByText(/2026-07-08/)).toBeInTheDocument();
    expect(screen.getByText(/Not booked/i)).toBeInTheDocument();
  });

  it("offers an Export menu with a Print option", () => {
    render(<ReferralCard data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menuitem", { name: "Print" })).toBeInTheDocument();
  });

  it("cites the reason field's source Condition", () => {
    const onClick = vi.fn();
    render(<ReferralCard data={data} onCitationClick={onClick} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Open reference: Condition\/I10/i }),
    );
    expect(onClick).toHaveBeenCalledWith("Condition/I10");
  });
});
