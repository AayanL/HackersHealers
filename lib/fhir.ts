// Pure FHIR → view-model helpers. No `fhirclient` import here so this module is
// safe to use on the server and trivial to unit-test. Live SMART calls live in
// lib/smart.ts (client-only).

import type {
  Bundle,
  MedicationRequest,
  MedView,
  Patient,
  PatientView,
} from "./types";

export function patientName(p: Patient | undefined | null): string {
  const n = p?.name?.[0] ?? {};
  const given = (n.given ?? []).join(" ");
  const full = [given, n.family].filter(Boolean).join(" ");
  return full || "Unknown patient";
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : "";
  return (first + last).toUpperCase();
}

export function ageFromDob(
  birthDate: string | undefined,
  today: Date = new Date(),
): number | null {
  if (!birthDate) return null;
  const dob = new Date(`${birthDate}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function sexAge(p: Patient, today?: Date): string {
  const age = ageFromDob(p?.birthDate, today);
  const sex = (p?.gender ?? "").charAt(0).toUpperCase();
  return [age != null ? String(age) : null, sex || null]
    .filter(Boolean)
    .join(" ");
}

export function mrnOf(p: Patient): string {
  const ids = p?.identifier ?? [];
  const mr = ids.find(
    (i) =>
      (i.type?.text ?? "").toUpperCase().includes("MR") ||
      (i.type?.coding ?? []).some((c) => c.code === "MR"),
  );
  return (mr ?? ids[0])?.value ?? "";
}

export function patientView(p: Patient, today?: Date): PatientView {
  const name = patientName(p);
  return {
    id: p?.id ?? "",
    name,
    initials: initialsFrom(name),
    sexAge: sexAge(p, today),
    dob: p?.birthDate ?? "",
    mrn: mrnOf(p),
  };
}

export function drugName(mr: MedicationRequest): string {
  const cc = mr?.medicationCodeableConcept;
  if (cc?.text) return cc.text;
  if (cc?.coding?.[0]?.display) return cc.coding[0].display as string;
  if (mr?.medicationReference?.display)
    return mr.medicationReference.display as string;
  return "Unnamed medication";
}

export function dosageText(mr: MedicationRequest): string {
  return mr?.dosageInstruction?.[0]?.text ?? "";
}

export function indicationOf(mr: MedicationRequest): string | null {
  const r = mr?.reasonCode?.[0];
  return r?.text ?? r?.coding?.[0]?.display ?? null;
}

export function isActive(mr: MedicationRequest): boolean {
  return mr?.status === "active";
}

export function medView(mr: MedicationRequest): MedView {
  return {
    id: mr?.id ?? drugName(mr),
    name: drugName(mr),
    sig: dosageText(mr),
    indication: indicationOf(mr),
    status: mr?.status ?? "unknown",
    since: (mr?.authoredOn ?? "").slice(0, 10),
  };
}

/** Active first, then most-recently authored. Stable, non-mutating. */
export function sortMeds(meds: MedicationRequest[]): MedicationRequest[] {
  return [...meds].sort((a, b) => {
    if (isActive(a) !== isActive(b)) return isActive(a) ? -1 : 1;
    return (b.authoredOn ?? "").localeCompare(a.authoredOn ?? "");
  });
}

export function mapMedications(
  source: Bundle<MedicationRequest> | MedicationRequest[],
): MedView[] {
  const list = Array.isArray(source)
    ? source
    : (source?.entry ?? []).map((e) => e.resource);
  return sortMeds(list).map(medView);
}

export function activeCount(meds: MedView[]): number {
  return meds.filter((m) => m.status === "active").length;
}
