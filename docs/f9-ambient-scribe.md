# F9 — Ambient Scribe / Voice Dictation (design note)

> **Status: deferred — design note only, not for implementation now.** Phase 2 (audio + PHI).
> Parked out of the active design set ([`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md))
> at the team's request. Parent design: [`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md);
> backlog index: [`feature-backlog.md`](./feature-backlog.md).

> Origin notes (2026-06-20): *"Medical scribes", "Voice dictations before", "Huge win".*

## The pain

Every visit ends in a documentation tax — typing or post-hoc dictation. Ambient capture turns
talking into a sign-ready note, which is why the notes flagged it a "huge win."

## Shape (when it's picked up)

This is **not a new generator** — it's a voice front-end on the existing **F6 note assistant**.
The model still produces an F6 SOAP draft; F9 just changes the *input* from typing to speech.

- [ ] Voice capture in the dock (`MediaRecorder`), push-to-talk **and** ambient modes, with a
      visible recording state and a hard stop.
- [ ] Audio → text via a transcription step (`/api/transcribe`), then the transcript feeds the
      **existing F6 builder** (SOAP), pre-filled and editable.
- [ ] Output is an **F6 draft card**, so every F6 guardrail already applies: citations on chart
      facts, "AI draft — review before use", **never auto-signed**, no Phase-1 write-back.
- [ ] Link meds / problems / labs the transcript names back to chart resources (citation chips).
- [ ] **De-identify the transcript before egress** (the existing de-id seam in the gateway);
      audio is **not persisted** in the demo.

## FHIR & reuse

- **FHIR.** Encounter, Condition, MedicationRequest, Observation (read); DocumentReference
  (write, Phase 2, `status=preliminary`, never AI-signed) — all inherited from F6.
- **Reuses.** F6 (note builder + write path), `/api/chat` (drafting), the de-id + audit seams.
  Net-new: a `/api/transcribe` route and the capture UI.

## Client vs server

Client captures audio and shows the editable note surface; `/api/transcribe` does
speech→text server-side (holds any transcription key); `/api/chat` drafts. Hybrid, effectively
server — same verdict as F6.

## Removability

Delete `capabilities/scribe/`, its `/api/transcribe` route, and its one `register(...)` line:
the "Dictate" affordance disappears and F6 reverts to type-only. Nothing else depends on it.

## 10× bar

From "dictate, then clean up" → "talk normally; get a SOAP note with problems, meds, and labs
already linked to the chart, ready to review and sign."

## Phase & open questions

- **Phase 2** (real audio = PHI; needs the de-id + audit path live, and an approved
  transcription provider under BAA).
- Open: which transcription engine/provider (and is it BAA-covered)? Ambient (whole-room) vs
  push-to-talk as the default? Speaker/role separation (clinician vs patient) — in scope or later?
