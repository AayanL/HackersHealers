// The assistant's capability/tool layer.
//
// Two entry points share one set of *deterministic* card builders:
//   • buildAssistantTools(ctx, collector) — AI SDK tool definitions the model
//     calls; each execute() builds a typed card from the grounded context.
//   • routeToCard(text, ctx) — a keyword router that runs the same builders
//     with NO model, so cards work without an API key (keyless demo + tests).
//
// Per the design doc: the model only *chooses* a capability and narrates; the
// card data itself is computed deterministically from the patient context, so
// a dose or code can never be a model hallucination.

import { jsonSchema, tool } from "ai";
import type {
  CardData,
  CodeOption,
  DraftOrderCardData,
  GuidelineBullet,
  GuidelineCardData,
  NoteCardData,
  ReconcileCardData,
  ReconcileFinding,
  SummaryCardData,
  TrendCardData,
} from "./assistant";
import { buildBilling } from "./billing";
import { RANGES, activeMeds, flaggedLabs } from "./clinical";
import { buildForm } from "./forms";
import type {
  ContextMedication,
  ContextObservation,
  PatientContext,
} from "./grounding";
import { buildInteractions, checkInteractions } from "./interactions";
import { buildReferral } from "./referral";

// --- shared helpers --------------------------------------------------------

interface Measure {
  match: RegExp;
  code: string;
  label: string;
}

const MEASURES: Measure[] = [
  { match: /potassium|\bk\+?\b|k⁺/, code: "2823-3", label: "Potassium" },
  { match: /egfr|\bgfr\b|renal function/, code: "33914-3", label: "eGFR" },
  { match: /sodium|\bna\b/, code: "2951-2", label: "Sodium" },
  { match: /creatinine/, code: "2160-0", label: "Creatinine" },
  { match: /a1c|hba1c/, code: "4548-4", label: "Hemoglobin A1c" },
  { match: /glucose/, code: "2345-7", label: "Glucose" },
];

const CLASS_OF: { match: RegExp; klass: string }[] = [
  {
    match: /lisinopril|enalapril|ramipril|losartan|valsartan|amlodipine|hydrochlorothiazide|metoprolol|atenolol/,
    klass: "antihypertensive",
  },
  { match: /atorvastatin|simvastatin|rosuvastatin|pravastatin/, klass: "statin" },
  { match: /metformin|glipizide|glimepiride|insulin/, klass: "antidiabetic" },
  { match: /aspirin|clopidogrel/, klass: "antiplatelet" },
];

function classOf(name: string): string | null {
  const lower = name.toLowerCase();
  return CLASS_OF.find((c) => c.match.test(lower))?.klass ?? null;
}

function hasProblem(ctx: PatientContext, re: RegExp): boolean {
  return ctx.problems.some((p) => re.test(p.name.toLowerCase()));
}

function hasMed(ctx: PatientContext, re: RegExp): boolean {
  return activeMeds(ctx).some((m) => re.test(m.name.toLowerCase()));
}

function egfrNote(ctx: PatientContext): string {
  const egfr = ctx.observations.find((o) => /egfr|gfr/i.test(o.label));
  return egfr
    ? `eGFR ${egfr.value} ${egfr.unit} on file — renal-dose check limited`
    : "eGFR not on file; renal-dose check skipped";
}

// --- F2: reconciliation ----------------------------------------------------

export function buildReconcile(ctx: PatientContext): ReconcileCardData {
  const active = activeMeds(ctx);
  const findings: ReconcileFinding[] = [];

  // Gaps: an active med with no charted indication.
  for (const m of active) {
    if (!m.indication) {
      findings.push({
        id: `gap-${m.ref}`,
        type: "gap",
        severity: "moderate",
        title: `${m.name} active · no charted indication`,
        detail: "Active but no matching problem on the chart — confirm.",
        meds: [m.ref],
        source: "med-without-indication",
      });
    }
  }

  // Duplicates: two or more active meds in the same therapeutic class.
  const byClass = new Map<string, ContextMedication[]>();
  for (const m of active) {
    const k = classOf(m.name);
    if (!k) continue;
    byClass.set(k, [...(byClass.get(k) ?? []), m]);
  }
  for (const [klass, meds] of byClass) {
    if (meds.length >= 2) {
      findings.push({
        id: `dup-${klass}`,
        type: "duplicate",
        severity: "low",
        title: `Possible duplicate ${klass}`,
        detail: `${meds.map((m) => m.name).join(" + ")} share a therapeutic class.`,
        meds: meds.map((m) => m.ref),
        source: "duplicate-class@2025.4",
      });
    }
  }

  // Drug–drug interactions (curated subset), surfaced highest-severity first.
  findings.push(...checkInteractions(ctx));
  const rank: Record<ReconcileFinding["severity"], number> = {
    high: 0,
    moderate: 1,
    low: 2,
  };
  findings.sort((a, b) => rank[a.severity] - rank[b.severity]);

  return { kind: "reconcile", findings, coverageGaps: [egfrNote(ctx)] };
}

