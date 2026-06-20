import { anthropic } from "@ai-sdk/anthropic";
import { generateText, stepCountIs } from "ai";
import type { CardData } from "@/lib/assistant";
import type { PatientContext } from "@/lib/grounding";
import { buildAssistantTools, routeToCard } from "@/lib/tools";

export const runtime = "nodejs";
export const maxDuration = 30;

// Provider-agnostic via the Vercel AI SDK — swap `anthropic("…")` for
// `openai("…")` / `google("…")` in one line. Default model: Claude Opus 4.8.
const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are VERA, a clinical decision-support assistant embedded in an EHR alongside the patient's chart.

Rules:
- Answer ONLY from the patient context provided below. If something is not in the chart, say so plainly ("I don't see that in this chart").
- Cite the FHIR resource behind each clinical claim, e.g. [MedicationRequest/lisinopril], [Condition/I10], [Observation/k].
- You are decision support, not a medical device. Never place orders or sign anything; you may draft for the clinician to confirm.
- Never fabricate medications, doses, labs, or diagnoses. Be concise and clinical.

Tools — anything actionable or numeric must be returned as a card, not prose:
- Reconcile / double-check / review meds → call reconcile_medications.
- Check drug–drug interactions → call check_interactions (curated subset, not a full DDI database — say so).
- Show a lab value over time (potassium, creatinine, A1c, …) → call show_lab_trend.
- Draft/repeat an order or prescription → call draft_order (it only drafts; the clinician confirms).
- Summarize / handoff / SBAR → call summarize_patient.
- Draft a progress note / "what to document" → call draft_note.
- Guideline/monitoring questions or code suggestions (ICD-10/SNOMED) → call suggest_codes_and_guidance.
When a tool returns a card, the card already shows the structured detail — so keep your narration to ONE short sentence and do NOT restate the card's contents (don't re-type the SBAR, the table, the order fields, etc.) in prose. Lead with the card; only add a brief caveat if something important isn't captured by it. For plain (non-card) questions, answer concisely; you may use light markdown — **bold** and simple "- " bullet lists — and cite resources inline.`;

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
}

const EMPTY_CONTEXT: PatientContext = {
  patient: { name: "", sexAge: "", dob: "", mrn: "" },
  medications: [],
  problems: [],
  observations: [],
};

export async function POST(req: Request) {
  const { messages = [], patientContext } = (await req.json()) as {
    messages?: IncomingMessage[];
    patientContext?: PatientContext;
  };
  const ctx = patientContext ?? EMPTY_CONTEXT;
  const convo = messages.filter(
    (m) => m.role === "user" || m.role === "assistant",
  );
  const lastUser = [...convo].reverse().find((m) => m.role === "user")?.text ?? "";

  // No key → run the deterministic capability router (no model). Cards still
  // work; free-text questions return a configuration notice.
  if (!process.env.ANTHROPIC_API_KEY) {
    const routed = routeToCard(lastUser, ctx);
    return Response.json({
      text:
        routed?.text ??
        "The assistant isn't fully configured — set ANTHROPIC_API_KEY for live free-text answers. Card actions (reconcile, trend, draft, summary, note, coding) work without it.",
      card: routed?.card ?? null,
    });
  }

  const collector: { card?: CardData } = {};
  const result = await generateText({
    model: anthropic(MODEL),
    system: `${SYSTEM_PROMPT}\n\n<patient_context>\n${JSON.stringify(
      ctx,
      null,
      2,
    )}\n</patient_context>`,
    messages: convo.map((m) => ({ role: m.role, content: m.text })),
    tools: buildAssistantTools(ctx, collector),
    stopWhen: stepCountIs(5),
  });

  return Response.json({ text: result.text, card: collector.card ?? null });
}
