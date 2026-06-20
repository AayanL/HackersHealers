import type {
  ReferralAttachment,
  ReferralCardData,
  ReferralField,
} from "@/lib/assistant";
import { CitationLink } from "../CitationLink";
import { CardShell } from "./CardShell";
import { ExportMenu } from "./ExportMenu";

/** Plain-text rendering of the referral package for print / copy / download. */
function referralToText(d: ReferralCardData): string {
  const selected = d.candidates.find((c) => c.selected) ?? d.candidates[0];
  const fields = d.fields.map(
    (f) => `  ${f.label}: ${f.value ?? "[clinician to complete]"}`,
  );
  const attachments = d.attachments.map(
    (a) => `  [${a.present ? "x" : " "}] ${a.label}${a.note ? ` (${a.note})` : ""}`,
  );
  const slots = d.slots.map((s) => `  - ${s.date} ${s.time} · ${s.mode}`);
  return [
    "REFERRAL DRAFT",
    "AI-drafted referral — review and complete before sending. Not sent.",
    "",
    `Specialty: ${d.specialty}`,
    selected ? `Destination: ${selected.name} · ${selected.clinic} (${selected.wait})` : "",
    "",
    "Fields:",
    ...fields,
    "",
    "Supporting attachments:",
    ...attachments,
    d.slots.length ? "\nProposed times (NOT booked):" : "",
    ...slots,
    "",
    "Referral letter:",
    d.letter,
    d.toComplete.length ? `\nTo complete: ${d.toComplete.join(", ")}` : "",
    `\n${d.disclosureNote}`,
  ]
    .filter((s) => s !== "")
    .join("\n");
}

function weekday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
    new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  ];
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-[10.5px] font-bold uppercase tracking-[0.06em] text-[#8a93a2]">
      {children}
    </span>
  );
}

function Field({
  field,
  citationLabels,
  onCitationClick,
}: {
  field: ReferralField;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <>
      <span className="self-center font-mono text-[9.5px] font-bold uppercase tracking-[0.05em] text-[#8a93a2]">
        {field.label}
      </span>
      <span className="flex flex-wrap items-center gap-[5px] text-[11.5px] text-[#1f242b]">
        {field.value ? (
          <span>{field.value}</span>
        ) : (
          <span className="font-mono text-[10.5px] text-[#b06a00]">
            [clinician to complete]
          </span>
        )}
        {field.ref ? (
          <CitationLink
            refId={field.ref}
            label={citationLabels?.[field.ref]}
            onClick={onCitationClick}
          />
        ) : null}
      </span>
    </>
  );
}

