import type { ReconcileCardData, ReconcileFinding } from "@/lib/assistant";
import { CardShell } from "./CardShell";

const TYPE_LABEL: Record<ReconcileFinding["type"], string> = {
  duplicate: "DUP",
  gap: "GAP",
  interaction: "RX",
  renal: "RENAL",
};

const SEVERITY_STYLE: Record<ReconcileFinding["severity"], string> = {
  high: "border-l-[#cf3b3b] bg-[#fdeeee] text-[#a32626]",
  moderate: "border-l-[#e8a93b] bg-[#fdf6e8] text-[#9a6400]",
  low: "border-l-[#9aa6b5] bg-[#f4f6f9] text-[#5b6470]",
};

function shortRef(ref: string): string {
  const i = ref.indexOf("/");
  return i >= 0 ? ref.slice(i + 1) : ref;
}

function Finding({ finding }: { finding: ReconcileFinding }) {
  return (
    <div
      data-testid="reconcile-finding"
      className={`rounded-[5px] border border-[#e3e8ee] border-l-[3px] p-[9px_10px] ${SEVERITY_STYLE[finding.severity]}`}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-[3px] bg-white/70 px-[5px] py-[2px] font-mono text-[9.5px] font-bold tracking-[0.04em]">
          {TYPE_LABEL[finding.type]}
        </span>
        <span className="text-[12px] font-bold leading-[1.3] text-[#1f242b]">
          {finding.title}
        </span>
      </div>
      {finding.detail ? (
        <div className="mt-[4px] text-[11.5px] leading-[1.45] text-[#5b6470]">
          {finding.detail}
        </div>
      ) : null}
      <div className="mt-[7px] flex flex-wrap items-center gap-[5px]">
        {finding.meds.map((m) => (
          <span
            key={m}
            className="rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[7px] py-[3px] font-mono text-[10px] text-[#2756e6]"
          >
            {shortRef(m)}
          </span>
        ))}
        {finding.source ? (
          <span className="ml-auto font-mono text-[9.5px] text-[#8a93a2]">
            {finding.source}
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function ReconcileCard({ data }: { data: ReconcileCardData }) {
  const dup = data.findings.filter((f) => f.type === "duplicate").length;
  const gap = data.findings.filter((f) => f.type === "gap").length;
  const parts = [
    dup ? `${dup} duplicate${dup === 1 ? "" : "s"}` : null,
    gap ? `${gap} gap${gap === 1 ? "" : "s"}` : null,
  ].filter(Boolean);

  return (
    <CardShell
      testId="reconcile-card"
      title="Reconciliation"
      tag={`${data.findings.length} ${data.findings.length === 1 ? "finding" : "findings"}`}
    >
      {parts.length > 0 ? (
        <div className="text-[11px] font-semibold text-[#5b6470]">
          {parts.join(" · ")}
        </div>
      ) : null}
      <div className="flex flex-col gap-[7px]">
        {data.findings.map((f) => (
          <Finding key={f.id} finding={f} />
        ))}
      </div>
      {data.coverageGaps && data.coverageGaps.length > 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#d2d8e0] bg-[#fafbfd] px-[9px] py-[6px] text-[10.5px] leading-[1.4] text-[#6b7480]">
          Coverage: {data.coverageGaps.join("; ")}
        </div>
      ) : null}
      <div className="font-mono text-[9.5px] text-[#8a93a2]">
        Advisory only — does not modify orders.
      </div>
    </CardShell>
  );
}

export default ReconcileCard;
