// F13 — forms & letters generator (Phase-1 synthetic slice).
//
// Pure + deterministic (no `ai` import). Per the design doc
// (docs/billing-referrals-forms-design.md): the template is the typed card; the
// chart-derived facts are prefilled and cited here, blanks the clinician must
// complete are explicit (`[bracketed]`), and disclosure is minimum-necessary per
// template (a plain sick note never states the diagnosis). The model only frames
// connective prose; it never invents a date, identifier, or determination. Draft
// only — never auto-issued.

import type { FormCardData, FormField } from "./assistant";
import type { PatientContext } from "./grounding";

interface FormTemplate {
  id: string;
  title: string;
  disclosure: string;
  build(ctx: PatientContext, visitDate: string | null): {
    fields: FormField[];
    body: string;
  };
}

/** Most recent dated observation = the synthetic "date seen". */
function lastVisit(ctx: PatientContext): string | null {
  const dates = ctx.observations
    .map((o) => o.date)
    .filter(Boolean)
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}

/** Render a value, or a `[bracketed]` clinician-to-complete placeholder. */
function fill(value: string | null, placeholder: string): string {
  return value ?? `[${placeholder}]`;
}

function identityFields(
  ctx: PatientContext,
  visitDate: string | null,
): FormField[] {
  return [
    { key: "name", label: "Patient", value: ctx.patient.name || null },
    { key: "dob", label: "Date of birth", value: ctx.patient.dob || null },
    { key: "seen", label: "Date seen", value: visitDate },
  ];
}

const TEMPLATES: Record<string, FormTemplate> = {
  "sick-note": {
    id: "sick-note",
    title: "Sick / Absence note",
    disclosure:
      "Diagnosis intentionally omitted — minimum necessary for a sick/absence note.",
    build(ctx, visitDate) {
      const fields: FormField[] = [
        ...identityFields(ctx, visitDate),
        { key: "from", label: "Absence from", value: null },
        { key: "to", label: "Absence to", value: null },
      ];
      const body =
        `This is to confirm that ${fill(ctx.patient.name || null, "patient name")} ` +
        `(DOB ${fill(ctx.patient.dob || null, "date of birth")}) was assessed on ` +
        `${fill(visitDate, "date of visit")}. In my opinion they are medically unable ` +
        `to attend work/school from [Absence from] to [Absence to]. ` +
        `No diagnosis is disclosed on this note.`;
      return { fields, body };
    },
  },
  "return-to-work": {
    id: "return-to-work",
    title: "Return-to-work / fitness letter",
    disclosure:
      "Functional limitations may be included; the diagnosis is disclosed only with the patient's consent.",
    build(ctx, visitDate) {
      const fields: FormField[] = [
        ...identityFields(ctx, visitDate),
        { key: "fitness", label: "Fit to return", value: null },
        { key: "restrictions", label: "Restrictions / accommodations", value: null },
        { key: "effective", label: "Effective date", value: null },
      ];
      const body =
        `This letter concerns ${fill(ctx.patient.name || null, "patient name")} ` +
        `(DOB ${fill(ctx.patient.dob || null, "date of birth")}), assessed on ` +
        `${fill(visitDate, "date of visit")}. They are [Fit to return] to work as of ` +
        `[Effective date], with the following restrictions/accommodations: [Restrictions / accommodations]. ` +
        `Diagnosis is not disclosed unless the patient consents.`;
      return { fields, body };
    },
  },
  attestation: {
    id: "attestation",
    title: "Medical attestation / letter",
    disclosure:
      "Includes the charted condition — confirm the patient consents to this disclosure.",
    build(ctx, visitDate) {
      const problem = ctx.problems[0] ?? null;
      const fields: FormField[] = [
        ...identityFields(ctx, visitDate),
        {
          key: "condition",
          label: "Condition",
          value: problem?.name ?? null,
          ref: problem?.ref,
        },
      ];
      const body =
        `This is to attest that ${fill(ctx.patient.name || null, "patient name")} ` +
        `(DOB ${fill(ctx.patient.dob || null, "date of birth")}) is under my care for ` +
        `${fill(problem?.name ?? null, "condition")}, as assessed on ` +
        `${fill(visitDate, "date of visit")}. [Add the specific attestation requested.]`;
      return { fields, body };
    },
  },
};

export const FORM_TEMPLATE_IDS = Object.keys(TEMPLATES);

export function buildForm(ctx: PatientContext, templateId: string): FormCardData {
  const tpl = TEMPLATES[templateId] ?? TEMPLATES["sick-note"];
  const visit = lastVisit(ctx);
  const { fields, body } = tpl.build(ctx, visit);
  const toComplete = fields.filter((f) => f.value === null).map((f) => f.label);
  return {
    kind: "form",
    template: tpl.id,
    title: tpl.title,
    fields,
    body,
    toComplete,
    disclosureNote: tpl.disclosure,
  };
}
