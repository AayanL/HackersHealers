export interface AppBarProps {
  clinician?: string;
  clinicianInitials?: string;
}

/** Product app bar: VERA/ehr logo, a (visual) search affordance, and the signed-in clinician. */
export function AppBar({
  clinician = "Dr. A. Reyes · IM",
  clinicianInitials = "AR",
}: AppBarProps) {
  return (
    <header className="flex items-center gap-4 border-b border-[#d2d8e0] bg-white px-[18px] py-[9px]">
      <div className="flex items-center gap-2 text-[13.5px] font-extrabold tracking-[-0.01em] text-[#15181d]">
        <span aria-hidden className="h-4 w-4 rounded-[3px] bg-[#2756e6]" />
        VERA<span className="font-semibold text-[#8a93a2]">/ehr</span>
      </div>
      <div className="ml-1.5 flex w-[280px] max-w-[32vw] items-center gap-2 rounded-[5px] border border-[#d2d8e0] bg-[#f4f6f9] px-2.5 py-1.5 font-mono text-[12.5px] text-[#8a93a2]">
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.2-3.2" />
        </svg>
        <span>search</span>
      </div>
      <div className="ml-auto flex items-center gap-[9px] text-[12px] text-[#5b6470]">
        <span>{clinician}</span>
        <span className="flex h-7 w-7 items-center justify-center rounded-[4px] bg-[#e4eafd] text-[11.5px] font-bold text-[#2756e6]">
          {clinicianInitials}
        </span>
      </div>
    </header>
  );
}

export default AppBar;
