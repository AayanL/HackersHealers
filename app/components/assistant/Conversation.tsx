"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/assistant";
import { shortRef } from "@/lib/citations";
import { Markdown } from "./Markdown";
import { CardRenderer } from "./cards/CardRenderer";

function CitationChips({
  citations,
  labels,
  onCitationClick,
}: {
  citations: string[];
  labels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const className =
    "rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[7px] py-[3px] font-mono text-[10px] text-[#2756e6]";
  return (
    <div className="flex flex-wrap gap-[5px]">
      {citations.map((c) => {
        const text = `[${labels?.[c] ?? shortRef(c)}]`;
        return onCitationClick ? (
          <button
            key={c}
            type="button"
            title={c}
            aria-label={`Open reference ${c}`}
            onClick={() => onCitationClick(c)}
            className={`${className} cursor-pointer hover:bg-[#d7e1fb] hover:underline`}
          >
            {text}
          </button>
        ) : (
          <span key={c} title={c} className={className}>
            {text}
          </span>
        );
      })}
    </div>
  );
}

export function Conversation({
  messages,
  pending = false,
  citationLabels,
  onCitationClick,
}: {
  messages: ChatMessage[];
  pending?: boolean;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest turn in view as messages stream in.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-[14px] overflow-y-auto p-[14px]"
    >
      {messages.map((m) =>
        m.role === "user" ? (
          <div
            key={m.id}
            className="max-w-[84%] self-end rounded-[6px] bg-[#2756e6] px-3 py-2 text-[12.5px] leading-[1.45] text-white"
          >
            {m.text}
          </div>
        ) : (
          <div key={m.id} className="flex flex-col gap-[7px]">
            <div className="text-[13px] leading-[1.5] text-[#1f242b]">
              <Markdown
                text={m.text}
                citationLabels={citationLabels}
                onCitationClick={onCitationClick}
              />
            </div>
            {m.card ? <CardRenderer card={m.card} /> : null}
            {m.citations && m.citations.length > 0 ? (
              <CitationChips
                citations={m.citations}
                labels={citationLabels}
                onCitationClick={onCitationClick}
              />
            ) : null}
          </div>
        ),
      )}
      {pending ? (
        <div
          role="status"
          className="self-start font-mono text-[11px] text-[#8a93a2]"
        >
          thinking…
        </div>
      ) : null}
    </div>
  );
}

export default Conversation;
