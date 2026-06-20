import type { TrendCardData, TrendPoint } from "@/lib/assistant";
import { formatQuantity } from "@/lib/format";
import { CitationLink } from "../CitationLink";
import { CardShell } from "./CardShell";

const W = 320;
const H = 64;
const PAD = 8;

function buildGeometry(points: TrendPoint[]) {
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const stepX = points.length > 1 ? (W - PAD * 2) / (points.length - 1) : 0;

  return points.map((p, i) => {
    const x = PAD + stepX * i;
    // Invert Y so larger values sit higher in the SVG viewport.
    const y = PAD + (H - PAD * 2) * (1 - (p.value - min) / span);
    return { x, y, point: p };
  });
}

export function TrendCard({
  data,
  onCitationClick,
}: {
  data: TrendCardData;
  // Accepted for renderer parity; trend rows already show the date + value, so
  // the chip is just a short, clickable handle to the source (no verbose label).
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  const geo = buildGeometry(data.points);
  const polyline = geo.map((g) => `${g.x},${g.y}`).join(" ");
  const latest = data.points[data.points.length - 1];

  return (
    <CardShell
      testId="trend-card"
      title={data.label}
      tag={`${data.points.length} results`}
    >
      <svg
        data-testid="trend-sparkline"
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label={`${data.label} trend, ${data.points.length} points`}
      >
        {data.referenceRange ? (
          <line
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD}
            y2={H - PAD}
            stroke="#e3e8ee"
            strokeWidth={1}
          />
        ) : null}
        <polyline
          points={polyline}
          fill="none"
          stroke="#2756e6"
          strokeWidth={1.5}
        />
        {geo.map((g) => (
          <circle
            key={g.point.ref}
            cx={g.x}
            cy={g.y}
            r={g.point.flagged ? 4 : 2.5}
            fill={g.point.flagged ? "#cf3b3b" : "#2756e6"}
          />
        ))}
      </svg>

      <div className="flex flex-col gap-[3px]">
        {data.points.map((p) => (
          <div
            key={p.ref}
            data-testid="trend-point"
            className="flex items-center gap-2 font-mono text-[10.5px]"
          >
            <span className="text-[#8a93a2]">{p.date}</span>
            <span
              className={
                p.flagged ? "font-bold text-[#cf3b3b]" : "text-[#1f242b]"
              }
            >
              {formatQuantity(p.value)} {data.unit}
              {p.flagged ? " ▲" : ""}
            </span>
            <CitationLink
              className="ml-auto"
              refId={p.ref}
              onClick={onCitationClick}
            />
          </div>
        ))}
      </div>

      {data.referenceRange ? (
        <div className="text-[10px] text-[#8a93a2]">
          Reference range {data.referenceRange.low}–{data.referenceRange.high}{" "}
          {data.unit}
          {latest && latest.value > data.referenceRange.high
            ? " · latest above range"
            : ""}
        </div>
      ) : null}

      {/* Provenance: the literal FHIR read — kept faint so it reads as a quiet
          footnote rather than competing with the data above it. */}
      <div className="flex max-w-full items-center gap-[5px] font-mono text-[9.5px] text-[#aab2bd]">
        <span className="font-semibold tracking-wide">GET</span>
        <code className="truncate">{data.query}</code>
      </div>
    </CardShell>
  );
}

export default TrendCard;
