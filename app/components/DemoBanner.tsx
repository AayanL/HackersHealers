export interface DemoBannerProps {
  dataMode?: string;
}

/** Top strip: DEMO · SYNTHETIC DATA · NO PHI. Mirrors the design comp's data-mode banner. */
export function DemoBanner({ dataMode = "synthetic" }: DemoBannerProps) {
  return (
    <div
      role="status"
      className="flex items-center gap-[9px] border-b border-[#11161f] bg-[#1c2533] px-[22px] py-[6px] font-mono text-[11.5px] text-[#9fb0c7]"
    >
      <span
        aria-hidden
        className="h-[6px] w-[6px] rounded-full bg-[#4f86f7]"
      />
      <span>DEMO · SYNTHETIC DATA · NO PHI</span>
      <span className="ml-auto text-[#6e8099]">DataMode={dataMode}</span>
    </div>
  );
}

export default DemoBanner;
