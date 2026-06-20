import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import PatientBanner, { allergyShort } from "@/app/components/PatientBanner";
import { patientView } from "@/lib/fhir";
import { SEED_ALLERGIES, SEED_PATIENT } from "@/lib/seed";

const pv = patientView(SEED_PATIENT, new Date("2026-06-19T12:00:00"));

describe("PatientBanner", () => {
  it("renders the patient identity from a view model", () => {
    render(
      <PatientBanner
        patient={pv}
        allergies={SEED_ALLERGIES}
        codeStatus="Full code"
      />,
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("68 F")).toBeInTheDocument();
    expect(screen.getByText("MRN 00417-829")).toBeInTheDocument();
    expect(screen.getByText("DOB 1958-03-11")).toBeInTheDocument();
  });

  it("renders allergy chips and code status", () => {
    render(<PatientBanner patient={pv} allergies={SEED_ALLERGIES} />);
    expect(screen.getByText("PCN")).toBeInTheDocument();
    expect(screen.getByText("Full code")).toBeInTheDocument();
  });
});

describe("allergyShort", () => {
  it("abbreviates known and generic allergens", () => {
    expect(allergyShort("Penicillin (rash)")).toBe("PCN");
    expect(allergyShort("Sulfa drugs")).toBe("SUL");
  });
});
