"use client";

import { useState } from "react";
import type { CodeOption, GuidelineCardData } from "@/lib/assistant";
import { CitationLink } from "../CitationLink";
import { CardShell } from "./CardShell";

function CodeRow({
  code,
  selected,
  onSelect,
}: {
  code: CodeOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      data-testid="code-option"
      aria-pressed={selected}
      onClick={onSelect}
      className={`flex w-full items-center gap-2 rounded-[5px] border px-[9px] py-[7px] text-left ${
        selected
          ? "border-[#2756e6] bg-[#e4eafd]"
          : "border-[#e3e8ee] bg-white hover:border-[#c5ccd6]"
      }`}
    >
      <span className="rounded-[3px] bg-[#eef0f4] px-[5px] py-[2px] font-mono text-[9.5px] font-bold text-[#3a4a5e]">
        {code.system}
      </span>
      <span className="font-mono text-[11px] font-bold text-[#1f242b]">
        {code.code}
      </span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-[#5b6470]">
        {code.display}
      </span>
      {selected ? (
        <span className="font-mono text-[10px] font-bold text-[#2756e6]">
          ✓
        </span>
      ) : null}
    </button>
  );
}

export function GuidelineCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: GuidelineCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <CardShell
      testId="guideline-card"
      title="Guideline & coding"
      accent="#7b3fe4"
      tag="external knowledge"
    >
      {data.bullets && data.bullets.length > 0 ? (
        <ul className="flex flex-col gap-[6px]">
          {data.bullets.map((b) => (
            <li key={b.text} className="flex flex-col gap-[3px]">
              <span className="text-[11.5px] leading-[1.45] text-[#1f242b]">
                {b.text}
              </span>
              <span className="self-start rounded-[4px] border border-[#e0d3fb] bg-[#f1ebfd] px-[7px] py-[2px] font-mono text-[9.5px] text-[#7b3fe4]">
                {b.source}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {data.codes && data.codes.length > 0 ? (
        <div className="flex flex-col gap-[5px]">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
            Candidate codes
          </span>
          {data.codes.map((c) => (
            <CodeRow
              key={c.id}
              code={c}
              selected={selected === c.id}
              onSelect={() => setSelected((cur) => (cur === c.id ? null : c.id))}
            />
          ))}
          {selected
            ? data.codes
                .filter((c) => c.id === selected && c.confidence)
                .map((c) => (
                  <span
                    key={c.id}
                    className="text-[10px] text-[#9a6400]"
                  >
                    Confidence: {c.confidence}
                  </span>
                ))
            : null}
        </div>
      ) : null}

      {data.sourceCondition ? (
        <div className="flex items-center gap-[5px] self-start text-[10px] text-[#8a93a2]">
          <span className="font-mono">source:</span>
          <CitationLink
            refId={data.sourceCondition}
            label={citationLabels?.[data.sourceCondition]}
            onClick={onCitationClick}
          />
        </div>
      ) : null}

      {data.unverifiedNote ? (
        <div className="rounded-[4px] border border-dashed border-[#d2d8e0] bg-[#fafbfd] px-[9px] py-[6px] text-[10.5px] italic leading-[1.4] text-[#8a93a2]">
          Model summary, unverified — {data.unverifiedNote}
        </div>
      ) : null}
    </CardShell>
  );
}

export default GuidelineCard;
