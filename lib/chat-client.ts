"use client";

// Browser responder: POSTs the conversation + patient grounding to /api/chat
// and returns the assistant turn — narration text plus an optional typed
// tool-result card. Plugged into <Console respond={…}>.

import type { CardData, ChatMessage } from "./assistant";
import type { PatientContext } from "./grounding";

let _seq = 0;
const nextId = () => `r${(_seq += 1)}`;

interface ChatResponse {
  text?: string;
  card?: CardData | null;
}

export async function sendChat(
  text: string,
  history: ChatMessage[],
  patientContext: PatientContext,
): Promise<ChatMessage> {
  void text; // signature kept for the Console respond() contract
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: history.map((m) => ({ role: m.role, text: m.text })),
      patientContext,
    }),
  });

  if (!res.ok) {
    throw new Error(`chat request failed (${res.status})`);
  }

  const data = (await res.json()) as ChatResponse;
  return {
    id: nextId(),
    role: "assistant",
    text: (data.text ?? "").trim() || "(no response)",
    card: data.card ?? undefined,
  };
}
