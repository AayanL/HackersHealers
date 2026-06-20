// Patient- and chat-aware prompt chips for the assistant composer.
//
// Pure and client-safe (no AI SDK / server imports): derives candidate prompts
// from the in-context chart — active meds, flagged labs, charted problems — and
// drops the ones the conversation has already covered, so the chips track both
// the patient and the chat as it unfolds.

import type { ChatMessage } from "./assistant";
import { activeMeds, flaggedLabs } from "./clinical";
import type { PatientContext } from "./grounding";

type Capability =
  | "reconcile"
  | "interactions"
  | "trend"
  | "order"
  | "guideline"
  | "summary"
  | "note"
  | "ask";

interface Suggestion {
  text: string;
  capability: Capability;
  /** For trends, the measure label so only the *same* measure is retired. */
  measure?: string;
}

const MAX = 4;

/** Labs that are components of a Basic Metabolic Panel (drives the recheck order). */
const BMP_LAB = /potassium|sodium|chloride|co2|bicarb|bun|creatinine|egfr|gfr|glucose|calcium/i;

/** "Metformin 500 mg" → "metformin"; drops the dose so a prompt reads naturally. */
function shortName(name: string): string {
  return name.replace(/\s*\d.*$/, "").trim().toLowerCase() || name.toLowerCase();
}

/**
 * Which capability a turn's text already exercised. Mirrors the router's intent
 * (lib/tools.ts `routeToCard`) as a heuristic for "already covered" — it does
 * not need to be an exact mirror, only good enough to retire a stale chip.
 * Trends are handled separately (by measure), and F1 "ask" is not deduped here.
 */
function capabilityOf(text: string): Capability | null {
  const t = text.toLowerCase();
  if (/interaction|drug[- ]?drug|\bddi\b/.test(t)) return "interactions";
  if (/reconcile|double[- ]?check|duplicate|review (the )?med/.test(t)) return "reconcile";
  if (/progress note|soap|document|charting|\bnote\b/.test(t)) return "note";
  if (/summar|handoff|sbar|sign[- ]?out/.test(t)) return "summary";
  if (
    /\b(draft|order|repeat|place|start)\b/.test(t) &&
    /\b(order|bmp|cmp|cbc|a1c|hba1c|lipid|panel|prescription|rx|medication|lab)\b/.test(t)
  )
    return "order";
  if (/\bcode\b|icd|snomed|guideline|monitor/.test(t)) return "guideline";
  return null;
}

/** The full candidate set for a patient, in clinical-salience order. */
function candidates(ctx: PatientContext): Suggestion[] {
  const active = activeMeds(ctx);
  const flagged = flaggedLabs(ctx);
  const gapMed = active.find((m) => !m.indication);
  const onMetformin = active.some((m) => /metformin/i.test(m.name));
  const hasDiabetesDx = ctx.problems.some((p) => /diabet/i.test(p.name));
  const out: Suggestion[] = [];

  if (active.length) {
    out.push({ text: "Reconcile the medications", capability: "reconcile" });
  }
  for (const lab of flagged) {
    out.push({ text: `Show the ${lab.label} trend`, capability: "trend", measure: lab.label });
  }
  if (active.length >= 2) {
    out.push({ text: "Check interactions", capability: "interactions" });
  }
  if (gapMed) {
    out.push({ text: `Why is ${shortName(gapMed.name)} on the chart?`, capability: "ask" });
  }
  if (onMetformin && !hasDiabetesDx) {
    // The guideline tool's special case: metformin active with no diabetes Dx.
    out.push({ text: "Codes & monitoring for metformin", capability: "guideline" });
  } else if (ctx.problems.length) {
    out.push({ text: "Suggest ICD-10 codes for the problems", capability: "guideline" });
  }
  const panelLab = flagged.find((l) => BMP_LAB.test(l.label));
  if (panelLab) {
    out.push({ text: `Draft a BMP to recheck ${panelLab.label}`, capability: "order" });
  }
  out.push({ text: "Summarize for handoff", capability: "summary" });
  out.push({ text: "Draft a progress note", capability: "note" });

  // Remaining (non-flagged) labs are worth a glance, at lowest priority.
  const seen = new Set(out.filter((s) => s.measure).map((s) => s.measure));
  for (const o of ctx.observations) {
    if (seen.has(o.label)) continue;
    seen.add(o.label);
    out.push({ text: `Recent ${o.label}`, capability: "trend", measure: o.label });
  }
  return out;
}

/** What the conversation so far has already covered. */
function covered(history: ChatMessage[], measures: string[]) {
  const texts = new Set<string>();
  const caps = new Set<Capability>();
  const trends = new Set<string>();
  for (const m of history) {
    if (m.role !== "user") continue;
    const t = m.text.trim().toLowerCase();
    texts.add(t);
    const cap = capabilityOf(t);
    if (cap) caps.add(cap);
    for (const measure of measures) {
      if (t.includes(measure.toLowerCase())) trends.add(measure);
    }
  }
  return { texts, caps, trends };
}

/**
 * Up to {@link MAX} prompt chips tailored to this patient, minus what the chat
 * has already done. Falls back to the top unfiltered candidates if everything
 * has been covered, so the composer is never left without affordances.
 */
export function buildSuggestions(
  ctx: PatientContext,
  history: ChatMessage[] = [],
): string[] {
  const all = candidates(ctx);
  const used = covered(
    history,
    all.flatMap((s) => (s.measure ? [s.measure] : [])),
  );

  const fresh = all.filter((s) => {
    if (used.texts.has(s.text.toLowerCase())) return false;
    if (s.measure) return !used.trends.has(s.measure);
    if (s.capability === "ask") return true; // deduped only by exact text above
    return !used.caps.has(s.capability);
  });

  return (fresh.length ? fresh : all).slice(0, MAX).map((s) => s.text);
}
