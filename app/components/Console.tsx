"use client";

import { useCallback, useRef, useState } from "react";
import type {
  ChatMessage,
  GlanceData,
  HealthMaintenanceItem,
  SafetyAlert,
} from "@/lib/assistant";
import { type ResourceDetail, unknownResource } from "@/lib/resources";
import type { MedView, PatientView } from "@/lib/types";
import AppBar from "./AppBar";
import ChartSidebar from "./ChartSidebar";
import DemoBanner from "./DemoBanner";
import MedicationList from "./MedicationList";
import PatientBanner from "./PatientBanner";
import AssistantDock from "./assistant/AssistantDock";
import ReferenceDrawer from "./assistant/ReferenceDrawer";

export interface ConsoleProps {
  patient: PatientView;
  meds: MedView[];
  allergies?: string[];
  codeStatus?: string;
  dataMode?: string;
  glance?: GlanceData;
  alerts?: SafetyAlert[];
  healthMaintenance?: HealthMaintenanceItem[];
  initialMessages?: ChatMessage[];
  /** Resource ref → human label, for resolving inline citation chips. */
  citationLabels?: Record<string, string>;
  /** Resource ref → full detail, opened in the reference drawer on click. */
  resources?: Record<string, ResourceDetail>;
  /** Produces the assistant reply. Defaults to a placeholder until /api/chat is wired. */
  respond?: (text: string, history: ChatMessage[]) => Promise<ChatMessage>;
}

let _seq = 0;
const nextId = () => `m${(_seq += 1)}`;

async function defaultRespond(): Promise<ChatMessage> {
  return {
    id: nextId(),
    role: "assistant",
    text: "The live assistant isn't connected in this build yet — wiring the grounded model endpoint (/api/chat) is the next step.",
  };
}

export function Console({
  patient,
  meds,
  allergies = [],
  codeStatus = "Full code",
  dataMode = "synthetic",
  glance,
  alerts = [],
  healthMaintenance = [],
  initialMessages = [],
  citationLabels,
  resources = {},
  respond,
}: ConsoleProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [pending, setPending] = useState(false);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const ref = useRef<ChatMessage[]>(initialMessages);

  const push = useCallback((m: ChatMessage) => {
    const next = [...ref.current, m];
    ref.current = next;
    setMessages(next);
  }, []);

  const handleSend = useCallback(
    (text: string) => {
      push({ id: nextId(), role: "user", text });
      setPending(true);
      Promise.resolve((respond ?? defaultRespond)(text, ref.current))
        .then((reply) => push(reply))
        .catch(() =>
          push({
            id: nextId(),
            role: "assistant",
            text: "Sorry — I couldn't reach the assistant service.",
          }),
        )
        .finally(() => setPending(false));
    },
    [push, respond],
  );

  const firstName = patient.name.split(/\s+/)[0] || "the patient";

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#e9ecf1] font-sans text-[#15181d]">
      <DemoBanner dataMode={dataMode} />
      <AppBar />
      <PatientBanner
        patient={patient}
        allergies={allergies}
        codeStatus={codeStatus}
      />
      <div className="flex min-h-0 flex-1 items-stretch">
        <ChartSidebar active="Medications" />
        <MedicationList
          meds={meds}
          onReconcile={() => handleSend("Reconcile her meds.")}
        />
        <AssistantDock
          patientLabel={patient.name}
          glance={glance}
          alerts={alerts}
          healthMaintenance={healthMaintenance}
          messages={messages}
          pending={pending}
          onSend={handleSend}
          composerPlaceholder={`Ask about ${firstName}…`}
          citationLabels={citationLabels}
          onCitationClick={setSelectedRef}
        />
      </div>
      <ReferenceDrawer
        resource={
          selectedRef
            ? (resources[selectedRef] ?? unknownResource(selectedRef))
            : null
        }
        onClose={() => setSelectedRef(null)}
      />
    </div>
  );
}

export default Console;
