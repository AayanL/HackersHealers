import { describe, expect, it } from "vitest";
import { citationLabels, shortRef } from "@/lib/citations";
import type { PatientContext } from "@/lib/grounding";

const ctx: PatientContext = {
  patient: { name: "John Smith", sexAge: "62 M", dob: "1964-03-18", mrn: "z" },
  medications: [
    {
      ref: "MedicationRequest/55b5db91",
      name: "Nitroglycerin 0.4 mg",
      sig: "1 spray SL PRN",
      indication: null,
      status: "active",
      since: "2024-01-01",
    },
  ],
  problems: [{ name: "Coronary Heart Disease", ref: "Condition/dd6d9bfc" }],
  observations: [
    { code: "2823-3", label: "Potassium", value: 5.3, unit: "mmol/L", date: "2026-06-10", ref: "Observation/k" },
  ],
};

describe("citationLabels", () => {
  it("maps each resource ref to a human label", () => {
    const map = citationLabels(ctx);
    expect(map["MedicationRequest/55b5db91"]).toBe("Nitroglycerin 0.4 mg");
    expect(map["Condition/dd6d9bfc"]).toBe("Coronary Heart Disease");
    expect(map["Observation/k"]).toBe("Potassium 5.3 mmol/L");
  });
});

describe("shortRef", () => {
  it("truncates a long opaque id but keeps the resource type", () => {
    expect(shortRef("MedicationRequest/55b5db91-5f9d-4feb-8560-05d4c4e6794a")).toBe(
      "MedicationRequest/55b5db91…",
    );
  });

  it("leaves short slugs untouched", () => {
    expect(shortRef("Condition/I10")).toBe("Condition/I10");
  });
});
