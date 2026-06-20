import { shortRef } from "@/lib/citations";

// The single source of truth for an inline FHIR citation chip — used by prose
// (Markdown), message footers, and the tool-result cards so every reference
// looks and behaves the same. Renders "[label]"; clickable when a handler is
// given, with the full ref on hover and the human label as the accessible name.

export function CitationLink({
  refId,
  label,
  onClick,
  className = "",
}: {
  refId: string;
  label?: string;
  onClick?: (ref: string) => void;
  className?: string;
}) {
  const display = label ?? shortRef(refId);
  const base =
    "inline rounded-[4px] border border-[#c9d7fb] bg-[#e4eafd] px-[5px] py-[1px] align-baseline font-mono text-[10px] text-[#2756e6]";

  if (!onClick) {
    return (
      <span title={refId} className={`${base} ${className}`}>
        [{display}]
      </span>
    );
  }
  return (
    <button
      type="button"
      title={refId}
      aria-label={`Open reference: ${display}`}
      onClick={() => onClick(refId)}
      className={`${base} cursor-pointer hover:bg-[#d7e1fb] hover:underline ${className}`}
    >
      [{display}]
    </button>
  );
}

export default CitationLink;
