"use client";

import { useCallback, useEffect, useState } from "react";
import Console from "@/app/components/Console";
import {
  SEED_ALERTS,
  SEED_CONVERSATION,
  SEED_GLANCE,
  type ChatMessage,
} from "@/lib/assistant";
import { streamChat } from "@/lib/chat-client";
import { mapMedications, patientView } from "@/lib/fhir";
import { buildPatientContext } from "@/lib/grounding";
import {
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
  SEED_MEDICATIONS,
  SEED_PATIENT,
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
}

function toView(
  patient: Patient,
  meds: MedicationRequest[],
  allergies: string[],
  codeStatus: string,
): ChartView {
  return {
    patient: patientView(patient),
    meds: mapMedications(meds),
    allergies,
    codeStatus,
  };
}

const DEMO_VIEW = toView(
  SEED_PATIENT,
  SEED_MEDICATIONS,
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
);

export default function Home() {
  // Render the synthetic demo chart immediately so the console works on Vercel
  // without a SMART session; swap to live data once oauth2.ready() resolves.
  const [view, setView] = useState<ChartView>(DEMO_VIEW);

  useEffect(() => {
    let cancelled = false;
    loadChart()
      .then(({ patient, medications }) => {
        if (!cancelled) {
          setView(toView(patient, medications, [], "Code status unknown"));
        }
      })
      .catch(() => {
        // No SMART session in context — keep the synthetic demo chart.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const respond = useCallback(
    (text: string, history: ChatMessage[]) =>
      streamChat(text, history, buildPatientContext(view.patient, view.meds)),
    [view],
  );

  return (
    <Console
      patient={view.patient}
      meds={view.meds}
      allergies={view.allergies}
      codeStatus={view.codeStatus}
      dataMode="synthetic"
      glance={SEED_GLANCE}
      alerts={SEED_ALERTS}
      initialMessages={SEED_CONVERSATION}
      respond={respond}
    />
  );
}