// --- F4: lab trend ---------------------------------------------------------

export function detectMeasure(text: string): Measure | null {
  const lower = text.toLowerCase();
  return MEASURES.find((m) => m.match.test(lower)) ?? null;
}

export function buildTrend(
  ctx: PatientContext,
  measure: string,
): TrendCardData | null {
  const m = detectMeasure(measure) ?? {
    match: /./,
    code: "",
    label: measure,
  };
  const matched = ctx.observations
    .filter(
      (o) =>
        (m.code && o.code === m.code) ||
        o.label.toLowerCase().includes(m.label.toLowerCase()),
    )
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  if (matched.length === 0) return null;

  const code = matched[0].code ?? m.code;
  const range = code ? RANGES[code] : undefined;
  const unit = matched[0].unit;
  const since = matched[0].date.slice(0, 7);

  return {
    kind: "trend",
    label: m.label,
    unit,
    referenceRange: range,
    query: `Observation?code=${code}&date=ge${since}`,
    points: matched.map((o: ContextObservation) => ({
      date: o.date,
      value: o.value,
      ref: o.ref,
      flagged: range ? o.value < range.low || o.value > range.high : false,
    })),
  };
}

// --- F5: order draft -------------------------------------------------------

export interface DraftOrderInput {
  title: string;
  orderType?: "lab" | "medication";
  priority?: string;
  collectDate?: string;
  reason?: string;
  code?: string;
}

const LAB_TITLES: Record<string, string> = {
  bmp: "Basic Metabolic Panel",
  cmp: "Comprehensive Metabolic Panel",
  cbc: "Complete Blood Count",
  a1c: "Hemoglobin A1c",
  hba1c: "Hemoglobin A1c",
  lipid: "Lipid Panel",
};

export function buildDraftOrder(input: DraftOrderInput): DraftOrderCardData {
  const fields: { label: string; value: string }[] = [
    { label: "Priority", value: input.priority || "Routine" },
  ];
  if (input.collectDate) fields.push({ label: "Collect", value: input.collectDate });
  if (input.reason) fields.push({ label: "Reason", value: input.reason });

  return {
    kind: "draftOrder",
    orderType: input.orderType ?? "lab",
    title: input.title,
    code: input.code,
    fields,
    safety: ["Draft only — no allergy or interaction conflicts auto-detected."],
  };
}

// --- F7: guideline + coding ------------------------------------------------

export function buildGuideline(ctx: PatientContext): GuidelineCardData {
  const sourceCondition = ctx.problems[0]?.ref;

  if (hasMed(ctx, /metformin/) && !hasProblem(ctx, /diabet/)) {
    const note = "no diabetes Condition charted";
    return {
      kind: "guideline",
      sourceCondition,
      bullets: [
        {
          text: "Check eGFR before starting and at least annually during metformin therapy; hold if eGFR < 30.",
          source: "ADA Standards of Care 2025",
        },
        {
          text: "Recheck A1c every 3–6 months until stable, then twice yearly.",
          source: "ADA Standards of Care 2025",
        },
      ],
      codes: [
        {
          id: "icd-e119",
          system: "ICD-10",
          code: "E11.9",
          display: "Type 2 diabetes mellitus without complications",
          confidence: `needs confirmation — ${note}`,
        },
        {
          id: "snomed-44054006",
          system: "SNOMED",
          code: "44054006",
          display: "Diabetes mellitus type 2",
          confidence: `needs confirmation — ${note}`,
        },
      ],
      unverifiedNote: `metformin is active but ${note}; codes are suggestions pending confirmation.`,
    };
  }

  const bullets: GuidelineBullet[] = [];
  const codes: CodeOption[] = [];
  if (hasProblem(ctx, /hypertension/)) {
    bullets.push({
      text: "Confirm blood-pressure target and check basic metabolic panel periodically on ACE-inhibitor therapy.",
      source: "ACC/AHA 2017 Hypertension Guideline",
    });
    codes.push({
      id: "icd-i10",
      system: "ICD-10",
      code: "I10",
      display: "Essential (primary) hypertension",
    });
  }
  if (bullets.length === 0) {
    bullets.push({
      text: "No specific monitoring rule fired for the charted problems and meds.",
      source: "no matching guideline",
    });
  }
  return { kind: "guideline", sourceCondition, bullets, codes };
}

