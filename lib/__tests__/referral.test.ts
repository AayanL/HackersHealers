import { describe, expect, it } from "vitest";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext, type PatientContext } from "@/lib/grounding";
import { buildReferral } from "@/lib/referral";
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

function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
}

describe("buildReferral", () => {
  it("infers cardiology from the charted hypertension and looks up specialists", () => {
    const card = buildReferral(ctx);
    expect(card.specialty).toBe("Cardiology");
    expect(card.candidates.length).toBeGreaterThan(0);
    // The first candidate is the auto-selected destination.
    expect(card.candidates[0].selected).toBe(true);
    expect(card.candidates[0].name).toBeTruthy();
    expect(card.candidates[0].clinic).toBeTruthy();
    // Reason is cited to its Condition.
    const reason = card.fields.find((f) => f.key === "reason");
    expect(reason?.value).toBe("Essential hypertension");
    expect(reason?.ref).toBe("Condition/I10");
    expect(card.reasonRef).toBe("Condition/I10");
  });

  it("honors an explicit specialty hint and cites the matching problem", () => {
    const card = buildReferral(ctx, "endocrinology");
    expect(card.specialty).toBe("Endocrinology");
    // For an endocrine referral, the relevant charted problem is hyperlipidemia.
    expect(card.reasonRef).toBe("Condition/E78.5");
  });

  it("prefills identity + meds and leaves referrer/urgency/question to complete", () => {
    const card = buildReferral(ctx);
    const patient = card.fields.find((f) => f.key === "patient");
    const meds = card.fields.find((f) => f.key === "medications");
    expect(patient?.value).toBe("Jane Doe");
    expect(meds?.value).toContain("Lisinopril 10 mg");
    expect(card.toComplete).toEqual(
      expect.arrayContaining([
        "Referring provider",
        "Urgency",
        "Clinical question",
      ]),
    );
    // A prefilled field is never listed as outstanding.
    expect(card.toComplete).not.toContain("Patient");
  });

  it("flags required attachments missing from the chart (completeness gate)", () => {
    const card = buildReferral(ctx);
    // One present, cited bloodwork attachment...
    const present = card.attachments.find((a) => a.present);
    expect(present?.ref).toBeTruthy();
    // ...and the cardiology-required ECG is absent from the seed chart.
    const ecg = card.attachments.find((a) => /ecg/i.test(a.label));
    expect(ecg?.present).toBe(false);
    expect(card.toComplete).toContain("Recent ECG");
  });

  it("proposes weekday appointment times in the future, never booked", () => {
    const card = buildReferral(ctx);
    expect(card.slots).toHaveLength(3);
    for (const s of card.slots) {
      expect(s.date > "2026-06-10").toBe(true); // after the last visit
      expect(isWeekend(s.date)).toBe(false);
    }
    expect(card.disclosureNote).toMatch(/not sent/i);
    expect(card.disclosureNote).toMatch(/not booked/i);
  });

  it("falls back to general internal medicine and to-completes the date when no chart anchor", () => {
    const emptyCtx: PatientContext = {
      patient: { name: "Test Patient", sexAge: "40F", dob: "1986-01-01", mrn: "x" },
      medications: [],
      problems: [],
      observations: [],
    };
    const card = buildReferral(emptyCtx);
    expect(card.specialty).toBe("General Internal Medicine");
    expect(card.reasonRef).toBeUndefined();
    expect(card.slots).toEqual([]);
    expect(card.toComplete).toContain(
      "Appointment date — scheduling office to confirm",
    );
  });
});
