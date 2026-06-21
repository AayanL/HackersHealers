# HackersHealers — what it does (a note for the judges)

**In one line:** an AI assistant that lives *inside* the doctor's chart (a SMART‑on‑FHIR EHR) and
helps before, during, and after the visit — and every answer ends in something the clinician can
actually act on.

**The problem it solves:** a clinician's information is scattered across screens, and the EHR mostly
*reacts* to what you click. Prep is manual, safety checks are easy to miss, and the paperwork —
referrals, billing, forms — eats the day.

---

## What it does, across the visit

**1 · Before the visit — instant prep ("At a Glance")**
- One plain‑English snapshot of the patient instead of digging through tabs.
- **Proactive, not reactive:** it surfaces what's **due or overdue** — vaccinations and recommended
  screenings for the patient's age and sex — *before anyone asks.*

**2 · During the visit — see the whole picture**
- Flags drug **interactions** and searches the patient's past records in seconds.
- Shows how a value is **trending over time on a graph** (e.g. *"graph potassium"*) instead of a
  wall of numbers.
- **Every feature produces an action, not just text** — a drafted referral, order, form, or note —
  with one‑click **Draft order / Discuss / Reconcile** and **Print / Copy / Download**.

**3 · Safer prescribing**
- Reconciles the full medication list and checks **interactions and allergies at the moment of
  ordering.**
- Catches unsafe orders — ask *"Prescribe ibuprofen 4000 mg, is that safe?"* and it flags the
  problem.

**4 · After the visit — admin & coordination on autopilot**
- Drafts **referrals** — finds specialist availability and wait times, matches the right scope, and
  handles resubmission.
- **Suggests billing codes** for the visit, e.g. *"suggest billing codes for today's visit — we did
  a general checkup and bloodwork."*

---

## Why it's different
- **Integrated, not fragmented** — one assistant docked inside the EHR, covering the whole visit.
- **Proactive** — surfaces gaps before they're missed.
- **Actionable** — it drafts the next step every time; the clinician stays in control (review →
  confirm).
- **Safe by design** — nothing is sent, signed, or ordered automatically.

## Privacy
- Runs on **synthetic (fake) patient data** today. Moving to **real patient data (PHI) is a single
  config flip** — the privacy and audit safeguards already sit on the path.

## Try it live
- **http://hackers-healers.vercel.app/launch**
- Prompts to try: *"Reconcile the medications"* · *"Graph potassium"* · *"Prescribe ibuprofen
  4000 mg — safe?"* · *"Refer to cardiology"* · *"Suggest billing codes for today's visit — general
  checkup and bloodwork."*
