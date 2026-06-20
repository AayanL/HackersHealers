# Feature Backlog — from the 2026-06-20 clinician notes

Net-new capabilities beyond the eight in
[`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md) (F1–F8), captured from
clinician interview notes at the 6/20 hackathon. Each is written to drop into the **same
capability-registry pattern** (design §3): a `capabilities/<feature>/` folder + one
`register(...)` line, with its tools / panel actions / FHIR scopes derived from a descriptor —
so every item is removable "by deleting a folder + one line."

**The bar — "Has to be 10× better."** Every feature has an explicit 10× target. If it's only
marginally better than the EMR's built-in, it doesn't ship.

**Phase reality.** These touch *real* workflows — dictation of real encounters, billing to the
ministry, referrals to real specialists. They sit behind the same `synthetic | phi` gate as
F1–F8: built and demoed on synthetic data with the de-identification + audit seams on the call
path, and the live-PHI flip gated to **Phase 2/3** (BAA, write-scope governance, audit).

This file is an **index**. Each feature's full detail — build checklist, FHIR mapping,
removability, 10× target, phase, open questions — lives in the linked doc. **Nothing here is
implemented yet.**

---

## Index

| # | Feature | Origin note | Status | Detail |
|---|---------|-------------|--------|--------|
| **F9** | Ambient scribe / voice dictation ★ *"Huge win"* | *"Medical scribes", "Voice dictations before"* | Deferred (P2) | [`f9-ambient-scribe.md`](./f9-ambient-scribe.md) |
| **F10** | AI inbox manager | *"parse and flags them"* | Deferred (P2/3) | [`f10-ai-inbox-manager.md`](./f10-ai-inbox-manager.md) |
| **F11** | Billing & coding assistant | *"900 page billing", "missing code", "batch file to ministry — back and forth"* | **Active · P1 slice built** | [`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md) |
| **F12** | Standardized e-referrals | *"Ocean portal", "e-referrals standardizing"* | **Active · P1 slice built** | [`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md) |
| **F13** | Forms & letters | *"sick notes… disability health credits"* | **Active · P1 slice built** | [`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md) |
| **F14** | Follow-up / open-loop tracker | *"keep track of resources"* | Deferred (P2) | [`f14-followup-tracker.md`](./f14-followup-tracker.md) |

- **Active design set:** F11 / F12 / F13 are specced together in
  [`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md).
- **Built (Phase-1 synthetic slice):** **F11** (`lib/billing.ts` → `suggest_billing_codes`),
  **F13** (`lib/forms.ts` → `generate_form`), and **F12** (`lib/referral.ts` → `draft_referral`)
  ship deterministic, curated-synthetic card builders wired into the assistant (router + AI SDK
  tool + typed card + tests). F12 looks up a specialist, pre-fills + cites the referral form,
  proposes attachments and appointment times, and exports — draft-only, never sent or booked,
  against a synthetic portal-agnostic template. The batch submit broker, fee-schedule RAG, real
  fee schedule, the real (Ocean) referral registry + transport + Bundle envelope + `Task`
  tracking, write-back, and the capability-registry refactor remain Phase 2/3.
- **Deferred (parked, do-not-implement-yet):** F9, F10, F14 each have a standalone design note.

---

## Cross-cutting (applies to all of F9–F14)

- [ ] Each ships as a `capabilities/<feature>/` plug-in with one `register(...)` line; tools,
      panel actions, and **declared FHIR scopes** derive from its descriptor (no hard-wiring).
      *Depends on the capability registry — see [`phase-1-todo.md`](./phase-1-todo.md) §A.*
- [ ] **Writes are never automatic.** Scribe notes, claims, referrals, forms, and task closures
      all go draft → explicit human confirm → submit, through the guarded write broker.
- [ ] **De-id + audit on the path** for every new egress (transcripts, inbox bodies, claims).
- [ ] Update design doc §4 (the feature table) and §8 (roadmap) once any of these is committed to.

## Decisions to confirm before building

1. **F11 billing standard** — which province/payer fee schedule + batch format is the target?
   (Drives the whole batch builder + RAG corpus.)
2. **F12 referral targets** — which portals/forms (Ocean eReferral + which specialty templates)?
3. **F14 "keep track of resources"** — confirm it means open-loop/follow-up tracking (assumed)
   vs. clinic resources vs. FHIR-resource provenance.
