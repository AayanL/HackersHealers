# F10 — AI Inbox Manager (architecture note)

> **Status: design note only — not for implementation now.** Phase 2/3.
> Extracted from [`feature-backlog.md`](./feature-backlog.md) (F10) so the cross-patient
> architecture is captured before anyone builds the naive version.

> Origin note (2026-06-20): *"Medical AI inbox manager, parse and flags them."*

## The pain

Incoming results, faxes, specialist letters, and messages pile up undifferentiated; the
clinician opens every one just to find out whether it matters.

## Why this one is different from F1–F8

F1–F8 are **reactive, single-patient, in-context**: the clinician launches into *one* chart on a
patient-scoped SMART token (`patient/*.read`) and everything is grounded to that patient. The
inbox is **proactive, cross-patient, ambient** — a stream of items arriving for *many* patients
that nobody has opened yet. It is the one feature that breaks the single-patient invariant the
rest of the app relies on.

## Core principle: a global *orchestrator*, not a global *brain*

The tempting-but-wrong design is one model call that ingests every patient's inbox at once and
reasons over the whole pile. Reject it:

- **Privacy blast radius** — one prompt sees dozens of patients' PHI.
- **Grounding** — citations get muddled across patients.
- **Context** — the panel doesn't fit, and quality drops.

The right design keeps a **global queue/orchestrator** but runs each item through its own
**single-patient, single-item** triage. Same LLM, same `/api/chat`-style gateway as F1–F8 — only
the *trigger and the loop* are global.

> **The single-patient invariant doesn't disappear — it moves down a level:** from "the whole app
> is pinned to one patient" to "each triage turn is pinned to one patient." That preserves
> per-item grounding, citations, de-identification, and audit.

## Pipeline (one item)

```
new result / fax / letter arrives
        │
   ┌────▼─────┐   cheap DETERMINISTIC pass first —
   │ classify │   resource type, critical-value ranges, abnormal flags.
   └────┬─────┘   Most triage is rules, not the LLM.
        │ (only ambiguous / free-text items go to the model)
   ┌────▼──────────────┐  build a MINIMAL context for THIS patient only
   │ triage (scoped)   │  → urgency + plain-language meaning + suggested action
   │  one patient,     │  → citation back to the source FHIR resource
   │  one item         │
   └────┬──────────────┘
        │
   ┌────▼─────┐  merge into ONE queue, ranked by urgency × age
   │  rank    │  (reuse the F8 safety-scan ranking engine)
   └────┬─────┘
        │
   inbox surface: AI one-liner + "why" evidence + proposed action
                  (never auto-executed — draft → confirm → act)
```

**The LLM is the last resort, not the first pass.** A critical potassium is a range check; a
free-text fax from a cardiologist is what actually needs the model. Rules first keeps cost and
blast radius down.

## What's genuinely new vs. the Phase-1 build

1. **Auth scope.** Not a patient-scoped launch. Needs a **provider-scoped** SMART launch
   (`user/*.read` — "this provider's panel") or **SMART Backend Services** (`system/*.read`,
   system-to-system, no user present). A strictly more powerful token ⇒ de-id + audit become
   mandatory and per-item, not optional seams.
2. **A server-side worker.** F1–F8 run while a clinician looks at a chart. The inbox runs with
   **no chart open** — event-driven (FHIR `Subscription`) or polled (`_lastUpdated` on
   DiagnosticReport / Communication / DocumentReference). It can triage overnight, so there is no
   human in the loop at read time — the "never auto-act" rule and the audit log matter more, not
   less.
3. **Cross-patient aggregation only at the list level.** The queue ranks across patients; the
   reasoning never sees more than one.

In registry terms (design §3) it is the cross-patient, server-side **generalization of F8
(proactive alerts)**: F8 scans the one open chart, F10 scans the provider's whole incoming
stream — same ranking engine, different scope + trigger.

## FHIR & registry shape

- **FHIR.** Communication, DiagnosticReport, Observation, DocumentReference, Task (read);
  Task / Flag (write, P2). Faxes/PDFs need an OCR/extract step before classification.
- **Descriptor** declares `surface: 'inbox'` (new), `executionSide: 'server'`,
  `trigger: 'event' | 'scheduled'` — instead of F1–F8's `surface: 'chat'`. Still registers as a
  capability and is removable by deleting `capabilities/inbox/` + its one `register(...)` line.

## 10× bar

From "open every message to know if it matters" → "a ranked queue where the top of the list is
the only thing that needs you today."

## Open questions to settle before building

1. **Ingestion mechanism** — does the target EMR/network expose FHIR `Subscription`, or is it
   poll-only? Faxes/PDFs → which OCR path?
2. **Auth mode** — provider-scoped (`user/*`) launch vs. Backend Services (`system/*`)? Drives
   the whole server-worker + audit design.
3. **Action set** — which proposed actions (book follow-up, reply, file, forward) are in scope,
   and which downstream systems execute them.
