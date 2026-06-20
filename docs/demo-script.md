# Demo script — prompts for every feature

Copy-paste prompts (and UI actions) to show off every feature, tuned to the built-in demo
patient. Maps to the capabilities in [`problems-and-solutions.md`](./problems-and-solutions.md).

## Setup

- **Just open the app** (no SMART launch) → it loads the synthetic **Jane Doe, 68 F**: HTN,
  hyperlipidemia, osteoarthritis; lisinopril, amlodipine, metformin *(no charted dx)*,
  atorvastatin, aspirin; K⁺ trending 4.4 → **5.3 (high)**, eGFR 58; penicillin allergy;
  influenza up to date, **mammogram overdue**, **pneumococcal + shingles due**, **bone-density
  missing**. Every prompt below is written for her.
- Type prompts into the **Assistant** panel on the right.

**Legend:** ⌨ = type into the assistant · 🖱 = UI action · 🔑 = needs the live model
(`ANTHROPIC_API_KEY` set) · ⚡ = works **without** a key (deterministic card router).

---

## Ambient — on load (no prompt needed)

- 🖱 **F8 Proactive alerts** — the **Safety scan** strip appears above the chat on load:
  `K⁺ 5.3 + active ACE inhibitor`, a statin + calcium-channel interaction, and `Metformin
  active · no charted indication`. Click **why ▾** to see the cited evidence.
- 🖱 **F15/F16 Health maintenance** — the **Health Maintenance** section lists the actionable
  preventive items (mammogram overdue, bone-density missing, pneumococcal + shingles due) with
  status badges and citations. Up-to-date items stay quiet.

---

## Chat prompts (one per feature)

### F1 — Ask about this patient 🔑
- ⌨ `Why is she on lisinopril?`
- ⌨ `What's her latest potassium, and is it in range?`
- *Expect:* a grounded, one-line answer with citation chips (e.g. `[MedicationRequest/lisinopril-10]`, `[Condition/I10]`) that open the reference drawer.

### F2 — Medication reconciliation ⚡
- ⌨ `Reconcile her medications.`
- ⌨ `Check her meds for drug interactions.`  *(curated interaction screen)*
- *Expect:* a reconciliation card — duplicate antihypertensives, metformin without a charted dx, the statin + CCB interaction, and an eGFR coverage-gap note.

### F3 — Plain-language summary ⚡
- ⌨ `Summarize her for handoff.`
- *Expect:* an SBAR card (Recommendation left as `[clinician to complete]`) plus a plain-language patient summary, cited.

### F4 — Natural-language FHIR query / trend ⚡
- ⌨ `Show her potassium over the last year.`
- ⌨ `Show her A1c.`  *(not on file → states so plainly)*
- *Expect:* a trend card with the 4 K⁺ points (last one flagged high), the reference range, and the literal `Observation?code=2823-3&date=ge…` query as provenance.

### F5 — Order / Rx drafting ⚡
- ⌨ `Draft a repeat BMP for next week.`
- ⌨ `Order a CBC.`  · ⌨ `Order a lipid panel.`
- *Expect:* an **Order draft** card (DRAFT — not signed) with Confirm / Edit / Reject, and the **Export** menu (Print / Copy / Download). Nothing is signed until you click Confirm.

### F6 — Note assistant ⚡
- ⌨ `Draft a progress note for today.`
- *Expect:* a SOAP note card + a "what to document" checklist (e.g. confirm metformin indication, document the K⁺ trend), cited, draft-only.

### F7 — Guideline & coding lookup ⚡
- ⌨ `What should I monitor on metformin, and suggest a code?`
- *Expect:* cited monitoring guidance (eGFR / A1c cadence) and candidate ICD-10/SNOMED codes flagged "needs confirmation — no diabetes Condition charted."

### F11 — Billing & coding ⚡
- ⌨ `Suggest billing codes for today's visit.`  · ⌨ `How do I bill this visit?`
- *Expect:* a billing card — a service/fee code + diagnostic codes from her problems, with a "curated synthetic fee subset" caveat and a missing/under-billed catch. Has **Export**.

### F12 — Standardized e-referrals ⚡
- ⌨ `Refer her to cardiology.`  · ⌨ `Find a specialist and book an appointment.`
- ⌨ `Draft a referral letter to nephrology.`  *(referral wins over "letter"/forms)*
- *Expect:* a referral package — candidate specialists + wait times, pre-filled & cited form fields, supporting attachments (present vs. missing), proposed (never-booked) times, an editable letter, and **Export**. Never auto-sent.

### F13 — Forms & letters ⚡
- ⌨ `Write a sick note for her.`
- ⌨ `Draft a return-to-work letter.`  · ⌨ `Draft a disability attestation.`
- *Expect:* a form card, prefilled + cited, minimum-necessary disclosure (a plain sick note omits the diagnosis). Has **Export**.

### F15 / F16 — Preventive care (conversational) 🔑
- ⌨ `Is Jane up to date on her vaccinations?`
- ⌨ `What preventive screenings is she due or overdue for?`
- *Expect:* a grounded answer from her Immunization/Procedure data (the same facts the Health
  Maintenance section computes). For the deterministic card view, use the section + buttons below.

---

## UI walkthroughs

### Health Maintenance actions (F15/F16 → F5) ⚡
- 🖱 In the Health Maintenance section, click **Draft order** on *Pneumococcal vaccine* → the
  assistant drafts an **Order draft** card titled "Pneumococcal vaccine" (a medication order).
- 🖱 Click **Discuss** on any item → asks the assistant whether it's indicated (needs 🔑).

### Card export (F11/F12/F13/F5) ⚡
- 🖱 On any referral / billing / form / order card, click **Export → Print / Copy / Download**.

### Chart section pages (the EHR shell) ⚡
Click each item in the left **Chart** sidebar:
- 🖱 **Snapshot** — overview: summary, stat cards (problems, meds, allergies, flagged labs,
  vaccines/screenings rollups), and the actionable Health-Maintenance preview.
- 🖱 **Problems** — the 3 charted conditions, each a citation chip → reference drawer.
- 🖱 **Results** — labs newest-first, K⁺ 5.3 flagged **high**, cited.
- 🖱 **Notes** / **Orders** — empty states with a **Draft a note / Draft an order** button
  that hands off to the assistant.
- 🖱 **Allergies** — Penicillin (rash); the empty state warns "verify with the patient."

---

## One-minute happy path

1. Open the app → point at the **Safety scan** and **Health Maintenance** strips (F8/F15/F16).
2. ⌨ `Reconcile her medications.` (F2) → ⌨ `Show her potassium over the last year.` (F4)
3. ⌨ `Refer her to cardiology.` (F12) → click **Export → Copy**.
4. ⌨ `Suggest billing codes for today's visit.` (F11) → ⌨ `Write a sick note for her.` (F13)
5. 🖱 Click **Snapshot** then **Results** in the sidebar to show the chart shell.

> Steps 2–5 work **without an API key** (deterministic card router). Free-text Q&A (F1, the
> conversational preventive prompts) needs `ANTHROPIC_API_KEY`.
