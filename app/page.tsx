"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Console from "@/app/components/Console";
import { citationLabels } from "@/lib/citations";
import { buildGlance, safetyScan } from "@/lib/glance";
import { resourceIndex } from "@/lib/resources";
import {
  SEED_ALERTS,
  SEED_CONVERSATION,
  SEED_GLANCE,
  type ChatMessage,
} from "@/lib/assistant";
import { sendChat } from "@/lib/chat-client";
import { mapMedications, patientView } from "@/lib/fhir";
import {
  buildPatientContext,
  type ContextObservation,
  type ContextProblem,
} from "@/lib/grounding";
import {
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
} from "@/lib/seed";
import { loadChart } from "@/lib/smart";
import type {
  MedicationRequest,
  MedView,
  Patient,
  PatientView,
} from "@/lib/types";

interface ChartView {
  patient: PatientView;
  meds: MedView[];
  allergies: string[];
  codeStatus: string;
  problems: ContextProblem[];
  observations: ContextObservation[];
}

function toView(
  patient: Patient,
  meds: MedicationRequest[],
  allergies: string[],
  codeStatus: string,
  problems: ContextProblem[],
  observations: ContextObservation[],
): ChartView {
  return {
    patient: patientView(patient),
    meds: mapMedications(meds),
    allergies,
    codeStatus,
    problems,
    observations,
  };
}

const DEMO_VIEW = toView(
  SEED_PATIENT,
  SEED_MEDICATIONS,
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
);

type Phase = "loading" | "live" | "demo";

export default function Home() {
  // Start in `loading`: we don't yet know if a SMART session is in context. The
  // synthetic Jane-Doe seed (glance / safety scan / conversation) is shown ONLY
  // once we confirm `demo`, and real data once we confirm `live` — so the seed
  // never flashes-then-disappears on a live launch.
  const [view, setView] = useState<ChartView>(DEMO_VIEW);
  const [phase, setPhase] = useState<Phase>("loading");

  useEffect(() => {
    let cancelled = false;
    loadChart()
      .then(({ patient, medications, problems, observations }) => {
        if (cancelled) return;
        setView(
          toView(
            patient,
            medications,
            [],
            "Code status unknown",
            problems,
            observations,
          ),
        );
        setPhase("live");
      })
      .catch(() => {
        // No SMART session in context — fall back to the synthetic demo chart.
        if (!cancelled) setPhase("demo");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const context = useMemo(
    () =>
      buildPatientContext(
        view.patient,
        view.meds,
        view.problems,
        view.observations,
      ),
    [view],
  );
  const labels = useMemo(() => citationLabels(context), [context]);
  const resources = useMemo(() => resourceIndex(context), [context]);

  // Dock content by phase: seed for demo, computed-from-chart for live, empty
  // while loading (no dummy flash).
  const glance = useMemo(() => {
    if (phase === "demo") return SEED_GLANCE;
    if (phase === "live") return buildGlance(context);
    return undefined;
  }, [phase, context]);
  const alerts = useMemo(() => {
    if (phase === "demo") return SEED_ALERTS;
    if (phase === "live") return safetyScan(context);
    return [];
  }, [phase, context]);
  const initialMessages = phase === "demo" ? SEED_CONVERSATION : [];

  const respond = useCallback(
    (text: string, history: ChatMessage[]) => sendChat(text, history, context),
    [context],
  );

  // Key by phase + patient id so Console remounts (re-seeding its message state)
  // when we transition loading → demo/live or swap to the launched patient.
  return (
    <Console
      key={`${phase}:${view.patient.id}`}
      patient={view.patient}
      meds={view.meds}
      allergies={view.allergies}
      codeStatus={view.codeStatus}
      dataMode={phase === "live" ? "live" : "synthetic"}
      glance={glance}
      alerts={alerts}
      initialMessages={initialMessages}
      context={context}
      citationLabels={labels}
      resources={resources}
      respond={respond}
    />
  );
}
