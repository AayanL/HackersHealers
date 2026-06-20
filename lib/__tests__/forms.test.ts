import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildForm } from "@/lib/forms";
import { buildPatientContext } from "@/lib/grounding";
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

describe("buildForm", () => {
  it("prefills patient identity from the chart for a sick note", () => {
    const card = buildForm(ctx, "sick-note");
    expect(card.title).toMatch(/sick/i);
    const name = card.fields.find((f) => f.key === "name");
    const seen = card.fields.find((f) => f.key === "seen");
    expect(name?.value).toBe("Jane Doe");
    // "Date seen" = the most recent dated observation.
    expect(seen?.value).toBe("2026-06-10");
    expect(card.body).toContain("Jane Doe");
  });

  it("omits the diagnosis from a plain sick note (minimum necessary)", () => {
    const card = buildForm(ctx, "sick-note");
    expect(card.disclosureNote).toMatch(/minimum necessary/i);
    expect(card.body.toLowerCase()).not.toContain("hypertension");
  });

  it("lists the clinician-to-complete fields as a completeness check", () => {
    const card = buildForm(ctx, "sick-note");
    expect(card.toComplete).toEqual(
      expect.arrayContaining(["Absence from", "Absence to"]),
    );
    // A prefilled field is not listed as outstanding.
    expect(card.toComplete).not.toContain("Patient");
  });

  it("includes and cites the charted condition on an attestation", () => {
    const card = buildForm(ctx, "attestation");
    const condition = card.fields.find((f) => f.key === "condition");
    expect(condition?.value).toBe("Essential hypertension");
    expect(condition?.ref).toBe("Condition/I10");
    expect(card.body).toContain("Essential hypertension");
  });

  it("falls back to the sick note for an unknown template id", () => {
    const card = buildForm(ctx, "nonsense");
    expect(card.template).toBe("sick-note");
  });
});
