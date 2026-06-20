import type {
  BillingCardData,
  BillingFinding,
  BillingLine,
} from "@/lib/assistant";
import { CitationLink } from "../CitationLink";
import { CardShell } from "./CardShell";

const KIND_LABEL: Record<BillingLine["kind"], string> = {
  service: "SVC",
  diagnostic: "DX",
};

const SEVERITY_STYLE: Record<BillingFinding["severity"], string> = {
  high: "border-l-[#cf3b3b] bg-[#fdeeee] text-[#a32626]",
  moderate: "border-l-[#e8a93b] bg-[#fdf6e8] text-[#9a6400]",
  low: "border-l-[#9aa6b5] bg-[#f4f6f9] text-[#5b6470]",
};

function Line({
  line,
  citationLabels,
  onCitationClick,
}: {
  line: BillingLine;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <div className="flex items-start gap-2 rounded-[5px] border border-[#e3e8ee] bg-white p-[8px_10px]">
      <span className="mt-px rounded-[3px] bg-[#eef1f6] px-[5px] py-[2px] font-mono text-[9.5px] font-bold tracking-[0.04em] text-[#5b6470]">
        {KIND_LABEL[line.kind]}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-mono text-[12px] font-bold text-[#1f242b]">
            {line.code}
          </span>
          <span className="truncate text-[12px] text-[#1f242b]">
            {line.display}
          </span>
          {line.fee ? (
            <span className="ml-auto font-mono text-[12px] font-bold text-[#1f242b]">
              {line.fee}
            </span>
          ) : null}
        </div>
        <div className="mt-[3px] flex flex-wrap items-center gap-[5px]">
          <span className="text-[10.5px] text-[#5b6470]">{line.basis}</span>
          {line.ref ? (
            <CitationLink
              refId={line.ref}
              label={citationLabels?.[line.ref]}
              onClick={onCitationClick}
            />
          ) : null}
          {line.note ? (
            <span className="ml-auto font-mono text-[9.5px] text-[#8a93a2]">
              {line.note}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Finding({
  finding,
  citationLabels,
  onCitationClick,
}: {
  finding: BillingFinding;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <div
      data-testid="billing-finding"
      className={`rounded-[5px] border border-[#e3e8ee] border-l-[3px] p-[9px_10px] ${SEVERITY_STYLE[finding.severity]}`}
    >
      <div className="text-[12px] font-bold leading-[1.3] text-[#1f242b]">
        {finding.title}
      </div>
      {finding.detail ? (
        <div className="mt-[4px] text-[11.5px] leading-[1.45] text-[#5b6470]">
          {finding.detail}
        </div>
      ) : null}
      {finding.refs && finding.refs.length > 0 ? (
        <div className="mt-[7px] flex flex-wrap gap-[5px]">
          {finding.refs.map((r) => (
            <CitationLink
              key={r}
              refId={r}
              label={citationLabels?.[r]}
              onClick={onCitationClick}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function BillingCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: BillingCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <CardShell
      testId="billing-card"
      title="Billing draft"
      tag={`${data.lines.length} ${data.lines.length === 1 ? "line" : "lines"}`}
      headerRight={
        data.total ? (
          <span className="font-mono text-[11px] font-bold text-[#1f242b]">
            {data.total}
          </span>
        ) : null
      }
    >
      <div className="rounded-[4px] bg-[#fdf6e8] px-[9px] py-[5px] text-[10.5px] font-semibold text-[#9a6400]">
        AI draft — review before billing. VERA does not submit claims.
      </div>

      <div className="flex flex-col gap-[6px]">
        {data.lines.map((l) => (
          <Line
            key={l.id}
            line={l}
            citationLabels={citationLabels}
            onCitationClick={onCitationClick}
          />
        ))}
      </div>

      {data.findings.length > 0 ? (
        <div className="flex flex-col gap-[7px]">
          <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#8a93a2]">
            Missing-code check
          </span>
          {data.findings.map((f) => (
            <Finding
              key={f.id}
              finding={f}
              citationLabels={citationLabels}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      ) : null}

      <div className="rounded-[4px] border border-dashed border-[#d2d8e0] bg-[#fafbfd] px-[9px] py-[6px] text-[10.5px] leading-[1.4] text-[#6b7480]">
        {data.coverageNote}
      </div>
    </CardShell>
  );
}

export default BillingCard;
