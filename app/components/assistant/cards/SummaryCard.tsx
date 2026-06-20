"use client";

import { useState } from "react";
import type { SummaryCardData } from "@/lib/assistant";
import { CardCitations, CardShell } from "./CardShell";
import { TabBar } from "./TabBar";

const SBAR_BLOCKS: { key: keyof SummaryCardData["sbar"]; label: string }[] = [
  { key: "situation", label: "Situation" },
  { key: "background", label: "Background" },
  { key: "assessment", label: "Assessment" },
  { key: "recommendation", label: "Recommendation" },
];

export function SummaryCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: SummaryCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const [mode, setMode] = useState<"sbar" | "patient">("sbar");

  return (
    <CardShell
      testId="summary-card"
      title="Summary"
      headerRight={
        <span className="font-mono text-[9.5px] text-[#8a93a2]">
          AI draft — review before use
        </span>
      }
    >
      <TabBar
        tabs={[
          { id: "sbar", label: "Handoff (SBAR)" },
          { id: "patient", label: "For the patient" },
        ]}
        active={mode}
        onChange={(id) => setMode(id as "sbar" | "patient")}
      />

      {mode === "sbar" ? (
        <div className="flex flex-col gap-[7px]">
          {SBAR_BLOCKS.map((b) => {
            const value = data.sbar[b.key];
            const placeholder = value.startsWith("[");
            return (
              <div key={b.key} className="flex flex-col gap-[2px]">
                <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
                  {b.label}
                </span>
                <span
                  className={`text-[11.5px] leading-[1.45] ${
                    placeholder
                      ? "italic text-[#9a6400]"
                      : "text-[#1f242b]"
                  }`}
                >
                  {value}
                </span>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-[12px] leading-[1.55] text-[#1f242b]">
          {data.patient}
        </p>
      )}

      <CardCitations
        citations={data.citations}
        citationLabels={citationLabels}
        onCitationClick={onCitationClick}
      />
    </CardShell>
  );
}

export default SummaryCard;
