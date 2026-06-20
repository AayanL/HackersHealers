"use client";

import { useState } from "react";
import type { SafetyAlert } from "@/lib/assistant";

function AlertCard({ alert }: { alert: SafetyAlert }) {
  const [open, setOpen] = useState(false);
  const warn = alert.severity === "warn";

  return (
    <div
      className={`mb-[7px] rounded-[5px] border border-[#d2d8e0] bg-white p-[11px_12px] ${
        warn ? "border-l-[3px] border-l-[#e8a93b]" : "border-l-[3px] border-l-[#9aa6b5]"
      }`}
    >
      <div className="flex gap-2">
        <span
          aria-hidden
          className={`mt-px flex-none ${warn ? "text-[#c07a0f]" : "text-[#7d8896]"}`}
        >
          {warn ? "▲" : "ⓘ"}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[12.5px] font-bold leading-[1.35]">
            {alert.title}
          </div>
          {alert.detail ? (
            <div className="mt-[3px] text-[11.5px] leading-[1.45] text-[#5b6470]">
              {alert.detail}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className={`mt-[7px] cursor-pointer border-none bg-none p-0 text-[11px] font-bold ${
              warn ? "text-[#2756e6]" : "text-[#5b6470]"
            }`}
          >
            why ▾
          </button>
          {open ? (
            <div className="mt-2 flex flex-col gap-[5px] border-t border-dashed border-[#d2d8e0] pt-2 font-mono">
              {alert.evidence.map((e) => (
                <span
                  key={e}
                  className="rounded-[3px] bg-[#f4f6f9] px-[6px] py-1 text-[10px] text-[#3a4a5e]"
                >
                  {e}
                </span>
              ))}
              {alert.rule ? (
                <span className="text-[10px] text-[#8a93a2]">rule: {alert.rule}</span>
              ) : null}
            </div>
          ) : null}
          {warn ? (
            <div className="mt-[9px] flex gap-3">
              <span className="text-[11px] font-bold text-[#2756e6]">
                Ask about this
              </span>
              <span className="text-[11px] text-[#8a93a2]">Dismiss</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function SafetyScan({ alerts }: { alerts: SafetyAlert[] }) {
  const [collapsed, setCollapsed] = useState(false);
  if (alerts.length === 0) return null;
  return (
    <section
      aria-label="Safety scan"
      className="shrink-0 px-[14px] pb-[3px] pt-[13px]"
    >
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand safety scan" : "Collapse safety scan"}
        className="mb-2 flex w-full cursor-pointer items-center gap-[7px] border-none bg-transparent p-0 text-left"
      >
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a93a2]">
          Safety scan
        </span>
        <span className="rounded-[3px] bg-[#fbefd6] px-[6px] py-[2px] font-mono text-[10px] text-[#9a6400]">
          {alerts.length} {alerts.length === 1 ? "flag" : "flags"}
        </span>
        <span aria-hidden className="ml-auto text-[10px] text-[#8a93a2]">
          {collapsed ? "▸" : "▾"}
        </span>
      </button>
      {collapsed
        ? null
        : alerts.map((a) => <AlertCard key={a.id} alert={a} />)}
    </section>
  );
}

export default SafetyScan;
