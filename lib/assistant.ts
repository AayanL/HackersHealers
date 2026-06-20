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

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations?: string[];
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
    citations: ["MedicationRequest/lisinopril", "Condition/I10"],
  },
];
