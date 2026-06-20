"use client";

import { useEffect, useRef } from "react";
import type { ChatMessage } from "@/lib/assistant";
import { CitationLink } from "./CitationLink";
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
  return (
    <div className="flex flex-wrap gap-[5px]">
      {citations.map((c) => (
        <CitationLink
          key={c}
          refId={c}
          label={labels?.[c]}
          onClick={onCitationClick}
        />
      ))}
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
  // Stay pinned to the bottom only while the reader is already there — don't
  // yank them away if they've scrolled up to read an earlier card/citation.
  const stick = useRef(true);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending]);

  return (
    <div
      ref={scrollRef}
      onScroll={onScroll}
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
            {m.card ? (
              <CardRenderer
                card={m.card}
                citationLabels={citationLabels}
                onCitationClick={onCitationClick}
              />
            ) : null}
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
