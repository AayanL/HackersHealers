// F15 / F16 — preventive care: immunization status + screening gaps.
//
// Pure + deterministic (no `ai` import, takes an optional `today` so tests are
// stable — same pattern as `ageFromDob(birthDate, today?)`), so it runs over the
// in-context patient in the browser like F8 / glance. The clinical knowledge is a
// curated, transparent rule table — same spirit as `RANGES` in lib/clinical.ts —
// and is swappable for a guideline service in Phase 2.
//
// Guidelines are CANADIAN (CTFPHC for screening, NACI/PHAC for immunization),
// matching the repo's context (Ocean eReferral in F12, "batch file to ministry"
// billing in F11). Read-only derivation: nothing auto-orders.
//
// The prostate trap: under CTFPHC, routine PSA-based prostate screening is
// recommended *against* (shared decision-making in 55–69). A naive "every man
// over X needs a prostate test" checklist would nag the clinician to order
// something the national guideline advises NOT to do. So such rules carry a
// `direction` and are NEVER surfaced as an overdue/missing gap. This is the whole
// safety argument for a curated, cited table over a heuristic checklist.

import type { HealthMaintenanceItem } from "./assistant";
import { ageFromDob } from "./fhir";
import type {
  ContextImmunization,
  ContextProcedure,
  PatientContext,
} from "./grounding";

type Sex = "male" | "female";

interface PreventiveRule {
  id: string; // "breast", "pneumococcal"
  kind: "immunization" | "screening";
  label: string; // "Mammography (breast cancer screening)"
  sex?: Sex; // omit = any sex
  minAge?: number;
  maxAge?: number;
  /** Recommended cadence in months; omit = one-time / series. */
  intervalMonths?: number;
  direction: "recommend" | "shared-decision" | "recommend-against";
  /** Matches a chart item's label (lowercased). */
  match: RegExp;
  source: string; // citable guideline tag
}

// A small, curated adult catalog (Phase 1 is age + sex only — risk-based rules
// like AAA/lung screening are Phase 2; pediatric NACI series deferred).
const RULES: PreventiveRule[] = [
  // --- Immunizations (NACI / PHAC) -----------------------------------------
  {
    id: "influenza",
    kind: "immunization",
    label: "Influenza vaccine",
    intervalMonths: 12,
    direction: "recommend",
    match: /influenza|flu vaccine|\bflu\b/,
    source: "naci-2024-influenza",
  },
  {
    id: "pneumococcal",
    kind: "immunization",
    label: "Pneumococcal vaccine",
    minAge: 65,
    direction: "recommend",
    match: /pneumococc|\bppsv|\bpcv/,
    source: "naci-2024-pneumococcal",
  },
  {
    id: "herpes-zoster",
    kind: "immunization",
    label: "Shingles vaccine (recombinant zoster, RZV)",
    minAge: 50,
    direction: "recommend",
    match: /zoster|shingl|shingrix|\brzv\b/,
    source: "naci-2024-zoster",
  },
  // --- Screening (CTFPHC) ---------------------------------------------------
  {
    id: "breast",
    kind: "screening",
    label: "Mammography (breast cancer screening)",
    sex: "female",
    minAge: 50,
    maxAge: 74,
    intervalMonths: 36,
    direction: "recommend",
    match: /mammogra|breast (cancer )?screen/,
    source: "ctfphc-2018-breast",
  },
  {
    id: "cervical",
    kind: "screening",
    label: "Cervical cytology (Pap test)",
    sex: "female",
    minAge: 25,
    maxAge: 69,
    intervalMonths: 36,
    direction: "recommend",
    match: /cervical cyto|pap (test|smear)|cervical (cancer )?screen/,
    source: "ctfphc-2013-cervical",
  },
  {
    id: "colorectal",
    kind: "screening",
    label: "Colorectal cancer screening (FIT)",
    minAge: 50,
    maxAge: 74,
    intervalMonths: 24,
    direction: "recommend",
    match: /fecal immunochem|\bfit\b|\bfobt\b|colorectal|colonoscop|sigmoidoscop/,
    source: "ctfphc-2016-colorectal",
  },
  {
    id: "bone-density",
    kind: "screening",
    label: "Bone mineral density (osteoporosis screening)",
    sex: "female",
    minAge: 65,
    intervalMonths: 60,
    direction: "recommend",
    match: /bone mineral density|\bbmd\b|dexa|dxa|osteoporosis screen/,
    source: "osteoporosis-canada-2023-bmd",
  },
  {
    id: "prostate",
    kind: "screening",
    label: "Prostate cancer screening (PSA)",
    sex: "male",
    minAge: 55,
    // CTFPHC recommends AGAINST routine PSA screening (shared decision 55–69).
    // Encoded so the engine never nags it as a gap — see the prostate-trap note.
    direction: "recommend-against",
    match: /\bpsa\b|prostate (cancer )?screen|prostate-specific/,
    source: "ctfphc-2014-prostate",
  },
];

/** Derive sex from the context's `sexAge` ("68 F" / "40 M"); null if absent. */
function patientSex(ctx: PatientContext): Sex | null {
  const m = ctx.patient.sexAge.match(/\b([MF])\b/i);
  if (!m) return null;
  return m[1].toUpperCase() === "M" ? "male" : "female";
}

