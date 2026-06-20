import type { ReactNode } from "react";
import { CitationLink } from "../CitationLink";

/**
 * Shared chrome for every rich tool-result card: a white panel with a labeled
 * header, an optional count/tag chip, and a tinted accent bar. Keeps the
 * card surfaces visually consistent and distinct from plain assistant prose.
 */
export function CardShell({
  testId,
  title,
  tag,
  accent = "#2756e6",
  headerRight,
  children,
}: {
  testId?: string;
  title: string;
  tag?: string;
  /** Accent color for the top border (purple flags external knowledge). */
  accent?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      data-testid={testId}
      className="overflow-hidden rounded-[6px] border border-[#d2d8e0] border-t-[3px] bg-white"
      style={{ borderTopColor: accent }}
    >
      <div className="flex items-center gap-[7px] border-b border-[#eaedf1] px-3 py-[8px]">
        <span className="text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-[#3a4a5e]">
          {title}
        </span>
        {tag ? (
          <span
            className="rounded-[3px] px-[6px] py-[2px] font-mono text-[9.5px]"
            style={{ backgroundColor: `${accent}1a`, color: accent }}
          >
            {tag}
          </span>
        ) : null}
        {headerRight ? <div className="ml-auto">{headerRight}</div> : null}
      </div>
      <div className="flex flex-col gap-[9px] px-3 py-[10px]">{children}</div>
    </div>
  );
}

/** Per-card provenance footer — clickable chips linking to source resources. */
export function CardCitations({
  citations,
  citationLabels,
  onCitationClick,
}: {
  citations?: string[];
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  if (!citations || citations.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-[5px] border-t border-[#eaedf1] pt-[8px]">
      {citations.map((c) => (
        <CitationLink
          key={c}
          refId={c}
          label={citationLabels?.[c]}
          onClick={onCitationClick}
        />
      ))}
    </div>
  );
}

export default CardShell;
