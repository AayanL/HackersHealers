"use client";

import type { GlanceData, HealthMaintenanceItem } from "@/lib/assistant";
import type { PatientView } from "@/lib/types";
import { ChartPage, EmptyState } from "./ChartPage";

function StatCard({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="rounded-[6px] border border-[#d2d8e0] bg-white px-[13px] py-[10px]">
      <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#8a93a2]">
        {label}
      </div>
      <div
        className={`mt-[3px] text-[12.5px] leading-[1.4] text-[#1f242b] ${
          mono ? "font-mono" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

export function Snapshot({
  patient,
  glance,
  allergies,
  healthMaintenance = [],
}: {
  patient: PatientView;
  glance?: GlanceData;
  allergies: string[];
  healthMaintenance?: HealthMaintenanceItem[];
}) {
  return (
    <ChartPage title="Snapshot" count={patient.sexAge || undefined}>
      {glance ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-[6px] border border-[#d2d8e0] border-t-[3px] border-t-[#2756e6] bg-white px-4 py-[11px] text-[13px] leading-[1.5] text-[#1f242b]">
            {glance.summary}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard label="Problems" value={glance.problems} />
            <StatCard
              label="Active medications"
              value={`${glance.medsActive}`}
            />
            <StatCard
              label="Allergies"
              value={allergies.length ? allergies.join(", ") : "None recorded"}
            />
            <StatCard label="Flagged labs" value={glance.flagged} />
            {glance.vaccines ? (
              <StatCard label="Vaccines" value={glance.vaccines} />
            ) : null}
            {glance.screenings ? (
              <StatCard label="Screenings" value={glance.screenings} />
            ) : null}
            <StatCard label="Last visit" value={glance.lastVisit} mono />
          </div>

          {healthMaintenance.length > 0 ? (
            <div className="rounded-[6px] border border-[#d2d8e0] bg-white px-4 py-[11px]">
              <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.06em] text-[#8a93a2]">
                Health maintenance · {healthMaintenance.length} actionable
              </div>
              <ul className="m-0 mt-[7px] flex flex-col gap-[5px] p-0">
                {healthMaintenance.map((h) => (
                  <li
                    key={h.id}
                    className="flex items-center gap-[7px] text-[12px] text-[#1f242b]"
                  >
                    <span className="rounded-[3px] bg-[#fbefd6] px-[5px] py-[1px] font-mono text-[9px] font-bold uppercase text-[#9a6400]">
                      {h.status}
                    </span>
                    {h.title}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="font-mono text-[9.5px] text-[#8a93a2]">
            grounded · {glance.resourceCount} resources
          </div>
        </div>
      ) : (
        <EmptyState>Loading the patient snapshot…</EmptyState>
      )}
    </ChartPage>
  );
}

export default Snapshot;
