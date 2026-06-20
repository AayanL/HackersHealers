"use client";

import { RANGES } from "@/lib/clinical";
import { formatQuantity } from "@/lib/format";
import type { ContextObservation } from "@/lib/grounding";
import { CitationLink } from "../assistant/CitationLink";
import { ChartPage, EmptyState } from "./ChartPage";

function flagOf(o: ContextObservation): "high" | "low" | null {
  const r = o.code ? RANGES[o.code] : undefined;
  if (!r) return null;
  if (o.value > r.high) return "high";
  if (o.value < r.low) return "low";
  return null;
}

export function ResultsView({
  observations,
  citationLabels,
  onCitationClick,
}: {
  observations: ContextObservation[];
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const rows = [...observations].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ChartPage
      title="Results"
      count={rows.length ? `${rows.length} results` : undefined}
    >
      {rows.length === 0 ? (
        <EmptyState>No laboratory results on file for this patient.</EmptyState>
      ) : (
        <div className="overflow-hidden rounded-[6px] border border-[#d2d8e0] bg-white">
          <div className="grid grid-cols-[1fr_150px_110px] gap-[10px] border-b border-[#d2d8e0] bg-[#f4f6f9] px-[14px] py-2 text-[10.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
            <span>Result</span>
            <span>Value</span>
            <span className="text-right">Date</span>
          </div>
          {rows.map((o) => {
            const flag = flagOf(o);
            return (
              <div
                key={o.ref}
                data-testid="result-row"
                className={`grid grid-cols-[1fr_150px_110px] items-center gap-[10px] border-b border-[#eaedf1] px-[14px] py-[10px] last:border-b-0 ${
                  flag ? "border-l-[3px] border-l-[#e8a93b] bg-[#fdf8ee]" : ""
                }`}
              >
                <span className="flex items-center gap-[6px] text-[13px] font-bold text-[#1f242b]">
                  {o.label}
                  <CitationLink
                    refId={o.ref}
                    label={citationLabels?.[o.ref]}
                    onClick={onCitationClick}
                  />
                </span>
                <span className="flex items-center gap-[6px] text-[12px] text-[#1f242b]">
                  <span className="font-mono">
                    {formatQuantity(o.value)}
                    {o.unit ? ` ${o.unit}` : ""}
                  </span>
                  {flag ? (
                    <span className="rounded-[3px] bg-[#fbefd6] px-[5px] py-[1px] font-mono text-[9px] font-bold uppercase text-[#9a6400]">
                      {flag}
                    </span>
                  ) : null}
                </span>
                <span className="text-right font-mono text-[11px] text-[#8a93a2]">
                  {o.date}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </ChartPage>
  );
}

export default ResultsView;
