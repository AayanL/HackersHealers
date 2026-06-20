import { describe, expect, it } from "vitest";
import { type CardData, SEED_CONVERSATION } from "@/lib/assistant";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import { resourceIndex } from "@/lib/resources";
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
const index = resourceIndex(ctx);

function cardRefs(card: CardData): string[] {
  switch (card.kind) {
    case "reconcile":
      return card.findings.flatMap((f) => f.meds);
    case "trend":
      return card.points.map((p) => p.ref);
    case "guideline":
      return card.sourceCondition ? [card.sourceCondition] : [];
    case "summary":
    case "note":
      return card.citations ?? [];
    case "billing":
      return [
        ...card.lines.flatMap((l) => (l.ref ? [l.ref] : [])),
        ...card.findings.flatMap((f) => f.refs ?? []),
      ];
    case "form":
      return card.fields.flatMap((f) => (f.ref ? [f.ref] : []));
    case "draftOrder":
      return [];
  }
}

describe("SEED_CONVERSATION citations", () => {
  it("every cited or clickable ref resolves in the demo resource index", () => {
    const refs = new Set<string>();
    for (const m of SEED_CONVERSATION) {
      (m.citations ?? []).forEach((r) => refs.add(r));
      if (m.card) cardRefs(m.card).forEach((r) => refs.add(r));
    }
    const missing = [...refs].filter((r) => !(r in index));
    expect(missing).toEqual([]);
    // Sanity: the transcript actually exercises several references.
    expect(refs.size).toBeGreaterThan(5);
  });
});
