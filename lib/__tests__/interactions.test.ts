import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext, type PatientContext } from "@/lib/grounding";
import { buildInteractions, checkInteractions } from "@/lib/interactions";
import {
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
} from "@/lib/seed";

const ctx = buildPatientContext(
  patientView(SEED_PATIENT),
  mapMedications(SEED_MEDICATIONS),
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
);

function med(ref: string, name: string, status = "active") {
  return { ref, name, sig: "", indication: null, status, since: "" };
}

describe("checkInteractions", () => {
  it("flags the statin + dihydropyridine CCB interaction for the seed patient", () => {
    const f = checkInteractions(ctx).find((x) =>
      /statin .* calcium-channel/i.test(x.title),
    );
    expect(f).toBeDefined();
    expect(f?.type).toBe("interaction");
    expect(f?.meds).toEqual(
      expect.arrayContaining([
        "MedicationRequest/atorvastatin-20",
        "MedicationRequest/amlodipine-5",
      ]),
    );
  });

  it("considers only active meds and de-dupes a pair", () => {
    const c: PatientContext = {
      patient: ctx.patient,
      problems: [],
      observations: [],
      medications: [
        med("MedicationRequest/w", "Warfarin 5 mg"),
        med("MedicationRequest/a", "Aspirin 81 mg"),
        med("MedicationRequest/n", "Ibuprofen 400 mg", "stopped"),
      ],
    };
    const findings = checkInteractions(c);
    expect(
      findings.filter((f) => /warfarin \+ aspirin/i.test(f.title)),
    ).toHaveLength(1);
    // The stopped NSAID must not trigger any interaction.
    expect(findings.some((f) => /nsaid/i.test(f.title))).toBe(false);
  });
});

describe("buildInteractions", () => {
  it("returns a reconcile card flagged as a curated subset", () => {
    const card = buildInteractions(ctx);
    expect(card.kind).toBe("reconcile");
    expect(card.findings.length).toBeGreaterThan(0);
    expect(card.coverageGaps?.[0]).toMatch(/curated/i);
  });

  it("states none found when there are no interactions", () => {
    const card = buildInteractions({
      patient: ctx.patient,
      problems: [],
      observations: [],
      medications: [med("MedicationRequest/x", "Acetaminophen 500 mg")],
    });
    expect(card.findings).toHaveLength(0);
    expect(card.coverageGaps?.[0]).toMatch(/No interactions/i);
  });
});
