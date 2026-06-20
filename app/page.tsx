"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Console from "@/app/components/Console";
import { citationLabels } from "@/lib/citations";
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

export default function Home() {
  // Render the synthetic demo chart immediately so the console works on Vercel
  // without a SMART session; swap to live data once oauth2.ready() resolves.
  const [view, setView] = useState<ChartView>(DEMO_VIEW);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadChart()
      .then(({ patient, medications, problems, observations }) => {
        if (!cancelled) {
          setLive(true);
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
        }
      })
      .catch(() => {
        // No SMART session in context — keep the synthetic demo chart.
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

  const respond = useCallback(
    (text: string, history: ChatMessage[]) => sendChat(text, history, context),
    [context],
  );

  // The seed glance / safety scan / conversation are Jane-Doe demo content. On a
  // real SMART launch they would be wrong for the in-context patient, so start
  // the live dock clean. Keying by patient id remounts Console (resetting its
  // message state) when we swap from the demo patient to the launched one.
  return (
    <Console
      key={view.patient.id}
      patient={view.patient}
      meds={view.meds}
      allergies={view.allergies}
      codeStatus={view.codeStatus}
      dataMode={live ? "live" : "synthetic"}
      glance={live ? undefined : SEED_GLANCE}
      alerts={live ? [] : SEED_ALERTS}
      initialMessages={live ? [] : SEED_CONVERSATION}
      citationLabels={labels}
      resources={resources}
      respond={respond}
    />
  );
}
