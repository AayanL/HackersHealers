// F12 — standardized e-referrals (Phase-1 synthetic slice).
//
// Pure + deterministic (no `ai` import), so the keyless router and the client
// can both run it. Per the design doc (docs/billing-referrals-forms-design.md):
// the chart → form mapper is deterministic — the model only *chooses* the
// destination/specialty intent and writes letter prose; it never types a code,
// a structured field value, or a date. This is the design's deliberately
// PORTAL-AGNOSTIC, SYNTHETIC destination template (NOT an Ocean-specific
// registry, which waits on the region/portal confirmation). Phase 1 is
// draft-and-export only: nothing is sent, nothing is booked, nothing is
// written back. The `ServiceRequest` this models would be assembled at
// status=draft / intent=proposal; the proposed times map to Appointment
// proposals (status=proposed), never booked.

import type {
  ReferralAttachment,
  ReferralCandidate,
  ReferralCardData,
  ReferralField,
  ReferralSlot,
} from "./assistant";
import type { ContextProblem, PatientContext } from "./grounding";

interface Specialty {
  id: string;
  /** ServiceRequest.code display + letter salutation. */
  label: string;
  /** Matches both a clinician's free-text hint and charted problem text. */
  match: RegExp;
  /** Typical referral wait, in weeks — seeds the proposed timings. */
  waitWeeks: number;
  /** Synthetic directory (portal-agnostic; not a real referral network). */
  directory: { name: string; clinic: string }[];
  /** Required supporting attachment types, matched against chart lab labels. */
  attachments: { label: string; match: RegExp }[];
}

// A small synthetic catalog. Order matters only for the chart-inference scan;
// a clinician's explicit hint wins regardless of order.
const SPECIALTIES: Specialty[] = [
  {
    id: "cardiology",
    label: "Cardiology",
    match: /cardiolog|cardiac|\bheart\b|hypertension|coronary|angina|arrhythmia|atrial fib|palpitation|chest pain/,
    waitWeeks: 4,
    directory: [
      { name: "Dr. A. Okafor", clinic: "Riverside Cardiology" },
      { name: "Dr. M. Lindqvist", clinic: "Lakeshore Heart Centre" },
    ],
    attachments: [
      { label: "Recent ECG", match: /ecg|electrocardiogram/ },
      { label: "Recent lipid panel", match: /lipid|cholesterol|ldl|hdl/ },
    ],
  },
  {
    id: "endocrinology",
    label: "Endocrinology",
    match: /endocrin|diabet|thyroid|hba1c|\ba1c\b|hyperlipidemia|hyperlipidaemia|lipid|cholesterol/,
    waitWeeks: 6,
    directory: [
      { name: "Dr. S. Bhatt", clinic: "Metro Endocrine Associates" },
      { name: "Dr. R. Nakamura", clinic: "Westgate Diabetes Clinic" },
    ],
    attachments: [
      { label: "Recent HbA1c", match: /a1c|hba1c/ },
      { label: "Recent TSH / thyroid panel", match: /tsh|thyroid/ },
    ],
  },
  {
    id: "nephrology",
    label: "Nephrology",
    match: /nephrolog|renal|kidney|\bckd\b|egfr|\bgfr\b|creatinine|proteinuria/,
    waitWeeks: 5,
    directory: [
      { name: "Dr. P. Adeyemi", clinic: "Riverside Renal Care" },
      { name: "Dr. L. Costa", clinic: "Hillcrest Nephrology" },
    ],
    attachments: [
      { label: "Recent eGFR / creatinine", match: /egfr|\bgfr\b|creatinine/ },
      { label: "Urinalysis / ACR", match: /urinalysis|albumin|\bacr\b/ },
    ],
  },
  {
    id: "respirology",
    label: "Respirology",
    match: /respirolog|pulmonolog|pulmonary|asthma|copd|emphysema|dyspn|shortness of breath/,
    waitWeeks: 6,
    directory: [
      { name: "Dr. K. Mensah", clinic: "Bayview Respiratory Clinic" },
      { name: "Dr. J. Halvorsen", clinic: "Summit Lung Centre" },
    ],
    attachments: [
      { label: "Recent spirometry / PFT", match: /spirometry|\bpft\b/ },
      { label: "Chest imaging report", match: /chest x-?ray|\bcxr\b|ct chest/ },
    ],
  },
  {
    id: "gastroenterology",
    label: "Gastroenterology",
    match: /gastroenterolog|\bgi\b|gerd|reflux|colitis|crohn|hepat|\bliver\b|dyspepsia/,
    waitWeeks: 8,
    directory: [
      { name: "Dr. F. Rossi", clinic: "Central GI Associates" },
      { name: "Dr. N. Patel", clinic: "Riverside Digestive Health" },
    ],
    attachments: [
      { label: "Recent liver panel", match: /\balt\b|\bast\b|bilirubin|liver/ },
    ],
  },
  {
    id: "rheumatology",
    label: "Rheumatology",
    match: /rheumatolog|arthritis|osteoarthr|\bjoint\b|lupus|\bgout\b/,
    waitWeeks: 10,
    directory: [
      { name: "Dr. H. Sørensen", clinic: "Parkside Rheumatology" },
      { name: "Dr. T. Mwangi", clinic: "Lakeshore Arthritis Centre" },
    ],
    attachments: [
      { label: "Inflammatory markers (ESR/CRP)", match: /\besr\b|\bcrp\b/ },
      { label: "Relevant joint imaging report", match: /x-?ray|\bmri\b|\bus\b/ },
    ],
  },
  {
    id: "neurology",
    label: "Neurology",
    match: /neurolog|seizure|epilep|migraine|headache|\bstroke\b|\btia\b|neuropath/,
    waitWeeks: 9,
    directory: [
      { name: "Dr. E. Vasquez", clinic: "Metro Neurology" },
      { name: "Dr. D. Olsen", clinic: "Summit Neuroscience Clinic" },
    ],
    attachments: [
      { label: "Relevant neuroimaging report", match: /ct head|mri brain|neuroimag/ },
    ],
  },
  {
    id: "psychiatry",
    label: "Psychiatry",
    match: /psychiatr|mental health|depress|anxiety|\bmood\b|panic|bipolar/,
    waitWeeks: 8,
    directory: [
      { name: "Dr. C. Iverson", clinic: "Bridgewater Behavioural Health" },
      { name: "Dr. A. Diallo", clinic: "Central Psychiatry Associates" },
    ],
    attachments: [],
  },
  {
    id: "orthopedics",
    label: "Orthopedic Surgery",
    match: /orthop|fracture|\bknee\b|\bhip\b|shoulder|rotator cuff|meniscus|ligament/,
    waitWeeks: 9,
    directory: [
      { name: "Dr. B. Tanaka", clinic: "Summit Orthopedics" },
      { name: "Dr. M. Eriksson", clinic: "Parkside Bone & Joint" },
    ],
    attachments: [
      { label: "Relevant joint imaging report", match: /x-?ray|\bmri\b/ },
    ],
  },
  {
    id: "dermatology",
    label: "Dermatology",
    match: /dermatolog|\bskin\b|\brash\b|lesion|\bmole\b|eczema|psoriasis/,
    waitWeeks: 7,
    directory: [
      { name: "Dr. Y. Kassis", clinic: "Riverside Dermatology" },
      { name: "Dr. O. Ferreira", clinic: "Central Skin Clinic" },
    ],
    attachments: [],
  },
];

