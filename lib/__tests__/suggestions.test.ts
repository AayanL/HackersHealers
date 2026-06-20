import { describe, expect, it } from "vitest";
import type { ChatMessage } from "../assistant";
import { buildPatientContext } from "../grounding";
import {
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
} from "../seed";
import { buildSuggestions } from "../suggestions";
import { mapMedications, patientView } from "../fhir";

const ctx = buildPatientContext(
  patientView(SEED_PATIENT),
  mapMedications(SEED_MEDICATIONS),
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
);

const user = (text: string): ChatMessage => ({ id: text, role: "user", text });

describe("buildSuggestions", () => {
  it("leads with the patient's salient chart findings on a fresh chat", () => {
    const out = buildSuggestions(ctx, []);
    // Jane Doe: dup/gap meds, a flagged potassium, and a metformin gap.
    expect(out).toContain("Reconcile the medications");
    expect(out).toContain("Show the Potassium trend");
    expect(out.length).toBeLessThanOrEqual(4);
  });

  it("surfaces the metformin coding gap (active med, no diabetes Dx)", () => {
    // Drop the flagged lab so lower-priority chips fit in the top 4.
    const noLabs = buildPatientContext(
      patientView(SEED_PATIENT),
      mapMedications(SEED_MEDICATIONS),
      SEED_PROBLEMS,
      [],
    );
    expect(buildSuggestions(noLabs, [])).toContain(
      "Codes & monitoring for metformin",
    );
  });

  it("retires a suggestion once the chat has covered it", () => {
    const reconciled = buildSuggestions(ctx, [user("Reconcile her meds.")]);
    expect(reconciled).not.toContain("Reconcile the medications");
  });

  it("retires a trend only for the same measure", () => {
    const out = buildSuggestions(ctx, [
      user("Show her potassium over the last year."),
    ]);
    expect(out).not.toContain("Show the Potassium trend");
  });

  it("never returns more than the cap, even with an empty chart", () => {
    const empty = buildPatientContext(patientView(SEED_PATIENT), [], [], []);
    const out = buildSuggestions(empty, []);
    expect(out.length).toBeGreaterThan(0);
    expect(out.length).toBeLessThanOrEqual(4);
  });
});
