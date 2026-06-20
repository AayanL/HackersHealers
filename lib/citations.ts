// Inline-citation helpers. citationLabels turns a resource ref into the human
// label shown in the chip (derived from the same resourceIndex that powers the
// reference drawer, so chip and drawer titles always agree); shortRef tidies an
// unresolved ref so a stray opaque id is at least visually contained.

import type { PatientContext } from "./grounding";
import { resourceIndex } from "./resources";

export function citationLabels(ctx: PatientContext): Record<string, string> {
  const index = resourceIndex(ctx);
  const map: Record<string, string> = {};
  for (const ref of Object.keys(index)) map[ref] = index[ref].title;
  return map;
}

/** Shorten an unresolved ref so a stray opaque id is at least visually contained. */
export function shortRef(ref: string): string {
  const slash = ref.indexOf("/");
  if (slash < 0) return ref;
  const type = ref.slice(0, slash);
  const id = ref.slice(slash + 1);
  return id.length > 10 ? `${type}/${id.slice(0, 8)}…` : ref;
}
