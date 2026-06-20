import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import { buildGlance, safetyScan } from "@/lib/glance";
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

describe("buildGlance", () => {
  it("summarizes active meds, problems, and flagged labs from the chart", () => {
    const g = buildGlance(ctx);
    expect(g.medsActive).toBe(5);
    expect(g.problems).toMatch(/hypertension/i);
    expect(g.flagged).toMatch(/Potassium 5.3/);
    expect(g.summary).toMatch(/active med/);
    expect(g.details?.length ?? 0).toBeGreaterThan(0);
  });
});

describe("safetyScan", () => {
  it("raises the ACE-inhibitor + high-potassium alert first", () => {
    const alerts = safetyScan(ctx);
    const hyperk = alerts.find((a) => a.id === "hyperk");
    expect(hyperk?.severity).toBe("warn");
    expect(hyperk?.title).toMatch(/Lisinopril/);
  });

  it("surfaces the curated interaction and the med-without-indication gap", () => {
    const alerts = safetyScan(ctx);
    expect(
      alerts.some((a) => /statin .* calcium-channel/i.test(a.title)),
    ).toBe(true);
    expect(
      alerts.some((a) => /Metformin.*no charted indication/i.test(a.title)),
    ).toBe(true);
  });
});
