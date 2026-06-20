// Assembles the minimal, single-patient context handed to the LLM gateway and
// the deterministic tool layer. Synthetic data today; the design doc's
// de-identification seam slots in here before this leaves the browser when PHI
// is switched on.

import type { MedView, PatientView } from "./types";

export interface ContextMedication {
  /** Stable citation reference, e.g. "MedicationRequest/lisinopril-10". */
  ref: string;
  name: string;
  sig: string;
  indication: string | null;
  status: string;
  since: string;
}

export interface ContextProblem {
  name: string;
  ref: string;
}

export interface ContextObservation {
  /** LOINC (or local) code used for trend queries. */
  code?: string;
  label: string;
  value: number;
  unit: string;
  date: string;
  ref: string;
}

export interface PatientContext {
  patient: { name: string; sexAge: string; dob: string; mrn: string };
  medications: ContextMedication[];
  problems: ContextProblem[];
  observations: ContextObservation[];
}

export function buildPatientContext(
  patient: PatientView,
  meds: MedView[],
  problems: ContextProblem[] = [],
  observations: ContextObservation[] = [],
): PatientContext {
  return {
    patient: {
      name: patient.name,
      sexAge: patient.sexAge,
      dob: patient.dob,
      mrn: patient.mrn,
    },
    medications: meds.map((m) => ({
      ref: `MedicationRequest/${m.id}`,
      name: m.name,
      sig: m.sig,
      indication: m.indication,
      status: m.status,
      since: m.since,
    })),
    problems,
    observations,
  };
}
