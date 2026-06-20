import type { FormCardData, FormField } from "@/lib/assistant";
import { CitationLink } from "../CitationLink";
import { CardShell } from "./CardShell";
import { ExportMenu } from "./ExportMenu";

/** Plain-text rendering of the form/letter for print / copy / download. */
function formToText(d: FormCardData): string {
  const fields = d.fields.map(
    (f) => `  ${f.label}: ${f.value ?? "[clinician to complete]"}`,
  );
  return [
    d.title.toUpperCase(),
    "AI draft — review and sign before issuing. Not issued.",
    "",
    ...fields,
    "",
    d.body,
    d.toComplete.length ? `\nTo complete: ${d.toComplete.join(", ")}` : "",
    `\n${d.disclosureNote}`,
  ]
    .filter((s) => s !== "")
    .join("\n");
}

function Field({
  field,
  citationLabels,
  onCitationClick,
}: {
  field: FormField;
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

export function FormCard({
  data,
  citationLabels,
  onCitationClick,
}: {
  data: FormCardData;
  citationLabels?: Record<string, string>;
  onCitationClick?: (ref: string) => void;
}) {
  return (
    <CardShell
      testId="form-card"
      title={data.title}
      tag="draft"
      headerRight={
        <ExportMenu
          filename={`${data.template}.txt`}
          title={data.title}
          text={formToText(data)}
        />
      }
    >
      <div className="rounded-[4px] bg-[#fdf6e8] px-[9px] py-[5px] text-[10.5px] font-semibold text-[#9a6400]">
        AI draft — review and sign before issuing. Not issued.
      </div>

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

      <div className="whitespace-pre-wrap rounded-[5px] border border-[#e3e8ee] bg-white px-3 py-[9px] text-[12px] leading-[1.55] text-[#1f242b]">
        {data.body}
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

export default FormCard;
