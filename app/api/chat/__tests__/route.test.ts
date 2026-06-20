import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// vi.mock is hoisted above imports, so the mock fn must be created with
// vi.hoisted() to exist when the factory runs. Typed so mock.calls is inspectable.
const { streamTextMock } = vi.hoisted(() => ({
  streamTextMock: vi.fn<
    (opts: {
      system: string;
      messages: { role: string; content: string }[];
    }) => { toTextStreamResponse: () => Response }
  >(),
}));

vi.mock("ai", () => ({ streamText: streamTextMock }));
vi.mock("@ai-sdk/anthropic", () => ({
  anthropic: (id: string) => ({ modelId: id }),
}));

import { POST } from "@/app/api/chat/route";

function post(body: unknown): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat", () => {
  beforeEach(() => {
    streamTextMock.mockReset();
    streamTextMock.mockReturnValue({
      toTextStreamResponse: () =>
        new Response("streamed", {
          headers: { "content-type": "text/plain; charset=utf-8" },
        }),
    });
  });
  afterEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("returns a graceful notice when no API key is configured", async () => {
    const res = await POST(post({ messages: [{ role: "user", text: "hi" }] }));
    expect(res.status).toBe(200);
    expect(await res.text()).toMatch(/ANTHROPIC_API_KEY/);
    expect(streamTextMock).not.toHaveBeenCalled();
  });

  it("grounds the model on the patient context and forwards messages", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    const res = await POST(
      post({
        messages: [{ role: "user", text: "Why lisinopril?" }],
        patientContext: { patient: { name: "Jane Doe" } },
      }),
    );
    expect(res).toBeInstanceOf(Response);
    expect(streamTextMock).toHaveBeenCalledOnce();

    const arg = streamTextMock.mock.calls[0][0];
    expect(arg.system).toContain("Jane Doe");
    expect(arg.system).toContain("decision support");
    expect(arg.messages).toEqual([
      { role: "user", content: "Why lisinopril?" },
    ]);
  });
});
