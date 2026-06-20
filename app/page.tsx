"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Console from "@/app/components/Console";
import { citationLabels } from "@/lib/citations";
import { buildGlance, safetyScan } from "@/lib/glance";
import { buildHealthMaintenance, preventiveSummary } from "@/lib/preventive";
import { resourceIndex } from "@/lib/resources";
import {
  SEED_ALERTS,
  SEED_CONVERSATION,
  SEED_GLANCE,
  type ChatMessage,
} from "@/lib/assistant";
import { sendChat } from "@/lib/chat-client";
import { mapImmunizations, mapMedications, mapProcedures, patientView } from "@/lib/fhir";
import {
  buildPatientContext,
  type ContextImmunization,
  type ContextObservation,
  type ContextProblem,
  type ContextProcedure,
} from "@/lib/grounding";
import {
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
  SEED_IMMUNIZATIONS,
  SEED_MEDICATIONS,
  SEED_OBSERVATIONS,
  SEED_PATIENT,
  SEED_PROBLEMS,
  SEED_PROCEDURES,
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
  immunizations: ContextImmunization[];
  procedures: ContextProcedure[];
}

function toView(
  patient: Patient,
  meds: MedicationRequest[],
  allergies: string[],
  codeStatus: string,
  problems: ContextProblem[],
  observations: ContextObservation[],
  immunizations: ContextImmunization[],
  procedures: ContextProcedure[],
): ChartView {
  return {
    patient: patientView(patient),
    meds: mapMedications(meds),
    allergies,
    codeStatus,
    problems,
    observations,
    immunizations,
    procedures,
  };
}

const DEMO_VIEW = toView(
  SEED_PATIENT,
  SEED_MEDICATIONS,
  SEED_ALLERGIES,
  SEED_CODE_STATUS,
  SEED_PROBLEMS,
  SEED_OBSERVATIONS,
  mapImmunizations(SEED_IMMUNIZATIONS),
  mapProcedures(SEED_PROCEDURES),
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
      .then(
        ({
          patient,
          medications,
          problems,
          observations,
          immunizations,
          procedures,
        }) => {
          if (cancelled) return;
          setView(
            toView(
              patient,
              medications,
              [],
              "Code status unknown",
              problems,
              observations,
              immunizations,
              procedures,
            ),
          );
          setPhase("live");
        },
      )
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
        view.immunizations,
        view.procedures,
      ),
    [view],
  );
  const labels = useMemo(() => citationLabels(context), [context]);
  const resources = useMemo(() => resourceIndex(context), [context]);

  // Dock content by phase: seed for demo, computed-from-chart for live, empty
  // while loading (no dummy flash).
  const glance = useMemo(() => {
    // Demo keeps the curated seed prose but merges the live preventive rollups
    // (computed from the seed chart) so At a Glance and the section agree.
    if (phase === "demo") return { ...SEED_GLANCE, ...preventiveSummary(context) };
    if (phase === "live") return buildGlance(context);
    return undefined;
  }, [phase, context]);
  const alerts = useMemo(() => {
    if (phase === "demo") return SEED_ALERTS;
    if (phase === "live") return safetyScan(context);
    return [];
  }, [phase, context]);
  // The preventive section is computed from the in-context chart in both demo
  // and live (the seed populates demo's context); empty while loading.
  const healthMaintenance = useMemo(
    () => (phase === "loading" ? [] : buildHealthMaintenance(context)),
    [phase, context],
  );
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
      healthMaintenance={healthMaintenance}
      initialMessages={initialMessages}
      citationLabels={labels}
      resources={resources}
      respond={respond}
    />
  );
}