// --- F3: summary -----------------------------------------------------------

export function buildSummary(ctx: PatientContext): SummaryCardData {
  const active = activeMeds(ctx);
  const problems = ctx.problems.map((p) => p.name).join(", ") || "no charted problems";
  const flags = flaggedLabs(ctx);
  const gapMed = active.find((m) => !m.indication);
  const citations: string[] = [];
  if (ctx.problems[0]) citations.push(ctx.problems[0].ref);
  if (flags[0]) citations.push(flags[0].ref);
  if (gapMed) citations.push(gapMed.ref);

  const flagText = flags
    .map((f) => `${f.label} ${f.value} ${f.unit} (out of range)`)
    .join("; ");

  return {
    kind: "summary",
    citations,
    sbar: {
      situation: `${ctx.patient.sexAge} in for routine follow-up.`,
      background: `${active.length} active meds: ${active.map((m) => m.name).join(", ")}. Problems: ${problems}.`,
      assessment:
        [
          flagText ? `Labs: ${flagText}.` : null,
          gapMed ? `${gapMed.name} active without a charted indication.` : null,
        ]
          .filter(Boolean)
          .join(" ") || "No outstanding flags from the chart.",
      recommendation: "[clinician to complete]",
    },
    patient: `You're here for a regular check-up. Your problems on file are ${problems.toLowerCase()}. ${
      flags.length
        ? "One or more blood tests were outside the usual range, so the team may repeat them."
        : "Your recent results look stable."
    } Please keep taking your medicines as prescribed unless your clinician says otherwise.`,
  };
}

// --- F6: note --------------------------------------------------------------

export function buildNote(ctx: PatientContext): NoteCardData {
  const active = activeMeds(ctx);
  const flags = flaggedLabs(ctx);
  const gapMeds = active.filter((m) => !m.indication);
  const labLine = ctx.observations
    .map((o) => `${o.label} ${o.value} ${o.unit} (${o.date})`)
    .join("; ");
  const citations: string[] = [];
  if (flags[0]) citations.push(flags[0].ref);
  if (ctx.problems[0]) citations.push(ctx.problems[0].ref);

  const todos = [
    ...gapMeds.map((m) => `Confirm indication for ${m.name} (no problem on file)`),
    ...flags.map((f) => `Document ${f.label} trend and plan (${f.value} ${f.unit})`),
  ];
  if (todos.length === 0) todos.push("No outstanding documentation gaps detected.");

  return {
    kind: "note",
    citations,
    soap: {
      subjective: `${ctx.patient.sexAge} here for routine follow-up. No new complaints documented.`,
      objective: `Active meds: ${active.map((m) => m.name).join(", ")}.${labLine ? ` Labs: ${labLine}.` : ""}`,
      assessment:
        ctx.problems.map((p, i) => `${i + 1}. ${p.name}`).join(" ") ||
        "Problems not charted.",
      plan:
        [
          flags.length ? "Recheck flagged labs." : null,
          gapMeds.length ? "Clarify indication for unlinked meds." : null,
          "Continue current therapy unless changed.",
        ]
          .filter(Boolean)
          .join(" "),
    },
    todos,
  };
}

// --- keyword router (no-LLM fallback / keyless demo) -----------------------

export interface RouteResult {
  text: string;
  card?: CardData;
}

/** Pull an explicit order subject from "...order (for|to administer) [the] X". */
export function orderSubject(text: string): string | null {
  const m = text.match(
    /\border\s+(?:to\s+administer|to\s+start|to\s+repeat|for)\s+(?:the\s+)?(.+)$/i,
  );
  if (!m) return null;
  return m[1].replace(/[.?!\s]+$/, "").trim() || null;
}

/** Pick an F13 form template from free-text intent. */
export function pickFormTemplate(lower: string): string {
  if (/return.?to.?work|fitness.?to.?work|\brtw\b/.test(lower)) {
    return "return-to-work";
  }
  if (/attestation|disability|medical (certificate|letter)/.test(lower)) {
    return "attestation";
  }
  return "sick-note";
}

