"use client";

import { useState } from "react";
import type { NoteCardData } from "@/lib/assistant";
import { CardCitations, CardShell } from "./CardShell";
import { TabBar } from "./TabBar";

const SOAP_BLOCKS: { key: keyof NoteCardData["soap"]; label: string }[] = [
  { key: "subjective", label: "Subjective" },
  { key: "objective", label: "Objective" },
  { key: "assessment", label: "Assessment" },
  { key: "plan", label: "Plan" },
];

export function NoteCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: NoteCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const [mode, setMode] = useState<"note" | "todo">("note");

  return (
    <CardShell
      testId="note-card"
      title="Note assistant"
      headerRight={
        <span className="font-mono text-[9.5px] text-[#8a93a2]">
          not entered in chart
        </span>
      }
    >
      <TabBar
        tabs={[
          { id: "note", label: "Progress note" },
          { id: "todo", label: "To document" },
        ]}
        active={mode}
        onChange={(id) => setMode(id as "note" | "todo")}
      />

      {mode === "note" ? (
        <div className="flex flex-col gap-[7px]">
          {SOAP_BLOCKS.map((b) => (
            <div key={b.key} className="flex flex-col gap-[2px]">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
                {b.label}
              </span>
              <span className="text-[11.5px] leading-[1.45] text-[#1f242b]">
                {data.soap[b.key]}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <ul className="flex flex-col gap-[5px]">
          {data.todos.map((t) => (
            <li
              key={t}
              className="flex items-start gap-2 text-[11.5px] leading-[1.45] text-[#1f242b]"
            >
              <span
                aria-hidden
                className="mt-[3px] flex-none rounded-[3px] border border-[#c5ccd6] px-[4px] text-[8px] text-[#c5ccd6]"
              >
                ☐
              </span>
              {t}
            </li>
          ))}
        </ul>
      )}

      <CardCitations
        citations={data.citations}
        citationLabels={citationLabels}
        onCitationClick={onCitationClick}
      />
    </CardShell>
  );
}

export default NoteCard;
