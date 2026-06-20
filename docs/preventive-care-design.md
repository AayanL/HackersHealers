# F15 / F16 — Preventive Care: Immunization Status & Screening Gaps (design note)

> **Status: active design — Phase-1 synthetic slice not built yet.** Both features sit behind the same
> `synthetic | phi` gate as F1–F14: built and demoed on synthetic data with the de-identification +
> audit seams on the call path, live-PHI flip gated to Phase 2/3.
> Parent design: [`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md);
> backlog index: [`feature-backlog.md`](./feature-backlog.md). Note template follows
> [`f14-followup-tracker.md`](./f14-followup-tracker.md).

> Origin note (2026-06-20): *"In At a Glance we also want a vaccination module so it displays whether
> all the vaccinations are up to date — and checkups that are required and missing, like a prostate exam
> for men over a certain age, so it checks for anything missing."*

Two features, co-specced here because they share one engine (age/sex → curated rule table → due /
overdue / missing) and one UI surface (At a Glance + a Health Maintenance section):

- **F15 — Immunization status.** Is every age-appropriate vaccine on file and current? (NACI / PHAC schedule.)
- **F16 — Preventive screening gaps.** Which checkups/screens are due, overdue, or missing for this
  patient's age + sex? (CTFPHC.)

**Guideline source (confirmed 2026-06-20): Canadian** — CTFPHC for screening, NACI / PHAC for
immunization, matching the repo's Canadian context (Ocean eReferral in F12, "batch file to ministry"
billing in F11).

## Interpretation

The ask is unambiguous, but two design choices were confirmed with the requester up front:

1. **UI is hybrid** (not At-a-Glance-only). At a Glance shows a rollup; a new collapsible **Health
   Maintenance** section carries the per-item detail and citations. Rationale: "check for anything
   missing" is a list with evidence, which is more than a single grid cell can hold.
2. **Guidelines are Canadian** (CTFPHC + NACI), not US (USPSTF + ACIP).

## The pain

Preventive gaps are invisible during a problem-focused visit — they surface only when someone runs an
annual-physical checklist, or never. The clinician carries every guideline's age/sex thresholds and
cadence in their head while reading a chart that does none of the arithmetic. Vaccines lapse; screens
slip a year, then three.

## Shape (hybrid)

- [ ] **At a Glance** gains two rollup rows fed from the engine:
  `Vaccines: up to date | N due` and `Screenings: 1 overdue`.
- [ ] A new collapsible **Health Maintenance** section (peer of `SafetyScan`, below it) lists each
  actionable item: a status badge (`overdue` / `due` / `missing`), a one-line detail (last done ·
  cadence), a citation chip to the evidence resource (or "no record on file"), and a Phase-2
  "draft order" affordance.
- [ ] **Nothing auto-orders.** Read-only derivation + draft → confirm, consistent with F2 / F5 / F8.
- [ ] **Quiet by design.** Up-to-date items don't shout; the section returns `null` when there's
  nothing actionable, like `SafetyScan`.

## Data model & engine (build plan)

### FHIR types — `lib/types.ts`
Add minimal R4 shapes alongside the existing four:

```ts
export interface Immunization {
  resourceType?: "Immunization";
  id?: string;
  status?: string;                 // "completed" | "entered-in-error" | ...
  vaccineCode?: FhirCodeableConcept;
  occurrenceDateTime?: string;     // YYYY-MM-DD
  patient?: { reference?: string };
}

export interface Procedure {
  resourceType?: "Procedure";
  id?: string;
  status?: string;                 // "completed" | ...
  code?: FhirCodeableConcept;
  performedDateTime?: string;      // YYYY-MM-DD
  performedPeriod?: { start?: string; end?: string };
  subject?: { reference?: string };
}
```

### Context — `lib/grounding.ts`
Add two context types and thread them through `PatientContext` + `buildPatientContext`:

```ts
export interface ContextImmunization { ref: string; code?: string; label: string; date: string; }
export interface ContextProcedure   { ref: string; code?: string; label: string; date: string; }
```

`PatientContext` gains `immunizations: ContextImmunization[]` and `procedures: ContextProcedure[]`
(both defaulting to `[]`, matching how `problems` / `observations` are already optional-with-default).

### Mappers — `lib/fhir.ts`
Add `mapImmunizations` / `mapProcedures` that accept a Bundle-or-array (mirroring `mapMedications`),
normalize the date (`occurrenceDateTime` / `performedDateTime ?? performedPeriod.start`), and derive a
display `label` from `vaccineCode.text` / `code.text`. **Reuse the existing `ageFromDob` and `sexAge`
— do not reinvent age math.**

### Engine — new `lib/preventive.ts`
Pure and deterministic, modeled on [`lib/glance.ts`](../lib/glance.ts); takes an optional `today`
param so tests are stable (same pattern as `ageFromDob(birthDate, today?)`). The clinical knowledge is
a **curated, transparent rule table** — same spirit as `RANGES` in [`lib/clinical.ts`](../lib/clinical.ts)
and the tag rules in [`lib/interactions.ts`](../lib/interactions.ts), and swappable for a guideline
service in Phase 2:

```ts
interface PreventiveRule {
  id: string;                       // "breast-cancer", "pneumococcal"
  kind: "immunization" | "screening";
  label: string;                    // "Mammography (breast cancer screening)"
  sex?: "male" | "female";          // omit = any sex
  minAge?: number;
  maxAge?: number;
  intervalMonths?: number;          // omit = one-time / series
  direction: "recommend" | "shared-decision" | "recommend-against";
  matches: (item: ContextImmunization | ContextProcedure) => boolean;
  source: string;                   // "ctfphc-2024-breast", "naci-2025-pneumococcal"
}
```

**Status computation.** A rule *applies* when `sex` matches and the patient's age (from `ageFromDob`)
is within `[minAge, maxAge]`. For each applying rule, find the most-recent matching item in context:

| Found?                       | `intervalMonths`            | Status        |
|------------------------------|-----------------------------|---------------|
| no matching item             | —                           | `missing`     |
| found, within interval       | set                         | `up-to-date`  |
| found, past interval vs `today` | set                      | `overdue`     |
| found                        | unset (one-time / series)   | `up-to-date`  |
| not found                    | unset                       | `due`         |

`recommend-against` rules never produce `overdue` / `missing`; `shared-decision` rules surface as a
discussion prompt, not a gap (see clinical-accuracy note).

**Exports** mirror glance.ts naming:
- `immunizationStatus(ctx, today?)` → `HealthMaintenanceItem[]` for `kind: "immunization"`
- `screeningGaps(ctx, today?)` → `HealthMaintenanceItem[]` for `kind: "screening"`
- `buildHealthMaintenance(ctx, today?)` → combined, ranked actionable list for the section
- `preventiveSummary(ctx, today?)` → `{ vaccines: string; screenings: string }`, called by
  `buildGlance` to fill the two rollup rows.

### View model — `lib/assistant.ts`
Add `HealthMaintenanceItem`, shaped like the existing `SafetyAlert` so the UI and citation paths reuse
cleanly:

```ts
export interface HealthMaintenanceItem {
  id: string;
  kind: "immunization" | "screening";
  status: "overdue" | "due" | "missing" | "up-to-date";
  title: string;
  detail?: string;          // "last 2023-05 · q24–30 mo"
  evidence: string[];       // ["Procedure/mammo-2023 · 2023-05"]  or  ["no record on file"]
  rule: string;             // "ctfphc-2024-breast"
}
```

Add optional `vaccines?: string` and `screenings?: string` to `GlanceData`.

### Clinical-accuracy note (the prostate trap)

Rules carry a **`direction`** precisely because the requester's own example is the classic mistake.
Under **CTFPHC, routine PSA-based prostate cancer screening is recommended *against*** (with shared
decision-making in the 55–69 band). A naive "every man over X needs a prostate test" checklist would
nag the clinician to order something the national guideline advises *not* to do routinely. So the
prostate rule is encoded `direction: "recommend-against"` (or `"shared-decision"` for 55–69) and is
**never** rendered as an `overdue` / `missing` gap — at most a discussion prompt. This is the whole
safety argument for a curated, cited table over a heuristic checklist, and it's what makes the module
trustworthy to a clinician.

## UI

- New `app/components/assistant/HealthMaintenance.tsx`, modeled on
  [`SafetyScan.tsx`](../app/components/assistant/SafetyScan.tsx): a labeled section with a count badge,
  collapsible rows, a severity-style color map (`overdue` → warn/red, `due`/`missing` → amber/info),
  `CitationLink` evidence chips, and `return null` when the list is empty. Wired as a peer in
  `AssistantDock`'s `topSlot` **below** `SafetyScan`, through the existing
  page → `Console` → `AssistantDock` → `Conversation` chain.
- [`AtAGlance.tsx`](../app/components/assistant/AtAGlance.tsx): add two `<Field>` rows — `Vaccines`
  and `Screenings` — rendered only when `glance.vaccines` / `glance.screenings` are present.
- Citations: extend `resourceIndex` in [`lib/resources.ts`](../lib/resources.ts) so `Immunization/…`
  and `Procedure/…` refs resolve in the reference drawer (title, date, status, source). Items with no
  underlying resource cite the **rule**, not a chip, and read "no record on file".

## FHIR & reuse

- **FHIR.** `Immunization`, `Procedure` (read). Phase-2 "draft order" → `ServiceRequest` via the
  guarded write broker (same path as F5).
- **Data.** Extend `loadChart()` in [`lib/smart.ts`](../lib/smart.ts) with best-effort
  `Immunization?patient={id}` and `Procedure?patient={id}` fetches — tolerate absence exactly like the
  current Condition / Observation fetches (many sandboxes lack these resources). Add
  `SEED_IMMUNIZATIONS` / `SEED_PROCEDURES` to [`lib/seed.ts`](../lib/seed.ts) for Jane Doe (68 F) so
  the demo shows a realistic mix: influenza up-to-date, pneumococcal + shingles (RZV) due, bone mineral
  density missing, mammography overdue.
- **Reuse.** `ageFromDob` / `sexAge` (`lib/fhir.ts`); the `glance.ts` + `safetyScan` structure;
  `CitationLink` + `resourceIndex`; the `SafetyScan` component shell.

## Client vs server

Mostly client: the pure engine runs over the in-context patient in the browser, like F8 / glance — no
new API route for Phase 1. The Phase-2 draft-order submit goes through the guarded write broker.
Cross-patient recall/registry lists belong to the F10 inbox / F14 tracker, not here — **F15 / F16 stay
single-patient, in-context, like F1–F8.**

## Removability

Eventually a `capabilities/preventive/` plug-in + one `register(...)` line (per design §3). For now:
delete `lib/preventive.ts`, `HealthMaintenance.tsx`, the seed arrays, the two `GlanceData` fields, and
the section wiring — F1–F14 are untouched (nothing calls into preventive; `buildGlance` reads the two
rollup strings defensively).

## 10× bar

From "preventive gaps remembered by heart, or caught only at the annual physical" → "every due /
overdue / missing vaccine and screening surfaced at a glance, age/sex-correct, guideline-cited, one
click to a draft order — and *quiet about the tests the guideline says not to do.*"

## Phase & open questions

- **Phase 1 (synthetic slice).** Types + context + mappers + engine + curated CTFPHC/NACI rule table +
  seed + hybrid UI + vitest tests. Deterministic, read-only.
- **Phase 2/3.** Live Immunization/Procedure fetch hardening; guideline-pack RAG + versioning;
  risk stratification; draft-order write-back through the write broker. Same `synthetic | phi` gate.

**Open:**
1. **"No record" semantics.** Absent `Immunization` / `Procedure` ⇒ surfaced as `due` / `missing`
   ("no record on file"), **never** auto-ordered — absence ≠ confirmed not-done (external records,
   historical immunizations not in this EHR). Confirm the wording so clinicians don't read it as
   "definitely never had it."
2. **Risk-based rules.** Some guidelines key off risk (smoking → AAA / lung; family history → earlier
   colorectal). Phase 1 is **age + sex only**; problem/observation-driven risk is Phase 2.
3. **Pediatric NACI series.** Adult-only in Phase 1 (seed patient is adult); childhood schedule deferred.
4. **Rule-pack home & provenance.** Inline TS table for Phase 1; how is the pack versioned and its
   `source` tags resolved to citable guideline text in Phase 2?
5. **Direction rendering.** Exactly how `shared-decision` items appear (a muted "discuss" chip vs.
   omitted) — needs a UX call.

## Tests (Phase-1 acceptance)

New `lib/__tests__/preventive.test.ts` (vitest, `@/` alias, seed-based, **fixed `today`** for
determinism), mirroring [`glance.test.ts`](../lib/__tests__/glance.test.ts). Assert:

- Jane Doe (68 F): pneumococcal + bone-density `missing`, mammography `overdue`, influenza `up-to-date`.
- Age/sex filtering: a synthetic 40-year-old gets no 65+ rule; female-only rules don't apply to a male
  fixture and vice-versa.
- **Prostate PSA is never `overdue` / `missing`** for a male fixture (direction = recommend-against /
  shared-decision) — the headline safety case.
- `preventiveSummary` rollups match the item lists (e.g. "2 due", "1 overdue").
