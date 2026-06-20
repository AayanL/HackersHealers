"use client";

import type { ContextProblem } from "@/lib/grounding";
import { CitationLink } from "../assistant/CitationLink";
import { ChartPage, EmptyState } from "./ChartPage";

export function ProblemsView({
  problems,
  citationLabels,
  onCitationClick,
}: {
  problems: ContextProblem[];
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <ChartPage
      title="Problems"
      count={problems.length ? `${problems.length} on file` : undefined}
    >
      {problems.length === 0 ? (
        <EmptyState>No problems charted for this patient.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[6px] border border-[#d2d8e0] bg-white">
          {problems.map((p) => (
            <div
              key={p.ref}
              data-testid="problem-row"
              className="flex items-center gap-[10px] border-b border-[#eaedf1] px-[14px] py-[11px] last:border-b-0"
            >
              <span className="text-[13.5px] font-bold text-[#1f242b]">
                {p.name}
              </span>
              <span className="ml-auto">
                <CitationLink
                  refId={p.ref}
                  label={citationLabels?.[p.ref]}
                  onClick={onCitationClick}
                />
              </span>
            </div>
          ))}
        </div>
      )}
    </ChartPage>
  );
}

export default ProblemsView;