function applies(rule: PreventiveRule, age: number | null, sex: Sex | null): boolean {
  if (rule.sex && rule.sex !== sex) return false;
  if (age == null) return rule.minAge == null && rule.maxAge == null;
  if (rule.minAge != null && age < rule.minAge) return false;
  if (rule.maxAge != null && age > rule.maxAge) return false;
  return true;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** ISO date `intervalMonths` before `today` (local, matching `ageFromDob`). */
function cutoffISO(today: Date, intervalMonths: number): string {
  const d = new Date(today.getFullYear(), today.getMonth() - intervalMonths, today.getDate());
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Most-recent matching chart item for a rule (by date desc), or null. */
function latestMatch(
  rule: PreventiveRule,
  items: (ContextImmunization | ContextProcedure)[],
): ContextImmunization | ContextProcedure | null {
  const hits = items
    .filter((i) => rule.match.test(i.label.toLowerCase()))
    .sort((a, b) => b.date.localeCompare(a.date));
  return hits[0] ?? null;
}

function evaluate(
  rule: PreventiveRule,
  found: ContextImmunization | ContextProcedure | null,
  today: Date,
): HealthMaintenanceItem {
  let status: HealthMaintenanceItem["status"];
  let detail: string;
  let evidence: string[];

  if (found) {
    const overdue =
      rule.intervalMonths != null && found.date < cutoffISO(today, rule.intervalMonths);
    status = overdue ? "overdue" : "up-to-date";
    detail = rule.intervalMonths
      ? `last ${found.date} · every ${rule.intervalMonths} mo`
      : `last ${found.date}`;
    evidence = [found.ref];
  } else {
    // Interval-based rule never done → a true gap (missing); one-time/series
    // never done → simply due. (See the status table in the design note.)
    status = rule.intervalMonths != null ? "missing" : "due";
    detail = rule.intervalMonths
      ? `no record on file · every ${rule.intervalMonths} mo`
      : "no record on file";
    evidence = ["no record on file"];
  }

  // recommend-against / shared-decision items are never a nag: clamp any gap to
  // non-actionable (Phase-1 UX call — a "discuss" prompt is deferred).
  if (rule.direction !== "recommend" && status !== "up-to-date") {
    status = "up-to-date";
  }

  return {
    id: rule.id,
    kind: rule.kind,
    status,
    title: rule.label,
    detail,
    evidence,
    rule: rule.source,
  };
}

function itemsFor(
  ctx: PatientContext,
  kind: PreventiveRule["kind"],
  today: Date,
): HealthMaintenanceItem[] {
  const age = ageFromDob(ctx.patient.dob, today);
  const sex = patientSex(ctx);
  const pool: (ContextImmunization | ContextProcedure)[] =
    kind === "immunization" ? (ctx.immunizations ?? []) : (ctx.procedures ?? []);
  return RULES.filter((r) => r.kind === kind && applies(r, age, sex)).map((r) =>
    evaluate(r, latestMatch(r, pool), today),
  );
}

/** F15 — every age/sex-appropriate immunization with its status (incl. up-to-date). */
export function immunizationStatus(
  ctx: PatientContext,
  today: Date = new Date(),
): HealthMaintenanceItem[] {
  return itemsFor(ctx, "immunization", today);
}

/** F16 — every age/sex-appropriate screening with its status (incl. up-to-date). */
export function screeningGaps(
  ctx: PatientContext,
  today: Date = new Date(),
): HealthMaintenanceItem[] {
  return itemsFor(ctx, "screening", today);
}

const RANK: Record<HealthMaintenanceItem["status"], number> = {
  overdue: 0,
  missing: 1,
  due: 2,
  "up-to-date": 3,
};

/** Combined, ranked list of ACTIONABLE items only (quiet about what's fine). */
export function buildHealthMaintenance(
  ctx: PatientContext,
  today: Date = new Date(),
): HealthMaintenanceItem[] {
  return [...immunizationStatus(ctx, today), ...screeningGaps(ctx, today)]
    .filter((i) => i.status !== "up-to-date")
    .sort((a, b) => RANK[a.status] - RANK[b.status]);
}

/** Summarize a list into a rollup string: "1 overdue · 2 due", or "Up to date". */
function rollup(items: HealthMaintenanceItem[]): string {
  const actionable = items.filter((i) => i.status !== "up-to-date");
  if (actionable.length === 0) return "Up to date";
  const counts = { overdue: 0, due: 0, missing: 0 };
  for (const i of actionable) counts[i.status as keyof typeof counts] += 1;
  return (["overdue", "due", "missing"] as const)
    .filter((s) => counts[s] > 0)
    .map((s) => `${counts[s]} ${s}`)
    .join(" · ");
}

/** The two At-a-Glance rollup rows, fed from the same engine as the section. */
export function preventiveSummary(
  ctx: PatientContext,
  today: Date = new Date(),
): { vaccines: string; screenings: string } {
  return {
    vaccines: rollup(immunizationStatus(ctx, today)),
    screenings: rollup(screeningGaps(ctx, today)),
  };
}
