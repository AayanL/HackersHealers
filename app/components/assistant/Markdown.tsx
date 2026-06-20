import type { ReactNode } from "react";
import { shortRef } from "@/lib/citations";

// A deliberately tiny markdown renderer for assistant prose: paragraphs,
// `- `/`* ` bullet lists, line breaks, **bold**, `code`, and inline FHIR
// citation tokens like [MedicationRequest/55b5db91] → a labeled chip. Not a
// full CommonMark parser — just enough so the model's formatting reads
// correctly in the dock without pulling in a markdown dependency.

const TOKEN =
  /\*\*([^*]+)\*\*|`([^`]+)`|\[([A-Za-z][A-Za-z]+\/[A-Za-z0-9._-]+)\]/g;

function CitationChip({
  refId,
  label,
  onClick,
}: {
  refId: string;
  label: string;
  onClick?: (ref: string) => void;
}) {
  const className =
    "mx-[1px] inline rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[5px] py-[1px] align-baseline font-mono text-[10px] text-[#2756e6]";
  if (!onClick) {
    return (
      <span title={refId} className={className}>
        [{label}]
      </span>
    );
  }
  return (
    <button
      type="button"
      title={refId}
      aria-label={`Open reference ${refId}`}
      onClick={() => onClick(refId)}
      className={`${className} cursor-pointer hover:bg-[#d7e1fb] hover:underline`}
    >
      [{label}]
    </button>
  );
}

function renderInline(
  text: string,
  keyBase: string,
  labels: Record<string, string>,
  onCitationClick?: (ref: string) => void,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(<strong key={`${keyBase}-b${i}`}>{m[1]}</strong>);
    } else if (m[2] !== undefined) {
      nodes.push(
        <code
          key={`${keyBase}-c${i}`}
          className="rounded-[3px] bg-[#eef0f4] px-[4px] py-[1px] font-mono text-[11px]"
        >
          {m[2]}
        </code>,
      );
    } else if (m[3] !== undefined) {
      const refId = m[3];
      nodes.push(
        <CitationChip
          key={`${keyBase}-cite${i}`}
          refId={refId}
          label={labels[refId] ?? shortRef(refId)}
          onClick={onCitationClick}
        />,
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

export function Markdown({
  text,
  citationLabels = {},
  onCitationClick,
}: {
  text: string;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const lines = text.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let para: string[] = [];
  let list: string[] = [];
  let k = 0;

  const flushPara = () => {
    if (para.length === 0) return;
    const key = `p${k++}`;
    blocks.push(
      <p key={key} className="leading-[1.5]">
        {para.flatMap((line, i) => [
          ...(i > 0 ? [<br key={`${key}-br${i}`} />] : []),
          ...renderInline(line, `${key}-${i}`, citationLabels, onCitationClick),
        ])}
      </p>,
    );
    para = [];
  };

  const flushList = () => {
    if (list.length === 0) return;
    const key = `u${k++}`;
    blocks.push(
      <ul key={key} className="flex list-disc flex-col gap-[2px] pl-[18px]">
        {list.map((item, i) => (
          <li key={`${key}-${i}`} className="leading-[1.45]">
            {renderInline(item, `${key}-${i}`, citationLabels, onCitationClick)}
          </li>
        ))}
      </ul>,
    );
    list = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      flushPara();
      list.push(trimmed.replace(/^[-*]\s+/, ""));
    } else if (trimmed === "") {
      flushPara();
      flushList();
    } else {
      flushList();
      para.push(line);
    }
  }
  flushPara();
  flushList();

  return <div className="flex flex-col gap-[6px]">{blocks}</div>;
}

export default Markdown;
