import { describe, expect, it } from "vitest";
import { buildBilling } from "@/lib/billing";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext, type PatientContext } from "@/lib/grounding";
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

describe("buildBilling", () => {
  it("proposes a service line for the visit with a deterministic fee", () => {
    const card = buildBilling(ctx);
    const svc = card.lines.find((l) => l.kind === "service");
    expect(svc?.code).toBe("A007");
    expect(svc?.fee).toBe("$37.95");
    expect(card.total).toBe("$37.95");
  });

  it("proposes a cited OHIP-style diagnostic line per charted problem", () => {
    const card = buildBilling(ctx);
    const dx = card.lines.filter((l) => l.kind === "diagnostic");
    // Hypertension, hyperlipidemia, osteoarthritis all map in the curated set.
    expect(dx.map((l) => l.code)).toEqual(
      expect.arrayContaining(["401", "272", "715"]),
    );
    const htn = dx.find((l) => l.code === "401");
    expect(htn?.ref).toBe("Condition/I10");
  });

  it("catches the missing specimen-collection fee when bloodwork is on file", () => {
    const card = buildBilling(ctx);
    const finding = card.findings.find((f) => f.id === "specimen-collection");
    expect(finding?.severity).toBe("moderate");
    // Cites the collected labs, not the calculated eGFR.
    expect(finding?.refs).toContain("Observation/k");
    expect(finding?.refs).not.toContain("Observation/egfr");
  });

  it("is honest that the schedule is a synthetic subset", () => {
    const card = buildBilling(ctx);
    expect(card.coverageNote).toMatch(/synthetic/i);
    expect(card.coverageNote).toMatch(/does not submit/i);
  });

  it("flags a high-severity gap when there is no diagnostic code at all", () => {
    const bare: PatientContext = {
      patient: ctx.patient,
      medications: [],
      problems: [],
      observations: [],
    };
    const card = buildBilling(bare);
    expect(card.lines.some((l) => l.kind === "diagnostic")).toBe(false);
    expect(card.findings.some((f) => f.id === "no-diagnosis")).toBe(true);
    expect(card.findings.find((f) => f.id === "no-diagnosis")?.severity).toBe(
      "high",
    );
  });

  it("maps common Synthea conditions instead of flooding 'no code' findings", () => {
    const live: PatientContext = {
      patient: ctx.patient,
      medications: [],
      problems: [
        { name: "Viral sinusitis (disorder)", ref: "Condition/sin" },
        { name: "Acute bronchitis (disorder)", ref: "Condition/bro" },
        { name: "Coronary Heart Disease", ref: "Condition/chd" },
        { name: "Cardiac Arrest", ref: "Condition/ca" },
      ],
      observations: [],
    };
    const card = buildBilling(live);
    const dx = card.lines.filter((l) => l.kind === "diagnostic");
    expect(dx.map((l) => l.code)).toEqual(
      expect.arrayContaining(["461", "466", "414", "427"]),
    );
    expect(card.findings.some((f) => f.id === "unmapped-dx")).toBe(false);
    expect(card.findings.some((f) => f.id === "no-diagnosis")).toBe(false);
  });

  it("consolidates unmapped problems into a single advisory", () => {
    const mixed: PatientContext = {
      patient: ctx.patient,
      medications: [],
      problems: [
        { name: "Essential hypertension", ref: "Condition/I10" },
        { name: "Rare orphan syndrome", ref: "Condition/orphan" },
      ],
      observations: [],
    };
    const card = buildBilling(mixed);
    expect(card.lines.some((l) => l.code === "401")).toBe(true);
    const finding = card.findings.find((f) => f.id === "unmapped-dx");
    expect(finding?.severity).toBe("low");
    expect(finding?.detail).toMatch(/Rare orphan syndrome/);
    // A real diagnostic line exists, so the high "no diagnosis" gap must not fire.
    expect(card.findings.some((f) => f.id === "no-diagnosis")).toBe(false);
  });

  it("excludes historical 'history of' problems from billing and flags", () => {
    const hx: PatientContext = {
      patient: ctx.patient,
      medications: [],
      problems: [
        { name: "History of cardiac arrest (situation)", ref: "Condition/hx" },
      ],
      observations: [],
    };
    const card = buildBilling(hx);
    expect(card.lines.some((l) => l.kind === "diagnostic")).toBe(false);
    expect(card.findings.some((f) => f.id === "unmapped-dx")).toBe(false);
    // The historical problem is not surfaced as something to hand-code.
    const refs = card.findings.flatMap((f) => f.refs ?? []);
    expect(refs).not.toContain("Condition/hx");
  });
});
