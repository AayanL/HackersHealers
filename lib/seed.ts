// Synthetic seed patient used for demo mode (no live SMART session) and tests.
// Mirrors the "Jane Doe" chart from the AI Clinical Assistant design comp.
// Stored as FHIR resources so the same lib/fhir.ts mappers apply.

import type { MedicationRequest, Patient } from "./types";

export const SEED_PATIENT: Patient = {
  resourceType: "Patient",
  id: "jane-doe",
  name: [{ given: ["Jane"], family: "Doe" }],
  gender: "female",
  birthDate: "1958-03-11",
  identifier: [
    { type: { text: "MRN", coding: [{ code: "MR" }] }, value: "00417-829" },
  ],
};

function med(
  id: string,
  name: string,
  sig: string,
  indication: string | null,
  authoredOn: string,
): MedicationRequest {
  return {
    resourceType: "MedicationRequest",
    id,
    status: "active",
    intent: "order",
    authoredOn,
    medicationCodeableConcept: { text: name },
    dosageInstruction: [{ text: sig }],
    reasonCode: indication ? [{ text: indication }] : undefined,
    subject: { reference: "Patient/jane-doe" },
  };
}

export const SEED_MEDICATIONS: MedicationRequest[] = [
  med("lisinopril-10", "Lisinopril 10 mg", "1 tab PO daily", "Hypertension", "2026-04-02"),
  med("amlodipine-5", "Amlodipine 5 mg", "1 tab PO daily", "Hypertension", "2026-01-15"),
  med("metformin-500", "Metformin 500 mg", "1 tab PO BID", null, "2025-11-10"),
  med("atorvastatin-20", "Atorvastatin 20 mg", "1 tab PO QHS", "Hyperlipidemia", "2025-08-09"),
  med("aspirin-81", "Aspirin 81 mg", "1 tab PO daily", "Cardioprotection", "2025-08-09"),
];

export const SEED_ALLERGIES = ["Penicillin (rash)"];
export const SEED_CODE_STATUS = "Full code";