export function routeToCard(
  text: string,
  ctx: PatientContext,
): RouteResult | null {
  const lower = text.toLowerCase();

  if (/interaction|interact\b|drug[- ]?drug|\bddi\b/.test(lower)) {
    return {
      text: "Drug–drug interaction screen (curated subset):",
      card: buildInteractions(ctx),
    };
  }
  // Billing before the guideline branch so "service/fee code" doesn't fall to it.
  if (/\bbilling\b|\bbill\b|\bclaim\b|fee code|service code|fee schedule|how (do|to) (i )?bill/.test(lower)) {
    return {
      text: "Billing draft (curated synthetic codes — confirm before submitting):",
      card: buildBilling(ctx),
    };
  }
  // Referral before forms: a "referral letter" contains "letter" (a forms
  // keyword), and "note for the specialist" contains "note".
  if (
    /\brefer(s|rals?|red|ring)?\b|\bconsult\b|specialist|cardiolog|nephrolog|endocrinolog|respirolog|pulmonolog|rheumatolog|psychiatr|gastroenterolog|dermatolog|neurolog|orthop|book\b.*\bappointment\b/.test(
      lower,
    )
  ) {
    return {
      text: "Draft referral package — review and complete before sending. Not sent.",
      card: buildReferral(ctx, lower),
    };
  }
  // Forms before the note branch, because "sick note" contains "note".
  if (/sick ?note|work ?note|return.?to.?work|fitness.?to.?work|attestation|disability|\bletter\b|\bform\b/.test(lower)) {
    return {
      text: "Draft form — review and sign before issuing. Not issued.",
      card: buildForm(ctx, pickFormTemplate(lower)),
    };
  }
  if (/reconcile|double[- ]?check|duplicate|review (the )?med/.test(lower)) {
    return { text: "Here's the reconciliation, grounded in the chart:", card: buildReconcile(ctx) };
  }
  if (/progress note|soap|\bdocument\b|charting|\bnote\b/.test(lower)) {
    return {
      text: "AI draft — review and edit before signing. Not entered in the chart.",
      card: buildNote(ctx),
    };
  }
  if (/summar|handoff|sbar|sign[- ]?out/.test(lower)) {
    return { text: "Draft summary — review before use:", card: buildSummary(ctx) };
  }
  if (
    /\b(draft|order|repeat|start|place)\b/.test(lower) &&
    /\b(order|bmp|cmp|cbc|a1c|hba1c|lipid|panel|prescription|rx|medication|lab|vaccine|immuniz)\b/.test(
      lower,
    )
  ) {
    // An explicit subject ("...order for the Pneumococcal vaccine") wins over the
    // lab-name lookup, so a vaccine/screening draft keeps its real title.
    const subject = orderSubject(text);
    const key = Object.keys(LAB_TITLES).find((k) => lower.includes(k));
    const measure = detectMeasure(lower);
    const isVaccine = /vaccine|immuniz|zoster|shingl|influenza|\bflu\b|pneumococc/.test(
      lower,
    );
    return {
      text: "Drafted — please review and sign in the order screen. I can't place orders myself.",
      card: buildDraftOrder({
        title: subject ?? (key ? LAB_TITLES[key] : "Lab order"),
        orderType: isVaccine ? "medication" : "lab",
        collectDate: /next week/.test(lower) ? "Next week" : undefined,
        reason: measure ? `Recheck ${measure.label}` : undefined,
      }),
    };
  }
  const measure = detectMeasure(lower);
  if (
    measure &&
    /trend|over the|last (year|month|months|week)|history|recent|results?|levels?|\bshow\b|plot|chart/.test(lower)
  ) {
    const card = buildTrend(ctx, measure.label);
    return card
      ? { text: `Here are the ${measure.label} results:`, card }
      : { text: `I don't see any ${measure.label} results in this chart.` };
  }
  if (/\bcode\b|icd|snomed|guideline|monitor|monitoring/.test(lower)) {
    return {
      text: "Guidance and candidate codes, grounded in the chart:",
      card: buildGuideline(ctx),
    };
  }
  return null;
}

// --- AI SDK tools (LLM path) -----------------------------------------------

export interface CardCollector {
  card?: CardData;
}

const NO_INPUT = jsonSchema<Record<string, never>>({
  type: "object",
  properties: {},
  additionalProperties: false,
});

