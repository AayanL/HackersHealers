import { describe, expect, it } from "vitest";
import type { PatientContext } from "@/lib/grounding";
import { resourceIndex, unknownResource } from "@/lib/resources";

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

describe("resourceIndex", () => {
  it("builds a detail per resource keyed by ref", () => {
    const idx = resourceIndex(ctx);
    const med = idx["MedicationRequest/55b5db91"];
    expect(med.type).toBe("MedicationRequest");
    expect(med.title).toBe("Nitroglycerin 0.4 mg");
    expect(med.fields.find((f) => f.label === "Status")?.value).toBe("active");
    expect(idx["Condition/dd6d9bfc"].type).toBe("Condition");
    expect(idx["Observation/k"].title).toBe("Potassium 5.3 mmol/L");
  });

  it("marks an active med that has no charted indication", () => {
    const med = resourceIndex(ctx)["MedicationRequest/55b5db91"];
    expect(med.fields.find((f) => f.label === "Indication")?.value).toMatch(
      /none charted/,
    );
  });
});

describe("unknownResource", () => {
  it("derives a minimal detail from an unindexed ref", () => {
    const d = unknownResource("Patient/z");
    expect(d.type).toBe("Patient");
    expect(d.ref).toBe("Patient/z");
    expect(d.fields[0].value).toMatch(/Not in the loaded chart context/);
  });
});
