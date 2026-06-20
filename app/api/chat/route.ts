import { anthropic } from "@ai-sdk/anthropic";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 30;

// Provider-agnostic via the Vercel AI SDK — swap `anthropic("…")` for
// `openai("…")` / `google("…")` in one line. Default model: Claude Opus 4.8.
const MODEL = "claude-opus-4-8";

const SYSTEM_PROMPT = `You are VERA, a clinical decision-support assistant embedded in an EHR alongside the patient's chart.

Rules:
- Answer ONLY from the patient context provided below. If something is not in the chart, say so plainly ("I don't see that in this chart").
- Cite the FHIR resource behind each clinical claim, e.g. [MedicationRequest/lisinopril], [Condition/I10], [Observation].
- You are decision support, not a medical device. Never place orders or sign anything; you may draft for the clinician to confirm.
- Never fabricate medications, doses, labs, or diagnoses. Be concise and clinical.`;

interface IncomingMessage {
  role: "user" | "assistant";
  text: string;
}

export async function POST(req: Request) {
  const { messages = [], patientContext } = (await req.json()) as {
    messages?: IncomingMessage[];
    patientContext?: unknown;
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response(
      "The assistant isn't configured yet — set ANTHROPIC_API_KEY to enable grounded answers.",
      { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const result = streamText({
    model: anthropic(MODEL),
    system: `${SYSTEM_PROMPT}\n\n<patient_context>\n${JSON.stringify(
      patientContext ?? {},
      null,
      2,
    )}\n</patient_context>`,
    messages: messages
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role, content: m.text })),
  });

  return result.toTextStreamResponse();
}
