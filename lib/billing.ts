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
// distinct from F7's ICD-10/SNOMED clinical codes). Matched against the charted
// problem's display text (Synthea/SMART servers send SNOMED display strings).
// Broad enough to cover common primary-care problems; everything is synthetic —
// confirm. Order matters: more specific patterns first.
const DX_RULES: DxRule[] = [
  // Cardiovascular
  { match: /coronary|ischemic heart|ischaemic heart|\bcad\b/, code: "414", display: "Chronic ischemic heart disease" },
  { match: /myocardial infarction|heart attack|\bstemi\b|\bnstemi\b/, code: "410", display: "Acute myocardial infarction" },
  { match: /cardiac arrest/, code: "427", display: "Cardiac dysrhythmia / arrest" },
  { match: /atrial fibrillation|\bafib\b|arrhythmia|dysrhythmia|palpitation/, code: "427", display: "Cardiac dysrhythmia" },
  { match: /heart failure|\bchf\b|congestive/, code: "428", display: "Heart failure" },
  { match: /hypertension|high blood pressure/, code: "401", display: "Hypertension" },
  { match: /hyperlipidemia|hyperlipidaemia|lipid|cholesterol|dyslipid/, code: "272", display: "Disorder of lipid metabolism" },
  { match: /stroke|cerebrovascular|\bcva\b|\btia\b|transient ischemic/, code: "436", display: "Acute cerebrovascular disease" },
  // Endocrine / metabolic
  { match: /diabet/, code: "250", display: "Diabetes mellitus" },
  { match: /obesity|overweight/, code: "278", display: "Overweight / obesity" },
  { match: /hypothyroid/, code: "244", display: "Hypothyroidism" },
  // Respiratory
  { match: /sinusitis/, code: "461", display: "Acute sinusitis" },
  { match: /bronchitis/, code: "466", display: "Acute bronchitis" },
  { match: /pneumonia/, code: "486", display: "Pneumonia" },
  { match: /asthma|reactive airway/, code: "493", display: "Asthma" },
  { match: /copd|emphysema|chronic obstructive/, code: "496", display: "Chronic airway obstruction" },
  { match: /pharyngitis|sore throat|tonsillitis/, code: "462", display: "Acute pharyngitis" },
  { match: /upper respiratory|\buri\b|common cold|nasopharyngitis/, code: "465", display: "Upper respiratory infection" },
  { match: /influenza|\bflu\b/, code: "487", display: "Influenza" },
  { match: /allergic rhinitis|hay fever/, code: "477", display: "Allergic rhinitis" },
  // GI / GU / renal
  { match: /gerd|reflux|gastro-?esophageal|gastro-?oesophageal/, code: "530", display: "Esophageal disorder (GERD)" },
  { match: /urinary tract infection|\buti\b|cystitis/, code: "599", display: "Urinary tract infection" },
  { match: /chronic kidney|\bckd\b|renal failure|renal insufficiency/, code: "585", display: "Chronic kidney disease" },
  // MSK / neuro / psych / other
  { match: /osteoarthr|\boa\b|arthritis|arthrosis/, code: "715", display: "Osteoarthrosis" },
  { match: /low back pain|back pain|lumbago/, code: "724", display: "Back disorder / pain" },
  { match: /migraine/, code: "346", display: "Migraine" },
  { match: /headache|cephalgia/, code: "784", display: "Headache" },
  { match: /depress|mood disorder/, code: "311", display: "Depressive disorder" },
  { match: /anxiety|panic/, code: "300", display: "Anxiety disorder" },
  { match: /anemia|anaemia/, code: "285", display: "Anemia" },
  { match: /otitis/, code: "382", display: "Otitis media" },
  { match: /conjunctivitis/, code: "372", display: "Conjunctivitis" },
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

// A "history of …" problem is a past event, not today's billable diagnosis.
function isHistorical(p: ContextProblem): boolean {
  return /\bhistory of\b|\bh\/o\b|\bpast (history|medical)\b/i.test(p.name);
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

  // Diagnostic lines from the *billable* problems (historicals excluded), each
  // cited to its Condition and de-duped by code so two problems that map to the
  // same code don't double-list.
  const billable = ctx.problems.filter((p) => !isHistorical(p));
  const seen = new Set<string>();
  const unmapped: ContextProblem[] = [];
  for (const p of billable) {
    const dx = dxFor(p);
    if (!dx) {
      unmapped.push(p);
      continue;
    }
    if (seen.has(dx.code)) continue;
    seen.add(dx.code);
    lines.push({
      id: `dx-${dx.code}`,
      kind: "diagnostic",
      code: dx.code,
      display: dx.display,
      basis: p.name,
      ref: p.ref,
      note: "OHIP-style 3-digit (synthetic) — confirm",
    });
  }

  const hasDx = lines.some((l) => l.kind === "diagnostic");
  if (!hasDx) {
    // No diagnostic line at all — the load-bearing "this claim will bounce" flag.
    findings.push({
      id: "no-diagnosis",
      severity: "high",
      title: "No diagnostic code on the claim",
      detail: billable.length
        ? `A service code needs a paired diagnostic code — hand-code from the charted problems: ${billable
            .map((p) => p.name)
            .join("; ")}.`
        : "A service code needs a paired diagnostic code — add the visit reason before submitting.",
      refs: billable.map((p) => p.ref).slice(0, 6),
    });
  } else if (unmapped.length > 0) {
    // Some mapped, some not — ONE consolidated advisory, not one-per-problem.
    findings.push({
      id: "unmapped-dx",
      severity: "low",
      title: `${unmapped.length} charted problem${
        unmapped.length === 1 ? "" : "s"
      } not in the curated code set`,
      detail: `Hand-code these: ${unmapped.map((p) => p.name).join("; ")}.`,
      refs: unmapped.map((p) => p.ref).slice(0, 6),
    });
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

  return {
    kind: "billing",
    lines,
    findings,
    total: money(serviceTotal),
    coverageNote:
      "Curated synthetic fee subset — illustrative codes/fees, NOT a real fee schedule. Confirm every code and submit in your billing system; VERA does not submit claims.",
  };
}
