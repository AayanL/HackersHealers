"use client";

import { ChartPage, EmptyState } from "./ChartPage";

export function AllergiesView({ allergies }: { allergies: string[] }) {
  return (
    <ChartPage
      title="Allergies"
      count={allergies.length ? `${allergies.length} on file` : undefined}
    >
      {allergies.length === 0 ? (
        <EmptyState>
          No known allergies recorded. Absence of a record is not the same as
          confirmed no-allergy — verify with the patient.
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[6px] border border-[#d2d8e0] bg-white">
          {allergies.map((a) => (
            <div
              key={a}
              data-testid="allergy-row"
              className="flex items-center gap-[9px] border-b border-l-[3px] border-[#eaedf1] border-l-[#e8a93b] bg-[#fdf8ee] px-[14px] py-[11px] last:border-b-0"
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9a6400"
                strokeWidth={2.2}
                aria-hidden
              >
                <path d="M12 4 21 19H3z" />
                <path d="M12 10v4" strokeLinecap="round" />
              </svg>
              <span className="text-[13px] font-bold text-[#9a6400]">{a}</span>
            </div>
          ))}
        </div>
      )}
    </ChartPage>
  );
}

export default AllergiesView;
