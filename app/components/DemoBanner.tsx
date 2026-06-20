export interface DemoBannerProps {
  dataMode?: string;
}

/**
 * Top strip showing the data posture. The "NO PHI" claim is only safe for the
 * synthetic demo — a real SMART launch (dataMode != "synthetic") must NOT assert
 * it, since the in-context patient may be real PHI.
 */
export function DemoBanner({ dataMode = "synthetic" }: DemoBannerProps) {
  const synthetic = dataMode === "synthetic";
  return (
    <div
      role="status"
      className={`flex shrink-0 items-center gap-[9px] border-b px-[22px] py-[6px] font-mono text-[11.5px] ${
        synthetic
          ? "border-[#11161f] bg-[#1c2533] text-[#9fb0c7]"
          : "border-[#5a3a0c] bg-[#3a2708] text-[#f3c969]"
      }`}
    >
      <span
        aria-hidden
        className={`h-[6px] w-[6px] rounded-full ${synthetic ? "bg-[#4f86f7]" : "bg-[#f3c969]"}`}
      />
      <span>
        {synthetic
          ? "DEMO · SYNTHETIC DATA · NO PHI"
          : "LIVE SMART SESSION · verify data sensitivity before sharing"}
      </span>
      <span className={synthetic ? "ml-auto text-[#6e8099]" : "ml-auto text-[#b98a2e]"}>
        DataMode={dataMode}
      </span>
    </div>
  );
}

export default DemoBanner;
