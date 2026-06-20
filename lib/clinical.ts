// Pure clinical helpers shared by the tool layer (lib/tools.ts), the
// interaction engine (lib/interactions.ts), and the at-a-glance/scan builders
// (lib/glance.ts). Kept free of any server-only import (e.g. the AI SDK) so it
// is safe to pull into client components.

import type { ContextMedication, ContextObservation, PatientContext } from "./grounding";

/** Reference ranges keyed by LOINC code for the labs we evaluate. */
export const RANGES: Record<string, { low: number; high: number }> = {
  "2823-3": { low: 3.5, high: 5.1 }, // potassium
  "2951-2": { low: 135, high: 145 }, // sodium
  "2160-0": { low: 0.6, high: 1.3 }, // creatinine
  "4548-4": { low: 4, high: 5.7 }, // a1c
};

export function activeMeds(ctx: PatientContext): ContextMedication[] {
  return ctx.medications.filter((m) => m.status === "active");
}

/** Observations whose value falls outside the known reference range. */
export function flaggedLabs(ctx: PatientContext): ContextObservation[] {
  return ctx.observations.filter((o) => {
    const r = o.code ? RANGES[o.code] : undefined;
    return r ? o.value < r.low || o.value > r.high : false;
  });
}
