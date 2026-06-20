// Minimal FHIR R4 shapes + view models used across the console.

export interface FhirCoding {
  system?: string;
  code?: string;
  display?: string;
}

export interface FhirCodeableConcept {
  text?: string;
  coding?: FhirCoding[];
}

export interface FhirHumanName {
  family?: string;
  given?: string[];
}

export interface FhirIdentifier {
  system?: string;
  value?: string;
  type?: FhirCodeableConcept;
}

export interface Patient {
  resourceType?: "Patient";
  id?: string;
  name?: FhirHumanName[];
  gender?: string;
  birthDate?: string;
  identifier?: FhirIdentifier[];
}

export interface Dosage {
  text?: string;
}

export interface MedicationRequest {
  resourceType?: "MedicationRequest";
  id?: string;
  status?: string;
  intent?: string;
  authoredOn?: string;
  medicationCodeableConcept?: FhirCodeableConcept;
  medicationReference?: { display?: string; reference?: string };
  dosageInstruction?: Dosage[];
  reasonCode?: FhirCodeableConcept[];
  subject?: { reference?: string };
}

export interface Condition {
  resourceType?: "Condition";
  id?: string;
  code?: FhirCodeableConcept;
  clinicalStatus?: FhirCodeableConcept;
}

export interface Observation {
  resourceType?: "Observation";
  id?: string;
  code?: FhirCodeableConcept;
  valueQuantity?: { value?: number; unit?: string };
  effectiveDateTime?: string;
  category?: FhirCodeableConcept[];
}

export interface Bundle<T> {
  resourceType?: "Bundle";
  entry?: { resource: T }[];
}

// ---- View models (what components render) ----

export interface MedView {
  id: string;
  name: string;
  sig: string;
  indication: string | null;
  status: string;
  since: string; // YYYY-MM-DD or ""
}

export interface PatientView {
  id: string;
  name: string;
  initials: string;
  sexAge: string; // e.g. "68 F"
  dob: string;
  mrn: string;
}