// Default destination when nothing else matches.
const GENERAL: Specialty = {
  id: "general-internal-medicine",
  label: "General Internal Medicine",
  match: /./,
  waitWeeks: 4,
  directory: [
    { name: "Dr. R. Fenwick", clinic: "Riverside Internal Medicine" },
    { name: "Dr. G. Almeida", clinic: "Central Medical Associates" },
  ],
  attachments: [
    { label: "Recent bloodwork", match: /potassium|sodium|creatinine|egfr|cbc|panel|glucose/ },
  ],
};

/** Pick the destination specialty: explicit hint first, then chart inference. */
function pickSpecialty(ctx: PatientContext, hint: string | null): Specialty {
  if (hint) {
    const h = hint.toLowerCase();
    const byHint = SPECIALTIES.find((s) => s.match.test(h));
    if (byHint) return byHint;
  }
  for (const p of ctx.problems) {
    const lower = p.name.toLowerCase();
    const byProblem = SPECIALTIES.find((s) => s.match.test(lower));
    if (byProblem) return byProblem;
  }
  return GENERAL;
}

/** The charted problem that drives the referral (cited as the reason). */
function reasonProblem(
  ctx: PatientContext,
  spec: Specialty,
): ContextProblem | null {
  return (
    ctx.problems.find((p) => spec.match.test(p.name.toLowerCase())) ??
    ctx.problems[0] ??
    null
  );
}

