"use client";

import { useState } from "react";
import type { HealthMaintenanceItem } from "@/lib/assistant";
import { CitationLink } from "./CitationLink";

// F15/F16 — preventive care section (immunization status + screening gaps),
// modeled on SafetyScan: a labeled section with a count badge, per-item rows
// with a status badge, a one-line detail, cited evidence, and a Phase-2
// "draft order" affordance. Quiet by design — renders nothing when the engine
// finds nothing actionable (the section only carries gaps, never the
// up-to-date items).

const STATUS_STYLE: Record<
  HealthMaintenanceItem["status"],
  { left: string; badge: string; label: string }
> = {
  overdue: {
    left: "border-l-[#d9534f]",
    badge: "bg-[#fdecec] text-[#b3261e]",
    label: "overdue",
  },
  missing: {
    left: "border-l-[#e8a93b]",
    badge: "bg-[#fdf6e8] text-[#9a6400]",
    label: "missing",
  },
  due: {
    left: "border-l-[#5b8def]",
    badge: "bg-[#e4eafd] text-[#2756e6]",
    label: "due",
  },
  "up-to-date": {
    left: "border-l-[#9aa6b5]",
    badge: "bg-[#e7f5ed] text-[#1f7a4d]",
    label: "up to date",
  },
};

function MaintenanceRow({
  item,
  citationLabels,
  onCitationClick,
}: {
  item: HealthMaintenanceItem;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const style = STATUS_STYLE[item.status];

  return (
    <div
      className={`mb-[7px] rounded-[5px] border border-[#d2d8e0] border-l-[3px] bg-white p-[10px_12px] ${style.left}`}
    >
      <div className="flex flex-wrap items-center gap-[7px]">
        <span
          className={`rounded-[3px] px-[6px] py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.04em] ${style.badge}`}
        >
          {style.label}
        </span>
        <span className="text-[12.5px] font-bold leading-[1.35] text-[#1f242b]">
          {item.title}
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-[0.05em] text-[#8a93a2]">
          {item.kind === "immunization" ? "vaccine" : "screen"}
        </span>
      </div>
      {item.detail ? (
        <div className="mt-[3px] text-[11.5px] leading-[1.45] text-[#5b6470]">
          {item.detail}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="mt-[7px] cursor-pointer border-none bg-none p-0 text-[11px] font-bold text-[#5b6470]"
      >
        why ▾
      </button>
      {open ? (
        <div className="mt-2 flex flex-wrap items-center gap-[5px] border-t border-dashed border-[#d2d8e0] pt-2">
          {item.evidence.map((e) =>
            e.includes("/") ? (
              <CitationLink
                key={e}
                refId={e}
                label={citationLabels?.[e]}
                onClick={onCitationClick}
              />
            ) : (
              <span
                key={e}
                className="rounded-[3px] bg-[#f4f6f9] px-[6px] py-1 font-mono text-[10px] text-[#3a4a5e]"
              >
                {e}
              </span>
            ),
          )}
          <span className="font-mono text-[10px] text-[#8a93a2]">
            rule: {item.rule}
          </span>
        </div>
      ) : null}
      <div className="mt-[9px] flex gap-3">
        <span className="text-[11px] font-bold text-[#2756e6]">Draft order</span>
        <span className="text-[11px] text-[#8a93a2]">Discuss</span>
      </div>
    </div>
  );
}

export function HealthMaintenance({
  items,
  citationLabels,
  onCitationClick,
}: {
  items: HealthMaintenanceItem[];
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section
      aria-label="Health maintenance"
      className="shrink-0 px-[14px] pb-[3px] pt-[13px]"
    >
      <div className="mb-2 flex items-center gap-[7px]">
        <span className="text-[10.5px] font-bold uppercase tracking-[0.08em] text-[#8a93a2]">
          Health maintenance
        </span>
        <span className="rounded-[3px] bg-[#fbefd6] px-[6px] py-[2px] font-mono text-[10px] text-[#9a6400]">
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      {items.map((i) => (
        <MaintenanceRow
          key={i.id}
          item={i}
          citationLabels={citationLabels}
          onCitationClick={onCitationClick}
        />
      ))}
    </section>
  );
}

export default HealthMaintenance;
