import { describe, expect, it } from "vitest";
import {
  mapImmunizations,
  mapMedications,
  mapProcedures,
  patientView,
} from "@/lib/fhir";
import { buildPatientContext, type PatientContext } from "@/lib/grounding";
import {
  buildHealthMaintenance,
  immunizationStatus,
  preventiveSummary,
  screeningGaps,
} from "@/lib/preventive";
import {
  SEED_IMMUNIZATIONS,
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
  SEED_PROCEDURES,
} from "@/lib/seed";

// Fixed "today" so the interval math (overdue vs up-to-date) is deterministic.
const TODAY = new Date("2026-06-20T12:00:00");

const ctx = buildPatientContext(
  patientView(SEED_PATIENT, TODAY),
  mapMedications(SEED_MEDICATIONS),
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
  mapImmunizations(SEED_IMMUNIZATIONS),
  mapProcedures(SEED_PROCEDURES),
);

function fixture(sexAge: string, dob: string): PatientContext {
  return {
    patient: { name: "Test Patient", sexAge, dob, mrn: "x" },
    medications: [],
    problems: [],
    observations: [],
    immunizations: [],
    procedures: [],
  };
}

const status = (items: { id: string; status: string }[], id: string) =>
  items.find((i) => i.id === id)?.status;

describe("immunizationStatus", () => {
  it("marks influenza up-to-date and the never-given vaccines due (Jane, 68 F)", () => {
    const items = immunizationStatus(ctx, TODAY);
    expect(status(items, "influenza")).toBe("up-to-date");
    expect(status(items, "pneumococcal")).toBe("due");
    expect(status(items, "herpes-zoster")).toBe("due");
    // The up-to-date item cites the source resource.
    const flu = items.find((i) => i.id === "influenza");
    expect(flu?.evidence[0]).toBe("Immunization/imm-flu-2025");
  });
});

describe("screeningGaps", () => {
  it("flags the stale mammogram overdue and the never-done BMD missing (Jane, 68 F)", () => {
    const items = screeningGaps(ctx, TODAY);
    expect(status(items, "breast")).toBe("overdue");
    expect(status(items, "bone-density")).toBe("missing");
    // Recent screens are not nagged.
    expect(status(items, "cervical")).toBe("up-to-date");
    expect(status(items, "colorectal")).toBe("up-to-date");
    const breast = items.find((i) => i.id === "breast");
    expect(breast?.evidence).toEqual(["Procedure/proc-mammo-2022"]);
    const bmd = items.find((i) => i.id === "bone-density");
    expect(bmd?.evidence).toEqual(["no record on file"]);
  });
});

describe("age + sex filtering", () => {
  it("does not apply 65+ rules to a 40-year-old", () => {
    const young = fixture("40 F", "1986-01-01");
    const ids = [
      ...immunizationStatus(young, TODAY),
      ...screeningGaps(young, TODAY),
    ].map((i) => i.id);
    expect(ids).not.toContain("pneumococcal"); // minAge 65
    expect(ids).not.toContain("bone-density"); // minAge 65
    expect(ids).not.toContain("herpes-zoster"); // minAge 50
  });

  it("does not apply female-only rules to a male, nor male-only to a female", () => {
    const male = fixture("60 M", "1966-01-01");
    const maleIds = screeningGaps(male, TODAY).map((i) => i.id);
    expect(maleIds).not.toContain("breast");
    expect(maleIds).not.toContain("cervical");
    expect(maleIds).not.toContain("bone-density");

    const femaleIds = screeningGaps(ctx, TODAY).map((i) => i.id);
    expect(femaleIds).not.toContain("prostate");
  });
});

describe("the prostate trap (CTFPHC recommends against routine PSA)", () => {
  it("never surfaces prostate PSA as overdue or missing for a male", () => {
    const male = fixture("60 M", "1966-01-01");
    const prostate = screeningGaps(male, TODAY).find((i) => i.id === "prostate");
    expect(prostate).toBeDefined(); // the rule applies (male, 55+)...
    expect(prostate?.status).not.toBe("overdue"); // ...but is never a nag
    expect(prostate?.status).not.toBe("missing");
    expect(prostate?.status).not.toBe("due");
    // ...and so it never reaches the actionable section.
    expect(buildHealthMaintenance(male, TODAY).map((i) => i.id)).not.toContain(
      "prostate",
    );
  });
});

describe("buildHealthMaintenance", () => {
  it("returns only actionable items, worst-first", () => {
    const items = buildHealthMaintenance(ctx, TODAY);
    expect(items.map((i) => i.id)).toEqual([
      "breast", // overdue
      "bone-density", // missing
      "pneumococcal", // due
      "herpes-zoster", // due
    ]);
    expect(items.every((i) => i.status !== "up-to-date")).toBe(true);
  });
});

describe("preventiveSummary", () => {
  it("rollups match the item lists", () => {
    const { vaccines, screenings } = preventiveSummary(ctx, TODAY);
    expect(vaccines).toMatch(/2 due/);
    expect(screenings).toMatch(/1 overdue/);
    expect(screenings).toMatch(/1 missing/);
  });

  it("reads 'Up to date' when nothing is actionable", () => {
    const young = fixture("40 M", "1986-01-01");
    // A 40 M has no due immunization once influenza is on file.
    const withFlu: PatientContext = {
      ...young,
      immunizations: mapImmunizations(SEED_IMMUNIZATIONS),
    };
    expect(preventiveSummary(withFlu, TODAY).vaccines).toBe("Up to date");
  });
});
