import type { ChatMessage, GlanceData, SafetyAlert } from "@/lib/assistant";
import AtAGlance from "./AtAGlance";
import Composer from "./Composer";
import Conversation from "./Conversation";
import SafetyScan from "./SafetyScan";

export interface AssistantDockProps {
  patientLabel: string;
  glance?: GlanceData;
  alerts?: SafetyAlert[];
  messages: ChatMessage[];
  pending?: boolean;
  onSend?: (text: string) => void;
  composerPlaceholder?: string;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}

export function AssistantDock({
  patientLabel,
  glance,
  alerts = [],
  messages,
  pending,
  onSend,
  composerPlaceholder,
  citationLabels,
  onCitationClick,
}: AssistantDockProps) {
  return (
    <aside
      aria-label="Assistant"
      className="flex min-h-0 w-[412px] flex-none flex-col overflow-hidden border-l border-[#d2d8e0] bg-[#f4f6f9]"
    >
      <header className="flex shrink-0 items-center gap-[9px] border-b border-[#d2d8e0] bg-[#16202e] px-4 py-[11px] text-white">
        <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-[5px] bg-[#2756e6]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#fff" aria-hidden>
            <path d="M12 2.5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
          </svg>
        </span>
        <span className="text-[13.5px] font-bold">Assistant</span>
        <span className="ml-auto flex items-center gap-[5px] rounded-[4px] bg-[#233247] px-2 py-1 font-mono text-[10.5px] text-[#9fb0c7]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          patient={patientLabel.replace(/\s+/g, "")}
        </span>
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
          </>
        }
      />
      <Composer placeholder={composerPlaceholder} onSend={onSend} />
    </aside>
  );
}

export default AssistantDock;
