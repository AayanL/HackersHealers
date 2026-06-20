import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Partially mock "ai": keep the real `tool`/`jsonSchema` (so buildAssistantTools
// produces working tools) but stub `generateText`/`stepCountIs`.
const { generateTextMock } = vi.hoisted(() => ({
  generateTextMock: vi.fn(),
}));

vi.mock("ai", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ai")>();
  return { ...actual, generateText: generateTextMock, stepCountIs: () => "stop" };
});
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (id: string) => ({ modelId: id }),
}));

import { POST } from "@/app/api/chat/route";
import type { PatientContext } from "@/lib/grounding";

const ctx: PatientContext = {
  patient: { name: "Jane Doe", sexAge: "68 F", dob: "1958-03-11", mrn: "x" },
  medications: [
    {
      ref: "MedicationRequest/metformin-500",
      name: "Metformin 500 mg",
      sig: "1 tab PO BID",
      indication: null,
      status: "active",
      since: "2025-11-10",
    },
  ],
  problems: [],
  observations: [
    { code: "2823-3", label: "Potassium", value: 5.3, unit: "mmol/L", date: "2026-06-10", ref: "Observation/k" },
  ],
};

function post(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    generateTextMock.mockReset();
    // Simulate the model deciding to reconcile: call the tool, then narrate.
    generateTextMock.mockImplementation(
      async ({ tools }: { tools: Record<string, { execute: (i: unknown, o: unknown) => Promise<unknown> }> }) => {
        await tools.reconcile_medications.execute(
          {},
          { toolCallId: "t1", messages: [] },
        );
        return { text: "Here's the reconciliation." };
      },
    );
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("runs the deterministic router (no model) when no API key is set", async () => {
    const res = await POST(
      post({
        messages: [{ role: "user", text: "Reconcile her meds." }],
        patientContext: ctx,
      }),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(generateTextMock).not.toHaveBeenCalled();
    expect(data.card.kind).toBe("reconcile");
    // Grounded: the metformin gap is computed from the posted context.
    expect(
      data.card.findings.some((f: { type: string }) => f.type === "gap"),
    ).toBe(true);
  });

  it("returns a trend card for a lab question without a key", async () => {
    const res = await POST(
      post({
        messages: [{ role: "user", text: "Show her potassium trend." }],
        patientContext: ctx,
      }),
    );
    const data = await res.json();
    expect(data.card.kind).toBe("trend");
  });

  it("grounds the model, forwards messages, and returns the tool card with a key", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const res = await POST(
      post({
        messages: [{ role: "user", text: "Reconcile her meds." }],
        patientContext: ctx,
      }),
    );
    expect(generateTextMock).toHaveBeenCalledOnce();

    const arg = generateTextMock.mock.calls[0][0];
    expect(arg.system).toContain("Jane Doe");
    expect(arg.system).toContain("decision support");
    expect(arg.messages).toEqual([
      { role: "user", content: "Reconcile her meds." },
    ]);
    expect(Object.keys(arg.tools)).toContain("reconcile_medications");

    const data = await res.json();
    expect(data.text).toBe("Here's the reconciliation.");
    expect(data.card.kind).toBe("reconcile");
  });
});
