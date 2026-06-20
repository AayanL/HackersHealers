"use client";

import { useState } from "react";

export interface ComposerProps {
  suggestions?: string[];
  placeholder?: string;
  disabled?: boolean;
  onSend?: (text: string) => void;
}

const DEFAULT_SUGGESTIONS = [
  "Summarize for handoff",
  "Check interactions",
  "Recent labs",
];

export function Composer({
  suggestions = DEFAULT_SUGGESTIONS,
  placeholder = "Ask about the patient…",
  disabled = false,
  onSend,
}: ComposerProps) {
  const [value, setValue] = useState("");

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend?.(trimmed);
    setValue("");
  }

  return (
    <div className="border-t border-[#d2d8e0] bg-white px-[13px] pb-3 pt-[10px]">
      <div className="mb-2 flex flex-wrap gap-[5px]">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => send(s)}
            className="cursor-pointer rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[9px] py-1 text-[11px] font-semibold text-[#2756e6]"
          >
            {s}
          </button>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(value);
        }}
        className="flex items-center gap-2 rounded-[6px] border border-[#c5ccd6] bg-[#f8fafc] px-[10px] py-2"
      >
        <input
          aria-label="Ask the assistant"
          placeholder={placeholder}
          value={value}
          disabled={disabled}
          onChange={(e) => setValue(e.target.value)}
          className="flex-1 border-none bg-transparent text-[12.5px] text-[#15181d] outline-none"
        />
        <button
          type="submit"
          aria-label="Send"
          disabled={disabled}
          className="flex h-[27px] w-[27px] flex-none cursor-pointer items-center justify-center rounded-[5px] bg-[#2756e6] text-white disabled:opacity-50"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path d="M5 12h14" />
            <path d="m13 6 6 6-6 6" />
          </svg>
        </button>
      </form>
      <div className="mt-[7px] text-center font-mono text-[10px] text-[#9aa3b0]">
        grounded in chart · verify before acting · not a substitute for clinical
        judgment
      </div>
    </div>
  );
}

export default Composer;
