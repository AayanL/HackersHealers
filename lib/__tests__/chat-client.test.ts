import { afterEach, describe, expect, it, vi } from "vitest";
import type { PatientContext } from "@/lib/grounding";
import { sendChat } from "@/lib/chat-client";

const ctx: PatientContext = {
  patient: { name: "Jane Doe", sexAge: "68 F", dob: "1958-03-11", mrn: "x" },
  medications: [],
  problems: [],
  observations: [],
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sendChat", () => {
  it("returns the narration text and the typed card from the route", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          text: "Here's the reconciliation.",
          card: { kind: "reconcile", findings: [], coverageGaps: [] },
        }),
      ),
    );

    const msg = await sendChat("Reconcile her meds.", [], ctx);
    expect(msg.role).toBe("assistant");
    expect(msg.text).toBe("Here's the reconciliation.");
    expect(msg.card?.kind).toBe("reconcile");
  });

  it("POSTs the history and patient context to /api/chat", async () => {
    // Typed so mock.calls[0] is a [url, init] tuple, with no unused params.
    const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
    fetchMock.mockResolvedValue(jsonResponse({ text: "ok", card: null }));
    vi.stubGlobal("fetch", fetchMock);

    await sendChat(
      "hi",
      [{ id: "u1", role: "user", text: "earlier" }],
      ctx,
    );

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/chat");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.patientContext.patient.name).toBe("Jane Doe");
    expect(body.messages).toEqual([{ role: "user", text: "earlier" }]);
  });

  it("throws when the route responds with an error status", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({}, 500)));
    await expect(sendChat("hi", [], ctx)).rejects.toThrow(/failed/);
  });
});
