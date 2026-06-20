// F11 — billing & coding assistant (Phase-1 synthetic slice).
//
// Pure + deterministic (no `ai` import), so the keyless router and the client
// can both run it. Per the design doc (docs/billing-referrals-forms-design.md):
// the model only *chooses* this capability; every code and fee is computed here
// from the chart, never typed by the model. This is a CURATED SYNTHETIC subset —
// illustrative codes/fees, not a real fee schedule — and VERA never submits a
// claim; the card is advisory and confirm-before-billing.

import type {
  BillingCardData,
  BillingFinding,
  BillingLine,
} from "./assistant";
import type { ContextObservation, ContextProblem, PatientContext } from "./grounding";

interface DxRule {
  match: RegExp;
  code: string;
  display: string;
}

// 3-digit ICD-9-style diagnostic codes (the shape OHIP's diagnostic set uses,
// distinct from F7's ICD-10/SNOMED clinical codes). Synthetic — confirm.
const DX_RULES: DxRule[] = [
  { match: /hypertension/, code: "401", display: "Hypertension" },
  { match: /hyperlipidemia|lipid|cholesterol/, code: "272", display: "Disorder of lipid metabolism" },
  { match: /diabet/, code: "250", display: "Diabetes mellitus" },
  { match: /osteoarthr|arthr/, code: "715", display: "Osteoarthrosis" },
  { match: /asthma|copd|respirat/, code: "493", display: "Asthma / reactive airway disease" },
  { match: /depress|anxiety|mood/, code: "311", display: "Depressive / mood disorder" },
];

interface ServiceCode {
  code: string;
  display: string;
  fee: number;
}

// Illustrative A-/G-prefix service codes + fees. Synthetic — confirm.
const ASSESSMENT: ServiceCode = {
  code: "A007",
  display: "Intermediate assessment (office visit)",
  fee: 37.95,
};
const SPECIMEN_COLLECTION: ServiceCode = {
  code: "G482",
  display: "Specimen collection / venipuncture",
  fee: 5.0,
};

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function dxFor(p: ContextProblem): DxRule | null {
  const lower = p.name.toLowerCase();
  return DX_RULES.find((r) => r.match.test(lower)) ?? null;
}

// Bloodwork = a coded lab observation that involves a collected specimen.
// eGFR is calculated from creatinine, not collected, so it is excluded.
function isBloodwork(o: ContextObservation): boolean {
  return !!o.code && !/egfr|gfr/i.test(o.label);
}

export function buildBilling(ctx: PatientContext): BillingCardData {
  const lines: BillingLine[] = [];
  const findings: BillingFinding[] = [];
  let serviceTotal = 0;

  // Service line — the visit itself.
  lines.push({
    id: "svc-assessment",
    kind: "service",
    code: ASSESSMENT.code,
    display: ASSESSMENT.display,
    fee: money(ASSESSMENT.fee),
    basis: "Office visit / encounter",
    note: "synthetic schedule — confirm",
  });
  serviceTotal += ASSESSMENT.fee;

  // Diagnostic lines from the charted problems (each cited to its Condition).
  for (const p of ctx.problems) {
    const dx = dxFor(p);
    if (dx) {
      lines.push({
        id: `dx-${p.ref}`,
        kind: "diagnostic",
        code: dx.code,
        display: dx.display,
        basis: p.name,
        ref: p.ref,
        note: "OHIP-style 3-digit (synthetic) — confirm",
      });
    } else {
      findings.push({
        id: `nodx-${p.ref}`,
        severity: "low",
        title: `No billing diagnostic code mapped for "${p.name}"`,
        detail:
          "Charted problem has no entry in the curated synthetic set — code it by hand.",
        refs: [p.ref],
      });
    }
  }

  // Missing-code catch: bloodwork on file → the physician may bill the specimen
  // COLLECTION fee only if they personally collected it; the licensed lab bills
  // the assays, so an assay fee must never go on the physician's claim.
  const labRefs = ctx.observations
    .filter(isBloodwork)
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date)) // most recent collection first
    .map((o) => o.ref);
  if (labRefs.length > 0) {
    findings.push({
      id: "specimen-collection",
      severity: "moderate",
      title: "Bloodwork on file — specimen-collection fee may be missing",
      detail: `If you personally collected the specimen, a collection fee (${SPECIMEN_COLLECTION.code}, ${money(
        SPECIMEN_COLLECTION.fee,
      )}) may be billable. The lab bills the assays — do not add an assay fee to your claim.`,
      refs: labRefs.slice(0, 3),
    });
  }

  // A service code needs a paired diagnostic code.
  if (!lines.some((l) => l.kind === "diagnostic")) {
    findings.push({
      id: "no-diagnosis",
      severity: "high",
      title: "No diagnostic code on the claim",
      detail:
        "A service code needs a paired diagnostic code — add one before submitting.",
    });
  }

  return {
    kind: "billing",
    lines,
    findings,
    total: money(serviceTotal),
    coverageNote:
      "Curated synthetic fee subset — illustrative codes/fees, NOT a real fee schedule. Confirm every code and submit in your billing system; VERA does not submit claims.",
  };
}
