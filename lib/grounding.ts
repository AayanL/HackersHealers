// Assembles the minimal, single-patient context handed to the LLM gateway.
// Synthetic data today; the design doc's de-identification seam slots in here
// before this leaves the browser when PHI is switched on.

import type { MedView, PatientView } from "./types";

export interface PatientContext {
  patient: { name: string; sexAge: string; dob: string; mrn: string };
  medications: {
    name: string;
    sig: string;
    indication: string | null;
    status: string;
    since: string;
  }[];
}

export function buildPatientContext(
  patient: PatientView,
  meds: MedView[],
): PatientContext {
  return {
    patient: {
      name: patient.name,
      sexAge: patient.sexAge,
      dob: patient.dob,
      mrn: patient.mrn,
    },
    medications: meds.map((m) => ({
      name: m.name,
      sig: m.sig,
      indication: m.indication,
      status: m.status,
      since: m.since,
    })),
  };
}