/** Most recent dated observation = the synthetic "today" the timings hang off. */
function lastVisit(ctx: PatientContext): string | null {
  const dates = ctx.observations
    .map((o) => o.date)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/** Render a value, or a `[bracketed]` clinician-to-complete placeholder. */
function fill(value: string | null, placeholder: string): string {
  return value ?? `[${placeholder}]`;
}

// --- deterministic date math (no Date.now; reproducible in tests) -----------

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

function isWeekend(iso: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return wd === 0 || wd === 6;
}

/** Nudge Sat/Sun forward to the next weekday. */
function nextWeekday(iso: string): string {
  let out = iso;
  while (isWeekend(out)) out = addDays(out, 1);
  return out;
}

/** Three proposed (never-booked) slots, ~waitWeeks out from the last visit. */
function proposeSlots(base: string, waitWeeks: number): ReferralSlot[] {
  const start = addDays(base, waitWeeks * 7);
  const offsets = [0, 2, 6];
  const times = ["09:20", "13:40", "11:00"];
  const modes = ["In person", "Virtual", "In person"];
  return offsets.map((off, i) => ({
    id: `slot-${i}`,
    date: nextWeekday(addDays(start, off)),
    time: times[i],
    mode: modes[i],
  }));
}

export function buildReferral(
  ctx: PatientContext,
  specialtyHint: string | null = null,
): ReferralCardData {
  const spec = pickSpecialty(ctx, specialtyHint);
  const reason = reasonProblem(ctx, spec);
  const name = ctx.patient.name || null;
  const dob = ctx.patient.dob || null;

  const candidates: ReferralCandidate[] = spec.directory.map((d, i) => ({
    id: `${spec.id}-${i}`,
    name: d.name,
    clinic: d.clinic,
    wait: `~${spec.waitWeeks} weeks`,
    selected: i === 0,
  }));

  const active = ctx.medications.filter((m) => m.status === "active");
  const otherProblems = ctx.problems
    .filter((p) => p !== reason)
    .map((p) => p.name);
  const recentLabs = [...ctx.observations]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .map((o) => `${o.label} ${o.value} ${o.unit}`);

  const fields: ReferralField[] = [
    { key: "patient", label: "Patient", value: name },
    { key: "dob", label: "Date of birth", value: dob },
    { key: "specialty", label: "Specialty requested", value: spec.label },
    {
      key: "reason",
      label: "Reason for referral",
      value: reason?.name ?? null,
      ref: reason?.ref,
    },
    {
      key: "history",
      label: "Relevant history",
      value: otherProblems.length ? otherProblems.join(", ") : null,
    },
    {
      key: "medications",
      label: "Current medications",
      value: active.length ? active.map((m) => m.name).join(", ") : null,
    },
    {
      key: "investigations",
      label: "Recent investigations",
      value: recentLabs.length ? recentLabs.join("; ") : null,
    },
    { key: "referrer", label: "Referring provider", value: null },
    { key: "urgency", label: "Urgency", value: null },
    { key: "question", label: "Clinical question", value: null },
  ];

  // Attachments: one present "recent bloodwork" (cited) plus the destination's
  // required types, each flagged present (cited) or required-but-missing.
  const attachments: ReferralAttachment[] = [];
  if (ctx.observations.length) {
    const mostRecent = [...ctx.observations].sort((a, b) =>
      b.date.localeCompare(a.date),
    )[0];
    attachments.push({
      id: "att-labs",
      label: "Recent bloodwork",
      present: true,
      ref: mostRecent.ref,
      note: `most recent ${mostRecent.date}`,
    });
  }
  spec.attachments.forEach((a, i) => {
    const obs = ctx.observations.find((o) => a.match.test(o.label.toLowerCase()));
    attachments.push(
      obs
        ? { id: `att-${i}`, label: a.label, present: true, ref: obs.ref, note: "found in chart" }
        : { id: `att-${i}`, label: a.label, present: false, note: "not in chart — attach manually" },
    );
  });

  const base = lastVisit(ctx);
  const slots = base ? proposeSlots(base, spec.waitWeeks) : [];

  // Completeness check (the gate): chart-can't-fill fields + missing required
  // attachments + (no anchor date → can't propose times). Deduped, order-stable.
  const toComplete: string[] = [];
  for (const f of fields) if (f.value === null) toComplete.push(f.label);
  for (const a of attachments) if (!a.present) toComplete.push(a.label);
  if (slots.length === 0) toComplete.push("Appointment date — scheduling office to confirm");

  const letter =
    `Dear ${spec.label} colleague,\n\n` +
    `Thank you for seeing ${fill(name, "patient name")} (DOB ${fill(dob, "date of birth")}), ` +
    `whom I am referring for ${spec.label} assessment` +
    (reason ? ` regarding ${reason.name}` : "") +
    `. ` +
    (otherProblems.length ? `Relevant history includes ${otherProblems.join(", ")}. ` : "") +
    (active.length ? `Current medications: ${active.map((m) => m.name).join(", ")}. ` : "") +
    (recentLabs.length ? `Recent investigations: ${recentLabs.join("; ")}. ` : "") +
    `\n\n[Clinical question / specific reason for referral — clinician to complete.]\n\n` +
    `I would be grateful for your assessment and recommendations. ` +
    `Our office will contact yours to confirm an appointment time.\n\n` +
    `Sincerely,\n[Referring clinician]`;

  return {
    kind: "referral",
    specialty: spec.label,
    reason: reason?.name ?? "[clinician to complete]",
    reasonRef: reason?.ref,
    candidates,
    fields,
    attachments,
    slots,
    letter,
    toComplete,
    disclosureNote:
      "AI-drafted referral — review and complete before sending. Not sent. The request is a draft proposal; proposed times are suggestions only and are NOT booked. Specialist directory is synthetic.",
  };
}
