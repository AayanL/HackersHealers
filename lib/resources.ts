// Builds a lookup from a FHIR resource reference (the model's citation token,
// e.g. "MedicationRequest/55b5db91") to a displayable "reference item" — a
// title plus the parsed fields we hold in the grounded context. Powers both the
// inline citation chips and the click-through reference drawer.

import type { PatientContext } from "./grounding";

export interface ResourceDetail {
  ref: string;
  type: string;
  title: string;
  fields: { label: string; value: string }[];
}

export function resourceIndex(
  ctx: PatientContext,
): Record<string, ResourceDetail> {
  const index: Record<string, ResourceDetail> = {};

  for (const m of ctx.medications) {
    index[m.ref] = {
      ref: m.ref,
      type: "MedicationRequest",
      title: m.name,
      fields: [
        ...(m.sig ? [{ label: "Dosage", value: m.sig }] : []),
        { label: "Indication", value: m.indication ?? "— none charted" },
        { label: "Status", value: m.status },
        ...(m.since ? [{ label: "Since", value: m.since }] : []),
      ],
    };
  }

  for (const p of ctx.problems) {
    index[p.ref] = {
      ref: p.ref,
      type: "Condition",
      title: p.name,
      fields: [{ label: "Problem", value: p.name }],
    };
  }

  for (const o of ctx.observations) {
    const value = `${o.value}${o.unit ? ` ${o.unit}` : ""}`;
    index[o.ref] = {
      ref: o.ref,
      type: "Observation",
      title: `${o.label} ${value}`.trim(),
      fields: [
        { label: "Value", value },
        ...(o.date ? [{ label: "Date", value: o.date }] : []),
        ...(o.code ? [{ label: "Code", value: o.code }] : []),
      ],
    };
  }

  return index;
}

/** Minimal detail for a ref the loaded context doesn't know about. */
export function unknownResource(ref: string): ResourceDetail {
  const slash = ref.indexOf("/");
  const type = slash > 0 ? ref.slice(0, slash) : "Resource";
  return {
    ref,
    type,
    title: ref,
    fields: [
      { label: "Note", value: "Not in the loaded chart context for this patient." },
    ],
  };
}
