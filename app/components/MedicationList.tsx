"use client";

import type { MedView } from "@/lib/types";

export interface MedicationListProps {
  meds: MedView[];
  onReconcile?: () => void;
}

export function MedicationList({ meds, onReconcile }: MedicationListProps) {
  const active = meds.filter((m) => m.status === "active").length;

  return (
    <main className="min-w-0 flex-1 overflow-y-auto px-[20px] py-[16px]">
      <div className="mb-3 flex items-center gap-[10px]">
        <h1 className="m-0 text-[16px] font-extrabold tracking-[-0.01em]">
          Medications
        </h1>
        <span className="font-mono text-[11.5px] text-[#8a93a2]">
          active={active}
        </span>
        <button
          type="button"
          onClick={onReconcile}
          className="ml-auto flex items-center gap-1.5 rounded-[5px] border border-[#2756e6] bg-[#2756e6] px-3 py-[7px] text-[12px] font-bold text-white"
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
          >
            <path d="m9 11 3 3 8-8" />
            <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
          </svg>
          Reconcile
        </button>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-[#d2d8e0] bg-white">
        <div className="grid grid-cols-[1fr_130px_96px] gap-[10px] border-b border-[#d2d8e0] bg-[#f4f6f9] px-[14px] py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
          <span>Medication</span>
          <span>Indication</span>
          <span className="text-right">Since</span>
        </div>

        {meds.map((m) => {
          const noDx = m.indication == null;
          return (
            <div
              key={m.id}
              data-testid="med-row"
              className={`grid grid-cols-[1fr_130px_96px] items-center gap-[10px] border-b border-[#eaedf1] px-[14px] py-[10px] last:border-b-0 ${
                noDx ? "border-l-[3px] border-l-[#e8a93b] bg-[#fdf8ee]" : ""
              }`}
            >
              <div>
                <span className="text-[13.5px] font-bold">{m.name}</span>
                {m.sig ? (
                  <div className="font-mono text-[11.5px] text-[#5b6470]">
                    {m.sig}
                  </div>
                ) : null}
              </div>
              {noDx ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#9a6400]">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2.4}
                    aria-hidden
                  >
                    <path d="M12 4 21 19H3z" />
                  </svg>
                  <span>no dx</span>
                </span>
              ) : (
                <span className="text-[11.5px] text-[#3a4a5e]">
                  {m.indication}
                </span>
              )}
              <span className="text-right font-mono text-[11px] text-[#8a93a2]">
                {m.since}
              </span>
            </div>
          );
        })}
      </div>
    </main>
  );
}

export default MedicationList;