function Attachment({
  att,
  citationLabels,
  onCitationClick,
}: {
  att: ReferralAttachment;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-[6px] text-[11.5px] text-[#1f242b]">
      <span
        className={`rounded-[3px] px-[6px] py-[2px] font-mono text-[9px] font-bold uppercase tracking-[0.04em] ${
          att.present
            ? "bg-[#e7f5ed] text-[#1f7a4d]"
            : "bg-[#fdf6e8] text-[#9a6400]"
        }`}
      >
        {att.present ? "attached" : "missing"}
      </span>
      <span>{att.label}</span>
      {att.ref ? (
        <CitationLink
          refId={att.ref}
          label={citationLabels?.[att.ref]}
          onClick={onCitationClick}
        />
      ) : null}
      {att.note ? (
        <span className="font-mono text-[9.5px] text-[#8a93a2]">{att.note}</span>
      ) : null}
    </div>
  );
}

export function ReferralCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: ReferralCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <CardShell
      testId="referral-card"
      title="Referral draft"
      tag={data.specialty}
      headerRight={
        <ExportMenu
          filename="referral-draft.txt"
          title="Referral draft"
          text={referralToText(data)}
        />
      }
    >
      <div className="rounded-[4px] bg-[#fdf6e8] px-[9px] py-[5px] text-[10.5px] font-semibold text-[#9a6400]">
        AI-drafted referral — review and complete before sending. Not sent.
      </div>

      {/* Specialist lookup */}
      <div className="flex flex-col gap-[6px]">
        <SectionLabel>Specialist</SectionLabel>
        <div className="flex flex-col gap-[5px]">
          {data.candidates.map((c) => (
            <div
              key={c.id}
              className={`flex flex-wrap items-center gap-[7px] rounded-[5px] border px-[9px] py-[6px] text-[11.5px] ${
                c.selected
                  ? "border-[#c9d7fb] bg-[#f3f6fe]"
                  : "border-[#e3e8ee] bg-white"
              }`}
            >
              {c.selected ? (
                <span className="rounded-[3px] bg-[#2756e6] px-[5px] py-[1px] font-mono text-[8.5px] font-bold uppercase tracking-[0.05em] text-white">
                  selected
                </span>
              ) : null}
              <span className="font-semibold text-[#1f242b]">{c.name}</span>
              <span className="text-[#5b6470]">{c.clinic}</span>
              <span className="ml-auto font-mono text-[10px] text-[#8a93a2]">
                {c.wait}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pre-filled form fields */}
      <div className="flex flex-col gap-[6px]">
        <SectionLabel>Referral form</SectionLabel>
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[6px] rounded-[5px] border border-[#eaedf1] bg-[#fafbfd] px-3 py-[9px]">
          {data.fields.map((f) => (
            <Field
              key={f.key}
              field={f}
              citationLabels={citationLabels}
              onCitationClick={onCitationClick}
            />
          ))}
        </div>
      </div>

      {/* Attachments */}
      {data.attachments.length > 0 ? (
        <div className="flex flex-col gap-[6px]">
          <SectionLabel>Supporting attachments</SectionLabel>
          <div className="flex flex-col gap-[5px] rounded-[5px] border border-[#eaedf1] bg-[#fafbfd] px-3 py-[8px]">
            {data.attachments.map((a) => (
              <Attachment
                key={a.id}
                att={a}
                citationLabels={citationLabels}
                onCitationClick={onCitationClick}
              />
            ))}
          </div>
        </div>
      ) : null}

      {/* Proposed times (booking) */}
      {data.slots.length > 0 ? (
        <div className="flex flex-col gap-[6px]">
          <SectionLabel>Proposed times</SectionLabel>
          <div className="flex flex-wrap gap-[6px]">
            {data.slots.map((s) => (
              <div
                key={s.id}
                className="flex flex-col rounded-[5px] border border-[#e3e8ee] bg-white px-[10px] py-[6px]"
              >
                <span className="text-[11.5px] font-semibold text-[#1f242b]">
                  {weekday(s.date)} {s.date}
                </span>
                <span className="font-mono text-[10px] text-[#5b6470]">
                  {s.time} · {s.mode}
                </span>
              </div>
            ))}
          </div>
          <span className="font-mono text-[9.5px] text-[#8a93a2]">
            Proposed — confirm with the receiving office. Not booked.
          </span>
        </div>
      ) : null}

      {/* Letter */}
      <div className="flex flex-col gap-[6px]">
        <SectionLabel>Referral letter</SectionLabel>
        <div className="whitespace-pre-wrap rounded-[5px] border border-[#e3e8ee] bg-white px-3 py-[9px] text-[12px] leading-[1.55] text-[#1f242b]">
          {data.letter}
        </div>
      </div>

      {data.toComplete.length > 0 ? (
        <div className="rounded-[4px] border border-dashed border-[#d2d8e0] bg-[#fafbfd] px-[9px] py-[6px] text-[10.5px] leading-[1.45] text-[#6b7480]">
          <span className="font-bold">To complete:</span>{" "}
          {data.toComplete.join(" · ")}
        </div>
      ) : null}

      <div className="font-mono text-[9.5px] text-[#8a93a2]">
        {data.disclosureNote}
      </div>
    </CardShell>
  );
}

export default ReferralCard;
