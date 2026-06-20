import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import {
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
} from "@/lib/seed";
import {
  buildGuideline,
  buildNote,
  buildReconcile,
  buildSummary,
  buildTrend,
  routeToCard,
} from "@/lib/tools";

const ctx = buildPatientContext(
  patientView(SEED_PATIENT),
  mapMedications(SEED_MEDICATIONS),
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
);

describe("buildReconcile", () => {
  it("flags an active med with no charted indication as a gap", () => {
    const card = buildReconcile(ctx);
    const gap = card.findings.find((f) => f.type === "gap");
    expect(gap).toBeDefined();
    expect(gap?.meds).toContain("MedicationRequest/metformin-500");
  });

  it("flags two same-class meds as a duplicate", () => {
    const card = buildReconcile(ctx);
    const dup = card.findings.find((f) => f.type === "duplicate");
    expect(dup?.meds).toEqual(
      expect.arrayContaining([
        "MedicationRequest/lisinopril-10",
        "MedicationRequest/amlodipine-5",
      ]),
    );
  });

  it("reports the renal coverage gap from the eGFR on file", () => {
    const card = buildReconcile(ctx);
    expect(card.coverageGaps?.[0]).toMatch(/eGFR 58/);
  });
});

describe("buildTrend", () => {
  it("builds a sorted, range-flagged potassium series with its query", () => {
    const card = buildTrend(ctx, "potassium");
    expect(card).not.toBeNull();
    expect(card?.points).toHaveLength(4);
    const last = card?.points[card.points.length - 1];
    expect(last?.value).toBe(5.3);
    expect(last?.flagged).toBe(true);
    expect(card?.referenceRange?.high).toBe(5.1);
    expect(card?.query).toContain("2823-3");
  });

  it("returns null when the measure has no results in the chart", () => {
    expect(buildTrend(ctx, "magnesium")).toBeNull();
  });
});

describe("buildGuideline", () => {
  it("suggests diabetes codes flagged for confirmation when metformin lacks a dx", () => {
    const card = buildGuideline(ctx);
    expect(card.codes?.map((c) => c.code)).toContain("E11.9");
    expect(card.codes?.[0].confidence).toMatch(/needs confirmation/);
    expect(card.unverifiedNote).toBeTruthy();
  });
});

describe("buildSummary / buildNote", () => {
  it("leaves the SBAR recommendation for the clinician and cites sources", () => {
    const card = buildSummary(ctx);
    expect(card.sbar.recommendation).toBe("[clinician to complete]");
    expect(card.citations?.length).toBeGreaterThan(0);
  });

  it("turns the med-without-indication gap into a documentation to-do", () => {
    const card = buildNote(ctx);
    expect(card.todos.some((t) => /Confirm indication for Metformin/i.test(t))).toBe(
      true,
    );
  });
});

describe("routeToCard", () => {
  const cases: [string, string | null][] = [
    ["Reconcile her meds.", "reconcile"],
    ["Show her potassium over the last year.", "trend"],
    ["Draft a repeat BMP for next week.", "draftOrder"],
    ["Summarize her for handoff.", "summary"],
    ["Draft a progress note for today.", "note"],
    ["What should I monitor on metformin, and suggest a code?", "guideline"],
    ["Why is she on lisinopril?", null],
  ];

  it.each(cases)("routes %j to the %s card", (text, kind) => {
    const result = routeToCard(text, ctx);
    if (kind === null) {
      expect(result).toBeNull();
    } else {
      expect(result?.card?.kind).toBe(kind);
    }
  });

  it("parses a draft order's title and collection window from intent", () => {
    const result = routeToCard("Draft a repeat BMP for next week.", ctx);
    expect(result?.card).toMatchObject({
      kind: "draftOrder",
      title: "Basic Metabolic Panel",
      fields: expect.arrayContaining([{ label: "Collect", value: "Next week" }]),
    });
  });
});
