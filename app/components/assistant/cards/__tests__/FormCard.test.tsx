import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import FormCard from "@/app/components/assistant/cards/FormCard";
import type { FormCardData } from "@/lib/assistant";

const data: FormCardData = {
  kind: "form",
  template: "attestation",
  title: "Medical attestation / letter",
  fields: [
    { key: "name", label: "Patient", value: "Jane Doe" },
    { key: "from", label: "Absence from", value: null },
    {
      key: "condition",
      label: "Condition",
      value: "Essential hypertension",
      ref: "Condition/I10",
    },
  ],
  body: "This is to attest that Jane Doe is under my care.",
  toComplete: ["Absence from"],
  disclosureNote: "Includes the charted condition — confirm consent.",
};

describe("FormCard", () => {
  it("renders the title, prefilled fields, and the body", () => {
    render(<FormCard data={data} />);
    expect(screen.getByTestId("form-card")).toBeInTheDocument();
    expect(screen.getByText("Medical attestation / letter")).toBeInTheDocument();
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(
      screen.getByText(/This is to attest that Jane Doe/i),
    ).toBeInTheDocument();
  });

  it("marks unfilled fields as clinician-to-complete and lists them", () => {
    render(<FormCard data={data} />);
    expect(screen.getByText("[clinician to complete]")).toBeInTheDocument();
    expect(screen.getByText(/To complete:/i)).toBeInTheDocument();
    expect(screen.getByText(/review and sign before issuing/i)).toBeInTheDocument();
  });

  it("offers an Export menu with a Print option", () => {
    render(<FormCard data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    expect(screen.getByRole("menuitem", { name: "Print" })).toBeInTheDocument();
  });

  it("cites the charted condition field", () => {
    const onClick = vi.fn();
    render(<FormCard data={data} onCitationClick={onClick} />);
    fireEvent.click(
      screen.getByRole("button", { name: /Open reference: Condition\/I10/i }),
    );
    expect(onClick).toHaveBeenCalledWith("Condition/I10");
  });
});
