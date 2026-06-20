// Computes the at-a-glance summary and the proactive safety scan (F8) from the
// live, in-context patient — so the assistant dock populates from real data
// instead of showing (and then hiding) the synthetic Jane-Doe seed on a SMART
// launch. Pure; safe to import from client components.

import type { GlanceData, SafetyAlert } from "./assistant";
import { activeMeds, flaggedLabs } from "./clinical";
import { formatQuantity } from "./format";
import type { PatientContext } from "./grounding";
import { checkInteractions } from "./interactions";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function labText(o: { label: string; value: number; unit: string }): string {
  return `${o.label} ${formatQuantity(o.value)}${o.unit ? ` ${o.unit}` : ""}`;
}

export function buildGlance(ctx: PatientContext): GlanceData {
  const active = activeMeds(ctx);
  const flags = flaggedLabs(ctx);
  const interactions = checkInteractions(ctx);
  const gapMeds = active.filter((m) => !m.indication);

  const lastVisit =
    ctx.observations
      .map((o) => o.date)
      .filter(Boolean)
      .sort()
      .pop() ?? "—";

  const bits = [
    plural(active.length, "active med"),
    interactions.length ? plural(interactions.length, "interaction flag") : null,
    flags.length ? plural(flags.length, "lab flag") : null,
  ].filter(Boolean);

  const details = [
    ...interactions.map((i) => i.title + (i.detail ? ` — ${i.detail}` : "")),
    ...flags.map((f) => `${labText(f)} is outside the reference range.`),
    ...gapMeds.map((m) => `${m.name} is active with no charted indication.`),
  ];

  return {
    summary: `${ctx.patient.sexAge || "Patient"} with ${plural(
      ctx.problems.length,
      "charted problem",
    )}, ${bits.join(", ")}.`,
    problems: ctx.problems.map((p) => p.name).join(" · ") || "None charted",
    medsActive: active.length,
    allergy: "See allergy banner",
    flagged: flags.length ? flags.map(labText).join(" · ") : "No flagged labs",
    lastVisit,
    resourceCount:
      ctx.medications.length + ctx.problems.length + ctx.observations.length,
    details: details.length ? details : undefined,
  };
}

/** F8 proactive scan: interactions, the ACE-inhibitor+high-K rule, and gaps. */
export function safetyScan(ctx: PatientContext): SafetyAlert[] {
  const alerts: SafetyAlert[] = [];
  const active = activeMeds(ctx);

  // Lab-aware: ACE inhibitor / ARB with an elevated potassium.
  const k = ctx.observations
    .filter((o) => o.code === "2823-3")
    .sort((a, b) => a.date.localeCompare(b.date))
    .pop();
  const aceArb = active.find((m) =>
    /lisinopril|enalapril|ramipril|losartan|valsartan|olmesartan/i.test(m.name),
  );
  if (k && k.value > 5.0 && aceArb) {
    alerts.push({
      id: "hyperk",
      severity: "warn",
      title: `K⁺ ${formatQuantity(k.value)} + active ${aceArb.name}`,
      detail: "ACE inhibitor / ARB can raise serum potassium.",
      evidence: [
        `${k.ref} · ${formatQuantity(k.value)} ${k.unit} · ${k.date}`,
        `${aceArb.ref} · active`,
      ],
      rule: "ace-hyperkalemia@2025.4",
    });
  }

  // Curated drug–drug interactions.
  for (const f of checkInteractions(ctx)) {
    alerts.push({
      id: f.id,
      severity: f.severity === "low" ? "info" : "warn",
      title: f.title,
      detail: f.detail,
      evidence: f.meds.map((m) => `${m} · active`),
      rule: f.source,
    });
  }

  // Active meds without a charted indication (informational).
  for (const m of active.filter((m) => !m.indication)) {
    alerts.push({
      id: `gap-${m.ref}`,
      severity: "info",
      title: `${m.name} active · no charted indication`,
      evidence: [`${m.ref} · active`, "no matching Condition"],
    });
  }

  return alerts;
}