export function buildAssistantTools(
  ctx: PatientContext,
  collector: CardCollector,
) {
  const emit = (card: CardData): CardData => {
    collector.card = card;
    return card;
  };

  return {
    reconcile_medications: tool({
      description:
        "Reconcile the medication list: surface duplicate therapies, drugs with no charted indication, renal-dose coverage gaps, and curated drug–drug interactions. Use when asked to reconcile / double-check / review the meds.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildReconcile(ctx)),
    }),
    check_interactions: tool({
      description:
        "Screen the patient's ACTIVE medications for drug–drug interactions using a curated rule set (NOT a licensed full DDI database). Use when asked to check interactions. Returns a card of interaction findings, or states none were found in the curated subset.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildInteractions(ctx)),
    }),
    show_lab_trend: tool({
      description:
        "Show a numeric lab value over time as a trend chart, with the source FHIR query. Provide the measure name (e.g. 'potassium', 'creatinine', 'A1c').",
      inputSchema: jsonSchema<{ measure: string }>({
        type: "object",
        properties: {
          measure: {
            type: "string",
            description: "Lab measure, e.g. potassium, sodium, creatinine, eGFR, A1c",
          },
        },
        required: ["measure"],
        additionalProperties: false,
      }),
      execute: async ({ measure }) => {
        const card = buildTrend(ctx, measure);
        if (card) return emit(card);
        return { results: 0, note: `No ${measure} results in this chart.` };
      },
    }),
    draft_order: tool({
      description:
        "Draft (never submit) a lab or medication order for clinician review. The resulting card requires explicit human confirmation; you cannot place or sign orders.",
      inputSchema: jsonSchema<DraftOrderInput>({
        type: "object",
        properties: {
          title: { type: "string", description: "Order name, e.g. Basic Metabolic Panel" },
          orderType: { type: "string", enum: ["lab", "medication"] },
          priority: { type: "string" },
          collectDate: { type: "string" },
          reason: { type: "string" },
          code: { type: "string" },
        },
        required: ["title"],
        additionalProperties: false,
      }),
      execute: async (input) => emit(buildDraftOrder(input)),
    }),
    suggest_codes_and_guidance: tool({
      description:
        "Provide guideline monitoring points and candidate ICD-10/SNOMED codes grounded in the patient's problems and meds. Codes are suggestions requiring confirmation; never invent codes.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildGuideline(ctx)),
    }),
    summarize_patient: tool({
      description:
        "Produce an SBAR handoff plus a plain-language patient summary draft from the chart. Draft only.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildSummary(ctx)),
    }),
    draft_note: tool({
      description:
        "Draft a SOAP progress note and a 'what to document' checklist from the chart. Draft only; not signed and not entered in the chart.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildNote(ctx)),
    }),
    suggest_billing_codes: tool({
      description:
        "Suggest billing codes for the encounter: a service/fee code plus diagnostic codes from the charted problems, and catch likely missing/under-billed codes. Uses a CURATED SYNTHETIC fee subset (NOT a real fee schedule) — say so. Never submits a claim; the clinician confirms every code.",
      inputSchema: NO_INPUT,
      execute: async () => emit(buildBilling(ctx)),
    }),
    generate_form: tool({
      description:
        "Generate a draft form/letter (sick note, return-to-work, or medical attestation) prefilled and cited from the chart. Draft only; never auto-issued, and disclosure is minimum-necessary (a plain sick note never states the diagnosis).",
      inputSchema: jsonSchema<{ template?: string }>({
        type: "object",
        properties: {
          template: {
            type: "string",
            enum: ["sick-note", "return-to-work", "attestation"],
            description: "Which form to draft. Defaults to sick-note.",
          },
        },
        additionalProperties: false,
      }),
      execute: async ({ template }) => emit(buildForm(ctx, template ?? "sick-note")),
    }),
    draft_referral: tool({
      description:
        "Assemble a draft specialist REFERRAL package from the chart: pick the destination specialty (look up candidate specialists), pre-fill and cite the referral form / ServiceRequest fields, propose supporting attachments, flag missing required fields, and suggest appointment times. Draft + export only — never auto-sent and never auto-booked; the clinician reviews and completes. Uses a SYNTHETIC, portal-agnostic destination template and a synthetic specialist directory. Optionally pass the requested specialty; otherwise it is inferred from the charted problems.",
      inputSchema: jsonSchema<{ specialty?: string }>({
        type: "object",
        properties: {
          specialty: {
            type: "string",
            description:
              "Requested specialty, e.g. cardiology, nephrology, endocrinology, respirology. Omit to infer from the chart.",
          },
        },
        additionalProperties: false,
      }),
      execute: async ({ specialty }) => emit(buildReferral(ctx, specialty ?? null)),
    }),
  };
}
