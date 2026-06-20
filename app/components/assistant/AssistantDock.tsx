"use client";

import { useState } from "react";
import type {
  ChatMessage,
  GlanceData,
  HealthMaintenanceItem,
  SafetyAlert,
} from "@/lib/assistant";
import AtAGlance from "./AtAGlance";
import Composer from "./Composer";
import Conversation from "./Conversation";
import HealthMaintenance from "./HealthMaintenance";
import SafetyScan from "./SafetyScan";

export interface AssistantDockProps {
  patientLabel: string;
  glance?: GlanceData;
  alerts?: SafetyAlert[];
  healthMaintenance?: HealthMaintenanceItem[];
  messages: ChatMessage[];
  pending?: boolean;
  onSend?: (text: string) => void;
  composerPlaceholder?: string;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}

function SparkleMark() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden>
      <path d="M12 2.5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    </svg>
  );
}

export function AssistantDock({
  patientLabel,
  glance,
  alerts = [],
  healthMaintenance = [],
  messages,
  pending,
  onSend,
  composerPlaceholder,
  citationLabels,
  onCitationClick,
}: AssistantDockProps) {
  const [collapsed, setCollapsed] = useState(false);

  // Collapsed: a thin rail pinned to the chart edge with a single re-open
  // control, so the chart reclaims the full width but the assistant is one
  // click away. Keeps the "Assistant" accessible name on the same landmark.
  if (collapsed) {
    return (
      <aside
        aria-label="Assistant"
        className="flex w-[42px] flex-none flex-col items-center gap-3 border-l border-[#d2d8e0] bg-[#16202e] py-3"
      >
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          aria-expanded={false}
          aria-label="Expand assistant"
          className="flex h-[28px] w-[28px] flex-none cursor-pointer items-center justify-center rounded-[5px] bg-[#2756e6] text-white"
        >
          <SparkleMark />
        </button>
        <span className="select-none text-[10px] font-bold uppercase tracking-[0.18em] text-[#9fb0c7] [writing-mode:vertical-rl]">
          Assistant
        </span>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Assistant"
      className="flex min-h-0 w-[412px] flex-none flex-col overflow-hidden border-l border-[#d2d8e0] bg-[#f4f6f9]"
    >
      <header className="flex shrink-0 items-center gap-[9px] border-b border-[#d2d8e0] bg-[#16202e] px-4 py-[11px] text-white">
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] bg-[#2756e6]">
          <SparkleMark />
        </span>
        <span className="text-[13.5px] font-bold">Assistant</span>
        <span className="ml-auto flex items-center gap-[5px] rounded-[4px] bg-[#233247] px-2 py-1 font-mono text-[10.5px] text-[#9fb0c7]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          patient={patientLabel.replace(/\s+/g, "")}
        </span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          aria-expanded={true}
          aria-label="Collapse assistant"
          className="flex h-[24px] w-[24px] flex-none cursor-pointer items-center justify-center rounded-[5px] text-[#9fb0c7] hover:bg-[#233247] hover:text-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </header>

      <Conversation
        messages={messages}
        pending={pending}
        citationLabels={citationLabels}
        onCitationClick={onCitationClick}
        topSlot={
          <>
            {glance ? <AtAGlance glance={glance} /> : null}
            <SafetyScan alerts={alerts} />
            <HealthMaintenance
              items={healthMaintenance}
              citationLabels={citationLabels}
              onCitationClick={onCitationClick}
              onDraftOrder={
                onSend
                  ? (item) =>
                      onSend(
                        item.kind === "immunization"
                          ? `Draft an order to administer the ${item.title}.`
                          : `Draft an order for ${item.title}.`,
                      )
                  : undefined
              }
              onDiscuss={
                onSend
                  ? (item) =>
                      onSend(
                        `Is ${item.title} indicated for this patient, and what are the options?`,
                      )
                  : undefined
              }
            />
          </>
        }
      />
      <Composer placeholder={composerPlaceholder} onSend={onSend} />
    </aside>
  );
}

export default AssistantDock;
