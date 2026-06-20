"use client";

// Browser responder: POSTs the conversation + patient grounding to /api/chat and
// accumulates the streamed text into a single assistant message. Plugged into
// <Console respond={…}>.

import type { ChatMessage } from "./assistant";
import type { PatientContext } from "./grounding";

let _seq = 0;
const nextId = () => `r${(_seq += 1)}`;

export async function streamChat(
  text: string,
  history: ChatMessage[],
  patientContext: PatientContext,
): Promise<ChatMessage> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, text: m.text })),
      patientContext,
    }),
  });

  if (!res.ok || !res.body) {
    throw new Error(`chat request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let acc = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    acc += decoder.decode(value, { stream: true });
  }
  acc += decoder.decode();

  // void the unused param lint while keeping the signature Console expects
  void text;

  return { id: nextId(), role: "assistant", text: acc.trim() || "(no response)" };
}
