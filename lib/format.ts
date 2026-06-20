// Formats a raw numeric quantity for display. FHIR `valueQuantity.value`s from
// Synthea-style servers carry absurd float precision (e.g. 15.125706291650257);
// clinicians read labs to a couple of significant figures. We round to a small
// number of significant figures and trim trailing zeros, so
//   15.125706291650257 → "15.1",  5.30 → "5.3",  0.84 → "0.84",  142 → "142".
export function formatQuantity(value: number, sigFigs = 3): string {
  if (!Number.isFinite(value)) return String(value);
  if (value === 0) return "0";
  // Decimals needed to express `sigFigs` significant figures at this magnitude.
  const magnitude = Math.floor(Math.log10(Math.abs(value)));
  const decimals = Math.max(0, sigFigs - 1 - magnitude);
  return Number(value.toFixed(decimals)).toString();
}
