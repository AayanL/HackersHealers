import type { PatientView } from "@/lib/types";

export interface PatientBannerProps {
  patient: PatientView;
  allergies?: string[];
  codeStatus?: string;
}

/** Short, monospace-style allergy chip code (e.g. "Penicillin (rash)" → "PCN"). */
export function allergyShort(name: string): string {
  if (/penicillin/i.test(name)) return "PCN";
  const word = name.replace(/\(.*\)/, "").trim().split(/\s+/)[0] ?? name;
  return word.slice(0, 3).toUpperCase();
}

export function PatientBanner({
  patient,
  allergies = [],
  codeStatus = "Full code",
}: PatientBannerProps) {
  return (
    <div className="flex shrink-0 items-center gap-[14px] border-b-2 border-[#d2d8e0] bg-white px-[18px] py-[11px]">
      <div className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-[5px] bg-[#2756e6] text-[14px] font-bold text-white">
        {patient.initials}
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-baseline gap-[9px]">
          <span className="text-[17px] font-extrabold tracking-[-0.01em]">
            {patient.name}
          </span>
          {patient.sexAge ? (
            <span className="text-[12.5px] font-semibold text-[#5b6470]">
              {patient.sexAge}
            </span>
          ) : null}
        </div>
        <div className="flex gap-3 font-mono text-[11px] text-[#8a93a2]">
          {patient.dob ? <span>DOB {patient.dob}</span> : null}
          {patient.mrn ? <span>MRN {patient.mrn}</span> : null}
        </div>
      </div>
      <div className="ml-auto flex gap-[7px]">
        {allergies.map((a) => (
          <span
            key={a}
            title={a}
            className="flex items-center gap-[5px] rounded-[4px] bg-[#fbefd6] px-[9px] py-[5px] font-mono text-[11.5px] font-bold text-[#9a6400]"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              aria-hidden
            >
              <path d="M12 4 21 19H3z" />
            </svg>
            <span>{allergyShort(a)}</span>
          </span>
        ))}
        <span className="rounded-[4px] bg-[#eef1f5] px-[9px] py-[5px] text-[11.5px] font-semibold text-[#5b6470]">
          {codeStatus}
        </span>
      </div>
    </div>
  );
}

export default PatientBanner;
