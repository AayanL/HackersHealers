// Assistant view models + synthetic demo content (mirrors the design comp's
// Jane Doe conversation). Used until live grounding/streaming is wired.

export interface GlanceData {
  summary: string;
  problems: string;
  medsActive: number;
  allergy: string;
  flagged: string;
  lastVisit: string;
  resourceCount: number;
}

export interface SafetyAlert {
  id: string;
  severity: "warn" | "info";
  title: string;
  detail?: string;
  evidence: string[];
  rule?: string;
}

// --- Rich tool-result cards (F2–F7) ---------------------------------------
// Anything actionable or numeric renders as a typed card, not model prose, so
// the model can't typo a dose into free text. Each card carries its own
// provenance; the discriminated union lets Conversation pick the renderer.

/** F2 — one reconciliation finding (duplicate / gap / interaction / renal). */
export interface ReconcileFinding {
  id: string;
  type: "duplicate" | "gap" | "interaction" | "renal";
  severity: "high" | "moderate" | "low";
  title: string;
  detail?: string;
  /** Offending drugs — chips deep-linking to their MedicationRequest. */
  meds: string[];
  /** Cited rule / source id. */
  source?: string;
}

export interface ReconcileCardData {
  kind: "reconcile";
  findings: ReconcileFinding[];
  /** Explicit "could not evaluate" coverage gaps, e.g. "eGFR not on file". */
  coverageGaps?: string[];
}

/** F4 — one point on a value trend. */
export interface TrendPoint {
  date: string;
  value: number;
  ref: string;
  flagged?: boolean;
}

export interface TrendCardData {
  kind: "trend";
  label: string;
  unit: string;
  points: TrendPoint[];
  /** The literal FHIR query, shown as provenance. */
  query: string;
  referenceRange?: { low: number; high: number };
}

/** F5 — a draft order; never auto-submits, flips state on explicit click. */
export interface DraftOrderCardData {
  kind: "draftOrder";
  orderType: "lab" | "medication";
  title: string;
  code?: string;
  fields: { label: string; value: string }[];
  /** Inline allergy / interaction safety banners, cited. */
  safety?: string[];
}

/** F7 — a guideline monitoring bullet, tagged with its external source. */
export interface GuidelineBullet {
  text: string;
  /** External-knowledge source (rendered distinct from chart facts). */
  source: string;
}

/** F7 — a selectable validated code (ICD-10 / SNOMED). */
export interface CodeOption {
  id: string;
  system: "ICD-10" | "SNOMED";
  code: string;
  display: string;
  confidence?: string;
}

export interface GuidelineCardData {
  kind: "guideline";
  bullets?: GuidelineBullet[];
  codes?: CodeOption[];
  /** The chart Condition the codes/guidance are grounded in. */
  sourceCondition?: string;
  /** Model text without a source, shown de-emphasized. */
  unverifiedNote?: string;
}

/** F3 — SBAR handoff vs plain-language patient summary. */
export interface SummaryCardData {
  kind: "summary";
  sbar: {
    situation: string;
    background: string;
    assessment: string;
    recommendation: string;
  };
  patient: string;
  citations?: string[];
}

/** F6 — SOAP progress-note draft vs "what to document" checklist. */
export interface NoteCardData {
  kind: "note";
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  todos: string[];
  citations?: string[];
}

export type CardData =
  | ReconcileCardData
  | TrendCardData
  | DraftOrderCardData
  | GuidelineCardData
  | SummaryCardData
  | NoteCardData;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
  /** Optional typed tool-result card rendered below the assistant text. */
  card?: CardData;
}

export const SEED_GLANCE: GlanceData = {
  summary:
    "68F with hypertension and hyperlipidemia, on 5 active medications. One lab flag and two safety alerts surfaced on open.",
  problems: "Hypertension · Hyperlipidemia · Osteoarthritis",
  medsActive: 5,
  allergy: "Penicillin (rash)",
  flagged: "K⁺ 5.3 ▲ · eGFR 58 · A1c not on file",
  lastVisit: "2026-06-10",
  resourceCount: 6,
};

export const SEED_ALERTS: SafetyAlert[] = [
  {
    id: "hyperk",
    severity: "warn",
    title: "K⁺ 5.3 + active ACE inhibitor",
    detail: "Lisinopril can raise serum potassium.",
    evidence: [
      "Observation/k · 5.3 mmol/L · 2026-06-10",
      "MedicationRequest/lisinopril · active",
    ],
    rule: "ace-hyperkalemia@2025.4",
  },
  {
    id: "metformin",
    severity: "info",
    title: "Metformin active · no diabetes problem",
    evidence: [
      "MedicationRequest/metformin · active",
      "no Condition[diabetes] · med-without-indication",
    ],
  },
];

