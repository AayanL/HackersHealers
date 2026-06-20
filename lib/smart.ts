"use client";

// Client-only SMART-on-FHIR helpers. `fhirclient` touches window/sessionStorage,
// so it is imported lazily inside functions (never at module top) to keep it out
// of any server bundle.

import type { Bundle, MedicationRequest, Patient } from "./types";

/** Any client id works against the open SMART sandbox (launch.smarthealthit.org). */
export const SMART_CLIENT_ID = "vera_clinical_assistant";
export const SMART_SCOPE = "launch openid fhirUser patient/*.read";

export interface ChartData {
  patient: Patient;
  medications: MedicationRequest[];
}

/** Kick off the SMART App Launch authorize redirect (call from /launch). */
export async function smartAuthorize(redirectUri = "/"): Promise<void> {
  const FHIR = (await import("fhirclient")).default;
  await FHIR.oauth2.authorize({
    clientId: SMART_CLIENT_ID,
    scope: SMART_SCOPE,
    redirectUri,
  });
}

/** Complete the handshake and load the in-context patient + medications. */
export async function loadChart(): Promise<ChartData> {
  const FHIR = (await import("fhirclient")).default;
  const client = await FHIR.oauth2.ready();
  const patient = (await client.patient.read()) as Patient;
  const bundle = (await client.request(
    `MedicationRequest?patient=${client.patient.id}`,
  )) as Bundle<MedicationRequest>;
  const medications = (bundle.entry ?? []).map(
    (e) => e.resource as MedicationRequest,
  );
  return { patient, medications };
}
