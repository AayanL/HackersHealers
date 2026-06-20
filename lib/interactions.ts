// Curated drug–drug interaction screen (Phase-1 scope per the design doc: a
// small, transparent rule set — NOT a licensed full DDI database, which is a
// Phase-2/3 terminology-service concern). Pure and deterministic so the model
// can never invent an interaction; it only narrates what these rules emit.

import type { ReconcileCardData, ReconcileFinding } from "./assistant";
import { activeMeds } from "./clinical";
import type { PatientContext } from "./grounding";

type Tag =
  | "ace"
  | "arb"
  | "ccb-dihydro"
  | "statin"
  | "nitrate"
  | "pde5"
  | "warfarin"
  | "nsaid"
  | "aspirin"
  | "k-sparing"
  | "amiodarone";

const TAGS: { tag: Tag; match: RegExp }[] = [
  { tag: "ace", match: /lisinopril|enalapril|ramipril|benazepril|captopril|perindopril/ },
  { tag: "arb", match: /losartan|valsartan|olmesartan|irbesartan|candesartan|telmisartan/ },
  { tag: "ccb-dihydro", match: /amlodipine|nifedipine|felodipine|nicardipine/ },
  { tag: "statin", match: /atorvastatin|simvastatin|lovastatin|rosuvastatin|pravastatin|pitavastatin/ },
  { tag: "nitrate", match: /nitroglycerin|isosorbide|nitrate/ },
  { tag: "pde5", match: /sildenafil|tadalafil|vardenafil|avanafil/ },
  { tag: "warfarin", match: /warfarin/ },
  { tag: "nsaid", match: /ibuprofen|naproxen|diclofenac|ketorolac|indomethacin|celecoxib|meloxicam/ },
  { tag: "aspirin", match: /aspirin|acetylsalicylic/ },
  { tag: "k-sparing", match: /spironolactone|eplerenone|amiloride|triamterene/ },
  { tag: "amiodarone", match: /amiodarone/ },
];

function tagsOf(name: string): Tag[] {
  const lower = name.toLowerCase();
  return TAGS.filter((t) => t.match.test(lower)).map((t) => t.tag);
}

interface Rule {
  a: Tag;
  b: Tag;
  severity: ReconcileFinding["severity"];
  title: string;
  detail: string;
}

const RULES: Rule[] = [
  { a: "ace", b: "k-sparing", severity: "high", title: "ACE inhibitor + potassium-sparing diuretic", detail: "Additive hyperkalemia risk — monitor serum potassium and renal function." },
  { a: "arb", b: "k-sparing", severity: "high", title: "ARB + potassium-sparing diuretic", detail: "Additive hyperkalemia risk — monitor serum potassium and renal function." },
  { a: "ace", b: "nsaid", severity: "moderate", title: "ACE inhibitor + NSAID", detail: "Reduced renal perfusion and blunted antihypertensive effect; worse with a diuretic ('triple whammy')." },
  { a: "arb", b: "nsaid", severity: "moderate", title: "ARB + NSAID", detail: "Reduced renal perfusion and blunted antihypertensive effect." },
  { a: "statin", b: "ccb-dihydro", severity: "moderate", title: "Statin + dihydropyridine calcium-channel blocker", detail: "Amlodipine raises statin exposure (CYP3A4); observe statin dose limits / myopathy risk." },
  { a: "statin", b: "amiodarone", severity: "moderate", title: "Statin + amiodarone", detail: "Increased myopathy / rhabdomyolysis risk; limit statin dose." },
  { a: "nitrate", b: "pde5", severity: "high", title: "Nitrate + PDE5 inhibitor", detail: "Risk of profound hypotension — combination is contraindicated." },
  { a: "warfarin", b: "nsaid", severity: "high", title: "Warfarin + NSAID", detail: "Markedly increased GI bleeding risk." },
  { a: "warfarin", b: "aspirin", severity: "high", title: "Warfarin + aspirin", detail: "Increased bleeding risk; combine only for a specific indication." },
  { a: "warfarin", b: "amiodarone", severity: "high", title: "Warfarin + amiodarone", detail: "Amiodarone raises INR — reduce warfarin dose and monitor closely." },
];

/** Pairwise interaction findings across the patient's ACTIVE medications. */
export function checkInteractions(ctx: PatientContext): ReconcileFinding[] {
  const tagged = activeMeds(ctx).map((m) => ({ m, tags: tagsOf(m.name) }));
  const findings: ReconcileFinding[] = [];
  const seen = new Set<string>();

  for (const rule of RULES) {
    const as = tagged.filter((t) => t.tags.includes(rule.a));
    const bs = tagged.filter((t) => t.tags.includes(rule.b));
    for (const am of as) {
      for (const bm of bs) {
        if (am.m.ref === bm.m.ref) continue;
        const pair = [am.m.ref, bm.m.ref].sort().join("|");
        const key = `${rule.title}::${pair}`;
        if (seen.has(key)) continue;
        seen.add(key);
        findings.push({
          id: `int-${rule.a}-${rule.b}-${pair}`,
          type: "interaction",
          severity: rule.severity,
          title: rule.title,
          detail: `${am.m.name} + ${bm.m.name}: ${rule.detail}`,
          meds: [am.m.ref, bm.m.ref],
          source: "curated-ddi@2025.1",
        });
      }
    }
  }
  return findings;
}

/** A reconciliation-style card scoped to interactions, for the dedicated tool. */
export function buildInteractions(ctx: PatientContext): ReconcileCardData {
  const findings = checkInteractions(ctx);
  return {
    kind: "reconcile",
    findings,
    coverageGaps: [
      findings.length
        ? "Curated interaction subset — not a full licensed DDI database."
        : "No interactions found in the curated subset (not a full licensed DDI database).",
    ],
  };
}
