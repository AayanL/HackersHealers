import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import { SEED_MEDICATIONS, SEED_PATIENT } from "@/lib/seed";

describe("buildPatientContext", () => {
  it("assembles a compact single-patient grounding bundle", () => {
    const ctx = buildPatientContext(
      patientView(SEED_PATIENT, new Date("2026-06-19T12:00:00")),
      mapMedications(SEED_MEDICATIONS),
    );
    expect(ctx.patient.name).toBe("Jane Doe");
    expect(ctx.patient.sexAge).toBe("68 F");
    expect(ctx.medications).toHaveLength(5);
    const metformin = ctx.medications.find((m) => m.name.startsWith("Metformin"));
    expect(metformin?.indication).toBeNull();
  });
});
