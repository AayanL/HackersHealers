"use client";

// Client-only SMART-on-FHIR helpers. `fhirclient` touches window/sessionStorage,
// so it is imported lazily inside functions (never at module top) to keep it out
// of any server bundle.

import { mapImmunizations, mapProcedures } from "./fhir";
import type {
  ContextImmunization,
  ContextObservation,
  ContextProblem,
  ContextProcedure,
} from "./grounding";
import type {
  Bundle,
  Condition,
  Immunization,
  MedicationRequest,
  Observation,
  Patient,
  Procedure,
} from "./types";

/** Any client id works against the open SMART sandbox (launch.smarthealthit.org). */
export const SMART_CLIENT_ID = "vera_clinical_assistant";
export const SMART_SCOPE = "launch openid fhirUser patient/*.read";

export interface ChartData {
  patient: Patient;
  medications: MedicationRequest[];
  problems: ContextProblem[];
  observations: ContextObservation[];
  immunizations: ContextImmunization[];
  procedures: ContextProcedure[];
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

function conceptText(c: Condition["code"]): string {
  return c?.text ?? c?.coding?.[0]?.display ?? c?.coding?.[0]?.code ?? "Problem";
}

function toContextProblem(c: Condition): ContextProblem | null {
  if (!c.id) return null; // no id → can't be a stable citation target
  return { name: conceptText(c.code), ref: `Condition/${c.id}` };
}

function toContextObservation(o: Observation): ContextObservation | null {
  if (!o.id) return null;
  const value = o.valueQuantity?.value;
  if (typeof value !== "number") return null; // skip non-numeric (e.g. panels)
  return {
    code: o.code?.coding?.[0]?.code,
    label: o.code?.text ?? o.code?.coding?.[0]?.display ?? "Result",
    value,
    unit: o.valueQuantity?.unit ?? "",
    date: (o.effectiveDateTime ?? "").slice(0, 10),
    ref: `Observation/${o.id ?? ""}`,
  };
}

/** Complete the handshake and load the in-context patient + chart slices. */
export async function loadChart(): Promise<ChartData> {
  const FHIR = (await import("fhirclient")).default;
  const client = await FHIR.oauth2.ready();
  const patient = (await client.patient.read()) as Patient;
  const id = client.patient.id;

  const bundle = (await client.request(
    `MedicationRequest?patient=${id}`,
  )) as Bundle<MedicationRequest>;
  const medications = (bundle.entry ?? []).map(
    (e) => e.resource as MedicationRequest,
  );

  // Problems + labs are best-effort: a sandbox patient may not have them, and a
  // missing slice should degrade gracefully (empty), never break the launch.
  let problems: ContextProblem[] = [];
  try {
    const cb = (await client.request(
      `Condition?patient=${id}`,
    )) as Bundle<Condition>;
    problems = (cb.entry ?? [])
      .map((e) => toContextProblem(e.resource))
      .filter((p): p is ContextProblem => p !== null);
  } catch {
    problems = [];
  }

  let observations: ContextObservation[] = [];
  try {
    const ob = (await client.request(
      `Observation?patient=${id}&category=laboratory`,
    )) as Bundle<Observation>;
    observations = (ob.entry ?? [])
      .map((e) => toContextObservation(e.resource))
      .filter((o): o is ContextObservation => o !== null);
  } catch {
    observations = [];
  }

  // Immunizations + procedures power the F15/F16 preventive engine; also
  // best-effort — many sandboxes lack these resources, so a miss degrades to
  // empty (engine then reports everything as due/missing) rather than breaking.
  let immunizations: ContextImmunization[] = [];
  try {
    const ib = (await client.request(
      `Immunization?patient=${id}`,
    )) as Bundle<Immunization>;
    immunizations = mapImmunizations(ib);
  } catch {
    immunizations = [];
  }

  let procedures: ContextProcedure[] = [];
  try {
    const pb = (await client.request(
      `Procedure?patient=${id}`,
    )) as Bundle<Procedure>;
    procedures = mapProcedures(pb);
  } catch {
    procedures = [];
  }

  return { patient, medications, problems, observations, immunizations, procedures };
}
