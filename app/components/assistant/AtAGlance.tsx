"use client";

import { useState } from "react";
import type { GlanceData } from "@/lib/assistant";

function SparkleIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.5l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" />
    </svg>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <span className="self-center font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
        {label}
      </span>
      <span className="text-[11.5px] text-[#1f242b]">{children}</span>
    </>
  );
}

export function AtAGlance({ glance }: { glance: GlanceData }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="shrink-0 px-[14px] pt-[13px]">
      <div className="overflow-hidden rounded-[5px] border border-[#d2d8e0] border-t-[3px] border-t-[#2756e6] bg-white">
        <div className="flex items-center gap-[7px] px-3 pb-[7px] pt-[9px]">
          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-[4px] bg-[#e4eafd] text-[#2756e6]">
            <SparkleIcon />
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-[0.06em] text-[#3a4a5e]">
            At a glance
          </span>
          <span className="ml-auto font-mono text-[9.5px] text-[#8a93a2]">
            synthesized on open
          </span>
        </div>
        <div className="px-3 pb-[9px] text-[12.5px] leading-[1.5] text-[#1f242b]">
          {glance.summary}
        </div>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[6px] border-t border-[#eaedf1] bg-[#fafbfd] px-3 py-[9px]">
          <Field label="Problems">{glance.problems}</Field>
          <Field label="Meds">{glance.medsActive} active</Field>
          <Field label="Allergy">
            <span className="font-semibold text-[#9a6400]">{glance.allergy}</span>
          </Field>
          <Field label="Flagged">{glance.flagged}</Field>
          <Field label="Last visit">
            <span className="font-mono">{glance.lastVisit}</span>
          </Field>
        </div>
        <div className="flex items-center gap-2 border-t border-[#eaedf1] px-3 py-2">
          <span className="font-mono text-[9.5px] text-[#8a93a2]">
            grounded · {glance.resourceCount} resources
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="ml-auto cursor-pointer select-none border-none bg-none text-[11px] font-bold text-[#2756e6]"
          >
            {open ? "Hide summary ▴" : "Full summary →"}
          </button>
        </div>
        {open ? (
          <div className="flex flex-col gap-2 border-t border-[#eaedf1] bg-[#fafbfd] px-3 py-[11px] text-[12px] leading-[1.5] text-[#1f242b]">
            {glance.details ? (
              glance.details.length > 0 ? (
                glance.details.map((d) => <div key={d}>{d}</div>)
              ) : (
                <div className="text-[#8a93a2]">
                  No additional findings from the chart.
                </div>
              )
            ) : (
              <>
                <div>
                  <strong>Hypertension</strong> — controlled on lisinopril 10 mg +
                  amlodipine 5 mg.
                </div>
                <div>
                  <strong>Metformin</strong> 500 mg BID active with no diabetes
                  problem charted — clarify.
                </div>
                <div>
                  <strong>Labs</strong> — K⁺ 5.3 ▲ (2026-06-10), eGFR 58; A1c not
                  on file.
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default AtAGlance;
