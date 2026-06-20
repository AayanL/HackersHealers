import { describe, expect, it } from "vitest";
import {
  activeCount,
  ageFromDob,
  drugName,
  dosageText,
  indicationOf,
  initialsFrom,
  mapMedications,
  medView,
  mrnOf,
  patientName,
  patientView,
  sexAge,
  sortMeds,
} from "@/lib/fhir";
import { SEED_MEDICATIONS, SEED_PATIENT } from "@/lib/seed";
import type { MedicationRequest } from "@/lib/types";

const TODAY = new Date("2026-06-19T12:00:00");

describe("patient helpers", () => {
  it("builds a full name from given + family", () => {
    expect(patientName(SEED_PATIENT)).toBe("Jane Doe");
  });

  it("falls back when no name is present", () => {
    expect(patientName({})).toBe("Unknown patient");
  });

  it("derives initials from a name", () => {
    expect(initialsFrom("Jane Doe")).toBe("JD");
    expect(initialsFrom("madonna")).toBe("M");
    expect(initialsFrom("  ")).toBe("?");
  });

  it("computes age from DOB relative to a reference date", () => {
    expect(ageFromDob("1958-03-11", TODAY)).toBe(68);
    // birthday not yet reached this year
    expect(ageFromDob("1958-12-31", TODAY)).toBe(67);
    expect(ageFromDob(undefined, TODAY)).toBeNull();
  });

  it("formats sex + age", () => {
    expect(sexAge(SEED_PATIENT, TODAY)).toBe("68 F");
  });

  it("reads the MRN identifier", () => {
    expect(mrnOf(SEED_PATIENT)).toBe("00417-829");
  });

  it("assembles a patient view model", () => {
    const v = patientView(SEED_PATIENT, TODAY);
    expect(v).toMatchObject({
      name: "Jane Doe",
      initials: "JD",
      sexAge: "68 F",
      dob: "1958-03-11",
      mrn: "00417-829",
    });
  });
});

describe("medication helpers", () => {
  const metformin = SEED_MEDICATIONS.find((m) => m.id === "metformin-500")!;
  const lisinopril = SEED_MEDICATIONS.find((m) => m.id === "lisinopril-10")!;

  it("reads the drug name from codeable concept, coding, or reference", () => {
    expect(drugName(lisinopril)).toBe("Lisinopril 10 mg");
    expect(
      drugName({ medicationCodeableConcept: { coding: [{ display: "Foo" }] } }),
    ).toBe("Foo");
    expect(drugName({ medicationReference: { display: "Bar" } })).toBe("Bar");
    expect(drugName({})).toBe("Unnamed medication");
  });

  it("reads the dosage sig", () => {
    expect(dosageText(lisinopril)).toBe("1 tab PO daily");
    expect(dosageText({})).toBe("");
  });

  it("returns the indication, or null when none is charted", () => {
    expect(indicationOf(lisinopril)).toBe("Hypertension");
    expect(indicationOf(metformin)).toBeNull();
  });

  it("sorts active meds first, then newest authored", () => {
    const shuffled: MedicationRequest[] = [
      { id: "old", status: "completed", authoredOn: "2020-01-01" },
      { id: "new-active", status: "active", authoredOn: "2026-01-01" },
      { id: "older-active", status: "active", authoredOn: "2024-01-01" },
    ];
    expect(sortMeds(shuffled).map((m) => m.id)).toEqual([
      "new-active",
      "older-active",
      "old",
    ]);
  });

  it("does not mutate the input array when sorting", () => {
    const input = [...SEED_MEDICATIONS];
    sortMeds(input);
    expect(input).toEqual(SEED_MEDICATIONS);
  });

  it("maps a med to a view model", () => {
    expect(medView(metformin)).toEqual({
      id: "metformin-500",
      name: "Metformin 500 mg",
      sig: "1 tab PO BID",
      indication: null,
      status: "active",
      since: "2025-11-10",
    });
  });

  it("maps a bundle or array of meds", () => {
    const views = mapMedications(SEED_MEDICATIONS);
    expect(views).toHaveLength(5);
    expect(views[0].name).toBe("Lisinopril 10 mg"); // newest active first
    expect(activeCount(views)).toBe(5);

    const fromBundle = mapMedications({
      resourceType: "Bundle",
      entry: SEED_MEDICATIONS.map((resource) => ({ resource })),
    });
    expect(fromBundle).toHaveLength(5);
  });
});