export const SEED_CONVERSATION: ChatMessage[] = [
  { id: "u1", role: "user", text: "Why is she on lisinopril?" },
  {
    id: "a1",
    role: "assistant",
    text: "Lisinopril 10 mg daily is active, started 2026-04-02. Maps to her recorded Hypertension problem.",
    citations: ["MedicationRequest/lisinopril-10", "Condition/I10"],
  },
  { id: "u2", role: "user", text: "Reconcile her meds." },
  {
    id: "a2",
    role: "assistant",
    text: "Here's the reconciliation. I found 1 duplicate and 1 gap:",
    card: {
      kind: "reconcile",
      findings: [
        {
          id: "gap-metformin",
          type: "gap",
          severity: "moderate",
          title: "Metformin active · no diabetes problem charted",
          detail: "Active but no matching Condition — worth confirming.",
          meds: ["MedicationRequest/metformin"],
          source: "med-without-indication",
        },
        {
          id: "dup-antihypertensive",
          type: "duplicate",
          severity: "low",
          title: "Possible duplicate antihypertensive",
          detail: "Lisinopril and amlodipine both lower blood pressure.",
          meds: [
            "MedicationRequest/lisinopril",
            "MedicationRequest/amlodipine",
          ],
          source: "duplicate-class@2025.4",
        },
      ],
      coverageGaps: ["eGFR 58 on file — renal-dose check limited"],
    },
  },
  { id: "u3", role: "user", text: "Show her potassium over the last year." },
  {
    id: "a3",
    role: "assistant",
    text: "Here are 4 potassium results. The latest (2026-06-10) is 5.3 mmol/L, slightly above range.",
    card: {
      kind: "trend",
      label: "Potassium (K⁺)",
      unit: "mmol/L",
      query: "Observation?code=2823-3&date=ge2025-06",
      referenceRange: { low: 3.5, high: 5.1 },
      points: [
        { date: "2025-09-12", value: 4.4, ref: "Observation/k1" },
        { date: "2025-12-03", value: 4.7, ref: "Observation/k2" },
        { date: "2026-03-18", value: 4.9, ref: "Observation/k3" },
        { date: "2026-06-10", value: 5.3, ref: "Observation/k", flagged: true },
      ],
    },
  },
  { id: "u4", role: "user", text: "Draft a repeat BMP for next week." },
  {
    id: "a4",
    role: "assistant",
    text: "Drafted — please review and sign in the order screen. I can't place orders myself.",
    card: {
      kind: "draftOrder",
      orderType: "lab",
      title: "Basic Metabolic Panel",
      code: "LOINC 51990-0",
      fields: [
        { label: "Priority", value: "Routine" },
        { label: "Collect", value: "2026-06-26" },
        { label: "Reason", value: "Recheck elevated potassium (5.3)" },
      ],
      safety: ["No known interactions with active meds for this lab order."],
    },
  },
  {
    id: "u5",
    role: "user",
    text: "What should I monitor on metformin, and suggest a code?",
  },
  {
    id: "a5",
    role: "assistant",
    text: "Monitoring guidance and candidate codes, grounded in her active problems and meds:",
    card: {
      kind: "guideline",
      sourceCondition: "Condition/I10",
      bullets: [
        {
          text: "Check eGFR before and at least annually during metformin therapy; hold if eGFR < 30.",
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
          confidence: "needs confirmation — no diabetes Condition charted",
        },
        {
          id: "snomed-44054006",
          system: "SNOMED",
          code: "44054006",
          display: "Diabetes mellitus type 2",
          confidence: "needs confirmation — no diabetes Condition charted",
        },
      ],
      unverifiedNote:
        "Metformin is active but no diabetes Condition is recorded; codes are suggestions pending clinician confirmation.",
    },
  },
  { id: "u6", role: "user", text: "Summarize her for handoff." },
  {
    id: "a6",
    role: "assistant",
    text: "Draft summary — review before use:",
    card: {
      kind: "summary",
      citations: ["Condition/I10", "Observation/k", "MedicationRequest/metformin"],
      sbar: {
        situation:
          "68F with hypertension and hyperlipidemia, in for routine follow-up.",
        background:
          "5 active meds incl. lisinopril 10 mg, amlodipine 5 mg, metformin 500 mg BID. Penicillin allergy (rash).",
        assessment:
          "BP regimen stable. K⁺ 5.3 ▲ on ACE inhibitor; metformin active without a charted diabetes problem.",
        recommendation: "[clinician to complete]",
      },
      patient:
        "Jane is here for a regular check-up. Her blood pressure medicines are working. One blood test (potassium) was a little high, so the team may repeat it. She's allergic to penicillin.",
    },
  },
  { id: "u7", role: "user", text: "Draft a progress note for today." },
  {
    id: "a7",
    role: "assistant",
    text: "AI draft — review and edit before signing. Not entered in the chart.",
    card: {
      kind: "note",
      citations: ["Encounter/2026-06-10", "Observation/k", "Condition/I10"],
      soap: {
        subjective:
          "68F here for routine follow-up. No new complaints reported.",
        objective:
          "Active meds: lisinopril 10 mg, amlodipine 5 mg, metformin 500 mg BID. K⁺ 5.3 (2026-06-10), eGFR 58.",
        assessment:
          "1. Hypertension — controlled. 2. Hyperkalemia, mild — on ACE inhibitor. 3. Metformin without charted diabetes problem.",
        plan: "Repeat BMP next week. Clarify diabetes status / indication for metformin. Continue current antihypertensives.",
      },
      todos: [
        "Confirm indication for metformin (no diabetes Condition on file)",
        "Document potassium trend and ACE-inhibitor plan",
        "Record A1c if available",
      ],
    },
  },
];
