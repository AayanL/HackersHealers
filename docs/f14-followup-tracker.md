# F14 — Resource & Follow-up Tracker (design note)

> **Status: deferred — design note only, not for implementation now.** Phase 2.
> Parked out of the active design set ([`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md))
> at the team's request. Parent design: [`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md);
> backlog index: [`feature-backlog.md`](./feature-backlog.md).

> Origin note (2026-06-20): *"Keep track of resources."*

## Interpretation — confirm before building

"Keep track of resources" is ambiguous. This note **assumes** it means **tracking open clinical
loops to closure** — pending referrals, awaited results, and follow-up tasks. Two other readings
are possible and would change the design entirely:

1. **Open-loop / follow-up tracking** (assumed here).
2. **Clinic resources** — rooms, equipment, staff scheduling (an operations feature, out of the
   assistant's current scope).
3. **FHIR-resource provenance** — tracking which resources the assistant has read/cited.

The rest of this note designs reading (1). **Needs confirmation.**

## The pain (reading 1)

Referrals sent, results awaited, and tasks created get dropped because nothing tracks them to
closure — the classic "fell through the cracks."

## Shape (when it's picked up)

- [ ] A per-patient worklist of **open items**: pending referrals (from F12), awaited results,
      follow-up tasks — each with status + age.
- [ ] **Auto-close** a loop when the fulfilling resource arrives (link the `Task` to the
      DiagnosticReport / referral response that satisfies it).
- [ ] Surface overdue loops proactively — reuse the **F8** (and, if built, F10) ranking so the
      oldest/most-urgent open loop rises.
- [ ] Every item cites its source resource; status changes go draft → confirm where they imply a
      write (no silent state changes).

## FHIR & reuse

- **FHIR.** `Task` (the open-loop record), CarePlan, ServiceRequest, DiagnosticReport
  (read; Task write, Phase 2).
- **Reuses.** F8's ranking engine; consumes F12's `ServiceRequest` + `Task` outputs (and, if
  built, F10's flagged items). Natural downstream of those two.

## Client vs server

Mostly client: read the open `Task`/`ServiceRequest` set for the in-context patient and render
the worklist. Loop auto-close (matching an arriving result to an open Task) may run server-side
if it needs subscription/polling — but note that **cross-patient** watching belongs to the F10
inbox, not here. F14 stays **single-patient, in-context** like F1–F8.

## Removability

Delete `capabilities/follow-up/` + its one `register(...)` line: the worklist panel disappears
and F8/F12 are untouched (they never call into F14).

## 10× bar

From "hope nothing falls through the cracks" → "every open loop visible, aging, and auto-closed
when it resolves."

## Phase & open questions

- **Phase 2.** Depends on F12 (and optionally F10) existing to have loops worth tracking.
- Open: **confirm the interpretation** (open-loop vs clinic-resources vs provenance); is loop
  auto-close single-patient/in-context only, or does it need the F10 server-side watcher?
