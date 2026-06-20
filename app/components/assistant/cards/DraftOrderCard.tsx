"use client";

import { useState } from "react";
import type { DraftOrderCardData } from "@/lib/assistant";
import { CardShell } from "./CardShell";

type DraftStatus = "draft" | "confirmed" | "rejected";

export function DraftOrderCard({
  data,
  onConfirm,
  onReject,
}: {
  data: DraftOrderCardData;
  onConfirm?: () => void;
  onReject?: () => void;
}) {
  // Local state machine — the card never auto-submits; only an explicit click
  // advances it, and the server-side write broker is what would actually fire.
  const [status, setStatus] = useState<DraftStatus>("draft");

  const badge =
    status === "confirmed"
      ? { text: "CONFIRMED · opened in order flow", cls: "bg-[#e6f4ea] text-[#1f7a3d]" }
      : status === "rejected"
        ? { text: "DRAFT REJECTED", cls: "bg-[#f1f3f6] text-[#6b7480]" }
        : { text: "DRAFT — not signed", cls: "bg-[#fdf0d8] text-[#9a6400]" };

  return (
    <CardShell
      testId="draft-order-card"
      title="Order draft"
      accent="#9a6400"
      headerRight={
        <span
          data-testid="draft-status"
          className={`rounded-[3px] px-[6px] py-[2px] font-mono text-[9.5px] font-bold ${badge.cls}`}
        >
          {badge.text}
        </span>
      }
    >
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-[#1f242b]">
          {data.title}
        </span>
        {data.code ? (
          <span className="rounded-[4px] border border-[#d2d8e0] bg-[#f4f6f9] px-[6px] py-[2px] font-mono text-[10px] text-[#3a4a5e]">
            {data.code}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[5px]">
        {data.fields.map((f) => (
          <div key={f.label} className="contents">
            <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
              {f.label}
            </span>
            <span className="text-[11.5px] text-[#1f242b]">{f.value}</span>
          </div>
        ))}
      </div>

      {data.safety && data.safety.length > 0 ? (
        <div className="flex flex-col gap-[4px]">
          {data.safety.map((s) => (
            <div
              key={s}
              className="rounded-[4px] border-l-[3px] border-l-[#9aa6b5] bg-[#f4f6f9] px-[8px] py-[5px] text-[10.5px] leading-[1.4] text-[#5b6470]"
            >
              {s}
            </div>
          ))}
        </div>
      ) : null}

      {status === "draft" ? (
        <div className="flex items-center gap-2 border-t border-[#eaedf1] pt-[9px]">
          <button
            type="button"
            onClick={() => {
              setStatus("confirmed");
              onConfirm?.();
            }}
            className="cursor-pointer rounded-[5px] bg-[#2756e6] px-[11px] py-[6px] text-[11.5px] font-bold text-white"
          >
            Confirm &amp; open order
          </button>
          <button
            type="button"
            className="cursor-pointer rounded-[5px] border border-[#c5ccd6] bg-white px-[10px] py-[6px] text-[11.5px] font-semibold text-[#3a4a5e]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => {
              setStatus("rejected");
              onReject?.();
            }}
            className="ml-auto cursor-pointer border-none bg-none p-0 text-[11.5px] font-semibold text-[#8a93a2]"
          >
            Reject
          </button>
        </div>
      ) : (
        <div className="border-t border-[#eaedf1] pt-[9px] font-mono text-[10px] text-[#8a93a2]">
          {status === "confirmed"
            ? "Drafted by AI · confirmed by you. Sign in the EHR's order screen."
            : "Draft discarded — nothing was written to the chart."}
        </div>
      )}
    </CardShell>
  );
}

export default DraftOrderCard;
