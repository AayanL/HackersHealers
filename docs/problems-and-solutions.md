# Problems → Features

The **problems** here are taken directly from the event's
[`Developer Guide — June 20th AI in Healthcare Event`](./Developer%20Guide%20-%20June%2020th%20AI%20in%20Healthcare%20Event.pdf)
("What Clinicians Want You to Build" — the COMPASS clinician priority-setting findings). The
**solutions** are the features in this codebase, mapped onto each clinician-stated need.

> The Developer Guide is the authoritative problem list; our own
> [`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md),
> [`feature-backlog.md`](./feature-backlog.md),
> [`billing-referrals-forms-design.md`](./billing-referrals-forms-design.md), and
> [`preventive-care-design.md`](./preventive-care-design.md) describe how each feature is built.

## Why it matters (from the guide)

> Family physicians lose **~19 hours/week to administrative work**, **over half report
> burnout**, and **~1 in 5 Canadians has no regular primary care provider.** Clinicians aren't
> asking AI to replace judgement — they want tools that *reduce repetitive work, support
> preparation and follow-through, and protect continuity of care.*

**Coverage legend:** ✅ Covered (built, Phase-1 synthetic slice) · ◐ Partial (built but
narrower than the full ask) · ○ Gap (designed-but-deferred, or not yet started).

---

## Challenge area 1 — Pre-visit preparation
*"Visits start cold because they lack time to review the chart."*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| Chart scan that flags items **due** (vaccinations, cancer screening, chronic-disease monitoring) | **F15** immunization status + **F16** screening gaps (age/sex → CTFPHC/NACI rule table → due/overdue/missing) + **F8** proactive alerts | ✅ |
| At-a-glance review before the visit | **Snapshot** chart page + **At a Glance** rollups (problems, meds, flagged labs, vaccines/screenings) | ✅ |
| Contextual summary of **what changed since last visit** (incoming results, hospital reports, specialist notes) | **F3** summary covers the chart, but a true since-last-visit diff needs the inbox feed | ◐ |
| Dynamic **pre-visit questionnaires** by problem/visit reason | — | ○ |
| Patient-facing **pre-visit check-in** (agenda + updates) | — | ○ |

## Challenge area 2 — Encounter support & point-of-care reasoning
*"Contextual nudges that surface the right information at the right moment."*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| Guideline-based prompts during the visit (e.g. "heart failure — considered Jardiance?") | **F7** guideline & coding lookup + **F8** proactive alerts (e.g. ACE-inhibitor + high K⁺) | ✅ |
| Tailored summaries accounting for the **full problem list**, not just the presenting issue | **F1** grounded Q&A over the whole chart + **F3** summary | ✅ |
| Smart search across **scanned docs, faxes, external reports** | — (no document corpus in scope) | ○ |
| Community resource retrieval (mental health, physio, social services) | — | ○ |

## Challenge area 3 — Medication & prescribing support
*"Among the most prominent pain points" — safety + logistics.*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| Polypharmacy review / deprescribing for chronic-med patients | **F2** med reconciliation (duplicate therapies, drug–drug interactions, meds with no charted indication) | ◐ (review yes; explicit deprescribing suggestions partial) |
| Monitoring reminders for high-risk therapies (bloodwork for psych/rheum meds) | **F7** monitoring guidance (e.g. eGFR on metformin) + **F8** lab-aware alerts | ◐ |
| Safer prescribing (interactions/allergy at order time) | **F5** order/Rx drafting with inline allergy + interaction banners, draft-only, human-signed | ✅ |
| Cross-setting medication reconciliation | **F2** runs over the in-context chart; cross-setting needs external sources | ◐ |
| Automated **limited-use code** reminders (coverage eligibility) | **F11** billing/coding catches likely missing/under-billed codes (curated synthetic) | ◐ |
| Real-time **drug shortage / back-order** alerts | — | ○ |
| Pharmacy **cost comparison + coverage** checks | — (the "pharmacy agent" idea) | ○ |

## Challenge area 4 — Follow-up & care-plan automation
*"Post-visit work … frequently falls through the cracks."*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| Screening-interval reminders | **F15/F16** compute cadence (due/overdue) per guideline | ◐ |
| Documentation-gap capture from the encounter | **F6** "what to document" checklist + note to-dos | ◐ |
| Automated **follow-up task generation** from visit notes | **F14** follow-up tracker (designed, deferred) | ○ |
| **Test-completion tracking** with alerts on missing results | **F14** (deferred) | ○ |
| Patient reminders tied to care-plan milestones | — | ○ |
| Complex care-plan scaffolding for multi-condition patients | — | ○ |

## Challenge area 5 — Administrative & coordination automation
*"Where AI should start." Experts ranked a **"digital medical office assistant"** #1 — which is exactly our F11/F12/F13 trio.*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| **Referral intelligence**: specialist availability, **wait times**, scope matching, resubmission | **F12** e-referrals — specialty pick, candidate specialists + wait times, pre-filled & cited form, proposed attachments/times, export (never auto-sent/booked) | ✅ (resubmission = Phase 2) |
| **Forms automation**: insurance forms, disability applications, school notes from chart data | **F13** forms & letters — sick-note / return-to-work / attestation, prefilled + cited, minimum-necessary disclosure | ✅ |
| **Billing support** + roster reconciliation | **F11** billing & coding — service/fee + diagnostic codes, missing-code catch (curated synthetic fees) | ◐ (billing yes; roster reconciliation no) |
| **Inbox & fax triage**: classify, dedupe, route, summarize | **F10** AI inbox manager (designed, deferred) | ○ |
| After-hours triage support for patient calls/messages | — (the "validated triage" idea) | ○ |

## Challenge area 6 — Continuity & whole-person intelligence
*"Preserve the patient story across time, settings, and providers."*

| Clinician need (guide) | Our feature | Status |
|---|---|---|
| Continuity **handoff** tools (covering physician / cross-setting) | **F3** SBAR handoff draft, cited | ◐ |
| Longitudinal summaries that capture the **narrative arc** | **F3** summarizes current chart; not a multi-year narrative | ◐ |
| Family relationship visualization | — | ○ |
| Social / community context surfacing (housing, employment, supports) | — | ○ |

---

## Design requirements — how the build satisfies them

The guide is explicit that *how* a tool integrates matters as much as what it does. Our
architecture maps onto each requirement:

| Requirement (guide) | How this build meets it |
|---|---|
| **Integration over fragmentation** ("no 20 logins") | One assistant docked inside a SMART-on-FHIR EHR shell — no second app, no extra login; reads ride the existing patient token |
| **Low cognitive burden** | Structured **cards** instead of prose, one-sentence narration, and panels that go quiet — `SafetyScan` / `HealthMaintenance` render nothing when there's nothing actionable |
| **Actionable outputs** ("convert decisions into tasks") | Every feature drafts an *action*: the referral, the order, the form, the note — plus one-click Draft-order / Discuss / Reconcile and Print/Copy/Download export |
| **Calibrated trust** | Every clinical claim is **cited** to its FHIR resource; "draft only — review before…" banners; codes/doses are deterministic (the model can't invent them); the prostate-PSA *recommend-against* restraint |
| **Proactive, not reactive** | **F8** scans on load; **F15/F16** surface due/overdue items at a glance before being asked |
| **Practical affordability** | Reads run client-side; a deterministic keyword router renders cards **without an API key**, so the demo works at zero model cost |
| **Privacy by design** | Synthetic data today with de-identification + audit **seams already on the call path**; least-privilege scopes; PHI is a config flip, not a rewrite |

---

## The honest scorecard

**Strongly covered (built):** the **digital-medical-office-assistant** trio the experts ranked
#1 — billing (F11), referrals with wait-times (F12), and forms (F13) — plus pre-visit
prep via preventive flags (F15/F16) and the proactive scan (F8), grounded chart Q&A and
summaries (F1/F3), reconciliation and safe drafting (F2/F5), and guideline/coding lookup (F7).

**Designed but deferred (Phase 2/3):** ambient scribe (F9), inbox/fax triage (F10), and the
follow-up/test-tracking loop (F14).

**Not yet addressed (clear next bets, straight from the guide):** the **inbox manager** (#2
expert pick), pre-visit questionnaires + patient check-in, smart search over scanned
docs/faxes, drug-shortage + pharmacy-cost lookups, after-hours triage, and the whole-person
continuity tools (family graph, social context, multi-year narrative).
