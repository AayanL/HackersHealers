# AI Clinical Assistant — Design Doc

## 1. Context & Goals

### Why this exists
The portal today is a working SMART-on-FHIR demo built from three static `fhirclient.js` HTML files: a `launch.html` that runs the SMART OAuth2 handshake, an `index.html` that reads the in-context patient and renders their `MedicationRequest` list, and a `meds.html` sandbox demo. The clinician already has a patient in context and a scoped, browser-side read token. What they *don't* have is a way to ask the chart a question, cross-check it, or turn it into prose without leaving the screen and tab-hunting across the EHR.

This document specifies an **AI clinical assistant** layered on top of that demo as the team rebuilds the front end in **Next.js (App Router)**. The assistant is a single docked surface that hosts **eight features** (F1–F8), each of which plugs into shared infrastructure and can be removed without disturbing the rest. The LLM is reached through a **provider-agnostic gateway** (the Vercel AI SDK), default-backed by Claude but swappable to another provider in one line.

### The demo surface — a mock EHR shell
Real SMART apps don't live in a standalone tab; the EHR embeds them as an icon/panel inside the patient chart (an iframe in the EHR's own screen, patient context already loaded). The sandbox launcher can't embed us — it has no chart UI — so it opens our app URL in a new tab. We reproduce the embedded experience by making **the launched page itself a mock EHR shell**: a patient banner, a chart sidebar, the medication list, and the assistant docked as a right-side panel. A real **SMART App Launch** lands the in-context patient in that shell, so the clinician sees the assistant *inside the chart* — embedded in look and behavior — with no second login or tab switch. The shell is demo scaffolding; in production the same standards-compliant app slots into the EHR vendor's own chrome (and write-back actions would flow via SMART Web Messaging).

### What success looks like
- A clinician can ask a free-form question about the in-context patient and get an answer **grounded only in that patient's chart**, with every claim click-through traceable to the source FHIR resource.
- The assistant **drafts and advises but never acts autonomously** — orders, notes, and code selections are always human-confirmed.
- Any of the eight features can be **added or removed by editing one folder and one registration line**, with a compile-time guarantee that nothing shared reached into it.
- The system runs on **synthetic data today** with a **clean, pre-built path to real PHI** — turning PHI on is a configuration flip, not a rewrite.

### Non-goals
- **Not a medical device, not a diagnosis engine.** The assistant is decision *support*; the clinician is the decision-maker of record.
- **Not an autonomous agent.** No feature writes to the chart, places an order, or signs a note without an explicit clinician click.
- **Not a general chatbot.** Answers are scoped to the in-context patient; out-of-scope questions are declined, not guessed.
- **Phase 1 does not touch PHI.** Real patient data, BAA-covered model endpoints, and strict de-identification are Phase 2/3 concerns — but their seams exist from day one.

### Data phasing in one line
Synthetic/sandbox FHIR now (no PHI, no BAA needed) → hardening on synthetic data → real PHI behind HIPAA/BAA/de-identification/audit. The data source is a `DataMode` config flip; **no feature changes when it flips.**

---

## 2. Design Principles

- **Grounded-only.** The model may assert clinical content *only* from the supplied, patient-scoped FHIR context. No citation → no assertion. "I don't see that in the chart" is a correct, desirable answer.
- **Modular / pluggable.** Every feature is a self-contained capability that depends on shared infrastructure; shared infrastructure never depends on a feature. Any feature is removable by deleting a folder and one registration line.
- **Human-in-the-loop.** Nothing clinically consequential happens autonomously. Drafts (orders, notes) and actions are always confirm / edit / reject; irreversibility scales friction.
- **Least-privilege.** Request the narrowest SMART scopes each feature actually needs. Write scope is gated to the one feature (F5) that needs it; remove F5 and the app falls back to read-only. **Current state vs. target:** the existing `launch.html` ships a blanket `patient/*.read`; the target is narrowed per-feature read scopes (`patient/MedicationRequest.read`, `patient/Condition.read`, …) derived from the registered capabilities. Replacing the blanket scope is a tracked Phase-1 item (see §7, §8), not the current reality.
- **Phased to PHI.** The LLM chokepoint, the redaction seam, and the audit seam are on the call path from Phase 1 — exercised against synthetic data so PHI is a flip, not a rebuild.

---

## 3. Architecture Overview

### The one rule
The system turns on a single inversion of control: **features depend on shared infrastructure; shared infrastructure never depends on a feature.** Each feature is a *capability* — a self-contained plug-in that declares what it needs and registers itself. The chat UI, the tools handed to the LLM, the proactive-alert scan, and the side-panel actions are all **derived at runtime from whatever capabilities are registered.** Nothing is hard-wired to "F2 exists."

### The capability registry
Each feature lives in its own folder (e.g. `capabilities/medication-reconciliation/`) and exports a single **descriptor** — the only thing the rest of the system knows about it:

| Descriptor field | Purpose |
|---|---|
| **Identity** | stable `id`, `name`, `description`, `category` ("safety", "documentation", "query") |
| **Required FHIR scopes** | e.g. `patient/MedicationRequest.read`; gates the capability when the launch didn't grant them |
| **Required resource types** | lets the data layer prefetch and hides capabilities whose data isn't reachable |
| **Tools** | zero or more LLM tool definitions (name, JSON-schema input, handler, `confirmation` flag) |
| **Surface** | `chat`, `panel`, `proactive`, or a combination |
| **Execution side** | `client` (browser, in-context FHIR) vs `server` (touches LLM key or external API) |
| **Lifecycle hooks** | optional `onChartLoad`, `getPanelActions`, `getSystemPromptFragment` |

**Registration is the only wiring.** One `register(descriptor)` call per feature, collected in a single `capabilities/index` barrel. The registry answers the questions every surface needs: `listEnabledFor(context)`, `getChatTools(context)` (the exact tool set handed to the LLM each turn), `getPanelActions`, `getProactiveScanners`, `getSystemPromptFragments`. **The UI and the LLM are projections of the registry** — the registry is the single source of truth for "what can the assistant do right now."

### Shared infrastructure (the thick layer that keeps features thin)
Six infra modules carry everything that isn't a feature's domain logic:

| Module | Responsibility |
|---|---|
| **a. FHIR Data Access** | wraps `fhirclient.js`; typed, patient-scoped fetchers (`getMedications()`, `getConditions()`); caching/de-dup so F1/F2/F8 hit the server once; a validated, patient-pinned search primitive for F4 |
| **b. Patient Context** | promotes `FHIR.oauth2.ready() → client.patient` to app-wide context; enforces "exactly one patient in context" — the single-patient scope every fetcher and the grounding layer inherit (the cross-patient scan in today's `meds.html` is *dropped*, not ported) |
| **c. LLM Gateway** | the **Vercel AI SDK** (`streamText`) behind a Next.js Route Handler — one provider-agnostic interface, **default-backed by Claude (`@ai-sdk/anthropic`, `claude-opus-4-8`)** and swappable to OpenAI / Google in a single line; home of the secret key, system prompts, streaming, rate limiting, model selection, and (later) the BAA endpoint |
| **d. Grounding / Retrieval** | assembles the context bundle, tags every fact with its source resource id for citation, enforces single-patient scope so no feature can bypass it |
| **e. Tool-calling / Orchestration** | runs the model's tool loop; splits read/query tools (execute immediately) from write/consequential tools (returned as a *proposed action* → review card → execute only on explicit click). F5's "never auto-submit" is a property of *this layer* |
| **f. Audit + Safety middleware** | wraps every gateway call and tool execution: append-only audit (who, patient, capability, in/out, timestamp) and guardrails (PHI policy, "DRAFT" labeling, scope re-validation, per-capability kill-switch) |

### Next.js client-vs-API-route split
- **Client components:** chat UI, side panel, proactive band, the SMART launch/`ready()` handshake, the Data Access layer + Patient Context (they hold the browser-side scoped token), read-only client-eligible tool handlers, citation and review-card rendering.
- **Route Handlers (server):** `/api/chat` (the only path to gateway + audit + guardrails) and `/api/tools/*` only for tools needing a secret or external source. The server holds the provider key (`ANTHROPIC_API_KEY`, read by the AI SDK) and any external keys; it does **not** hold the patient's FHIR token — grounding is assembled client-side and POSTed in (today) or via a backend FHIR service account (later).

### Data flow for one chat turn

```
[Clinician types in chat UI (client)]
        |
        v
[Registry: getChatTools + getSystemPromptFragments + Grounding bundle]
   (client assembles patient-scoped, cited context from Data Access cache)
        |
        v
POST /api/chat { messages, tools, systemFragments, groundingBundle }
        |
        v
[Route Handler]
   -> Guardrail middleware (scope check, PHI policy) --(reject)--> error card
   -> Audit log (turn start)
   -> LLM Gateway.complete()  ->  Claude / Anthropic
        |
        v
[Model response]
   -- final text? --> answer + citations ----> render in chat
   -- tool call?  --> Orchestrator
                         |
            +------------+------------+
            |                         |
     read/query tool            write/consequential tool
     (F4 query, F7 lookup)      (F5 draft, F6 note)
            |                          |
     execute handler            return PROPOSED ACTION
     feed result back,          --> render review card
     loop                              |
            |                  clinician clicks "Confirm"
            v                          |
     model final answer  <------- execute on confirm (audited)
        |
        v
[Audit log (turn end)] -> response streamed back to chat UI
```

Proactive (F8) is the same pipeline minus the typing: on chart load the client runs `getProactiveScanners`; model-backed scans hit `/api/chat` with a fixed "scan for safety flags" instruction; results render in the proactive band.

### How to remove a feature (proof of clean removability)
To remove **F5 (order drafting)**: delete `capabilities/order-drafting/` and its one `register(...)` line in the barrel. That's it. Guaranteed intact, and why:

- **Chat UI** renders whatever `getChatTools` returns; with F5 gone, `draft_medication_request` simply isn't in the set — the model can't draft orders, and nothing dangles.
- **Side panel / proactive band** render registry projections; a removed contributor just disappears.
- **Shared infra names no feature.** Data Access, gateway, grounding, orchestrator, and audit operate on generic shapes. Because dependencies point *into* infra and never back out, deleting a feature can't leave a broken import in shared code — enforced by a boundary rule: **only the capabilities barrel may import a capability**, so the build fails if anything else reaches in.
- **The `*.write` scope** existed only in F5's descriptor; the requested scope set narrows automatically, and no other feature loses access.

Adding a feature is the mirror image: drop a folder, add one `register` line, edit no shared file.

### Migration over the existing static app
- **`launch.html` → a `/launch` route** calling `FHIR.oauth2.authorize`. Today it requests a blanket `patient/*.read`; the migration narrows this to the per-feature read scopes the registered capabilities declare — plus `patient/MedicationRequest.write` *only once F5 ships*; scopes grow with registered capabilities.
- **`index.html` → the main portal page.** Its `oauth2.ready()` + `client.patient.read()` becomes the **Patient Context provider**; its `MedicationRequest?patient=...` request and the four duplicated formatting helpers become the **Data Access layer**. The med-list rendering stays as a normal component; the assistant is *added alongside* it, not a rewrite.
- **`meds.html` → a dev/sandbox fixture** behind the same Data Access interface. **Note:** today's `meds.html` is *not* a single-patient fixture — it pulls a batch of `MedicationRequest`s across all patients, ranks patients by med count, and renders an arbitrary one (the top-ranked). That cross-patient scan pattern is **dropped in the rebuild**: the fixture is re-pointed at the single in-context patient supplied by Patient Context, which enforces the one-patient invariant. This is also the phased-data seam: today Data Access points at the synthetic sandbox; later it points at the real, BAA-covered endpoint, with de-identification and audit hooks already in the grounding and middleware layers. **No capability changes when the data source flips.**

---

## 4. The Eight Features

| Feature | Client/Server | Key FHIR | Phase | Depends on shared infra |
|---|---|---|---|---|
| **F1** Ask about this patient | Hybrid | MedicationRequest, Condition, Observation, AllergyIntolerance (read) | 1 | FHIR context, grounding, LLM gateway, citation UI |
| **F2** Med reconciliation | Hybrid | MedicationRequest, Condition, Observation (eGFR) (read) | 1 (core) → 2 | + terminology/interaction adapter, finding-card renderer |
| **F3** Plain-language summary | Hybrid (eff. server) | MedicationRequest, Condition, Observation, Encounter (read); DocumentReference (write, P2+) | 1 | FHIR+normalization, LLM gateway, citation UI |
| **F4** NL FHIR query | Hybrid | Observation, MedicationRequest, Condition, Encounter, + (read) | 1 | chat surface, LLM gateway, FHIR client, terminology resolver, audit |
| **F5** Order/Rx drafting | **Needs-server** | MedicationRequest (**write**); Allergy, Condition, Observation (read) | 1 demo → **3** PHI write | + orchestration confirm-gate, terminology, write broker, audit |
| **F6** Note assistant | Hybrid (eff. server) | Encounter, Condition, MedicationRequest, Observation (read); DocumentReference/Provenance (write, P2) | 1 draft → 2 write | FHIR client, LLM gateway, citation UI, audit |
| **F7** Guideline & coding lookup | **Needs-server** | Condition, MedicationRequest (read) | 1 → 3 (write-back) | + guideline RAG, terminology client, citation UI |
| **F8** Proactive alerts | Hybrid | MedicationRequest, Condition, Observation, Allergy (read); Flag/DetectedIssue (write, P2) | 1 read → 2 write → 3 PHI | + terminology-normalization, rule engine, citation UI |

### F1 — Ask about this patient (grounded chart Q&A)
- **What / value.** A chat box where a clinician asks free-form questions about the in-context patient and gets answers grounded only in that patient's already-fetched FHIR resources, each claim cited to its source. Collapses the cross-tab scavenger hunt into one verifiable question. *Flagship feature.*
- **UX.** Collapsible "Ask about this patient" panel docked beside the med view; empty-state example chips; streamed answer with bracketed citation chips that scroll to the underlying resource; persistent "grounded in chart only — not medical advice" banner.
- **FHIR.** MedicationRequest, Condition, Observation, AllergyIntolerance, Encounter, Patient (read). Optional Communication/AuditEvent write in Phase 2+.
- **LLM vs deterministic.** LLM does language understanding + phrasing only. Deterministic: patient-scoped fetch, citation-ID attachment, interaction verdicts (RxNorm-keyed source, not the model), "not in chart" enforcement, field redaction.
- **Client/server.** Hybrid. Client fetches + resolves citations; `/api/chat` de-identifies, calls the LLM, streams the grounded answer.
- **Removability.** Leaf-level. Depends only on FHIR context, chat shell, and `/api/chat` + grounding helper. Owns no schema, writes nothing in MVP. Delete the panel mount and its prompt module; everything else is untouched.
- **Key risk + guardrail.** Hallucinated facts → grounding forces answers from the assembled bundle only; every claim needs a citation id or it isn't shown.
- **Phase.** 1.

### F2 — Medication reconciliation assistant
- **What / value.** An on-demand "anything I should double-check?" pass over the med list that surfaces duplicate therapies, interactions, missing renal-dose adjustments, and meds with no matching problem. Does the error-prone cross-product check in seconds.
- **UX.** "Review this med list" button on the med view → a triaged checklist of findings grouped by category, each with a severity badge, offending-drug chips deep-linking to their MedicationRequest, and a cited rule source. "Advisory only — does not modify orders" banner.
- **FHIR.** MedicationRequest, MedicationStatement, Condition, Observation (eGFR/creatinine/weight), Patient (read); Allergy/Encounter optional.
- **LLM vs deterministic.** Safety logic is deterministic: RxNorm normalization, duplicate-class detection, interaction lookup, renal-dose flagging, drug-to-Condition join. LLM only orders, narrates, and answers follow-ups over the pre-computed findings; a server validator strips any claim lacking a source id.
- **Client/server.** Hybrid. Client runs cheap local checks (same-class duplicates, med-without-problem); `/api/tools` proxies keyed terminology/interaction lookups; `/api/chat` narrates.
- **Removability.** Delete its route, findings panel, and registry line; the "Review" button disappears and the med list reverts to read-only. RxNorm/interaction adapters are F2-local unless another feature opts in.
- **Key risk + guardrail.** Alert fatigue / false reassurance → severity-rank and default to high/moderate; explicitly report coverage gaps ("eGFR not on file; renal check skipped") rather than implying a clean review.
- **Phase.** 1 for duplicate/missing-indication + curated interaction subset; full licensed DB, renal-dose, write-back → 2/3.

### F3 — Plain-language summary generator
- **What / value.** One click turns the chart into either an SBAR clinician handoff draft or a 6th-grade-reading-level patient leaflet. Eliminates reconstructing the story before a handoff or discharge. Always a draft a human reviews.
- **UX.** "Summarize" button → right-hand drawer with a "Handoff (SBAR)" / "For the patient" toggle. Four labeled SBAR blocks (Recommendation left as `[clinician to complete]`) or friendly prose; every clinical fact carries a citation chip. "AI-generated draft — review before use" banner; Copy now, Save-to-chart in Phase 2+.
- **FHIR.** MedicationRequest, Condition, Observation, Encounter, AllergyIntolerance, Patient (read); DocumentReference (write, Phase 2+ only).
- **LLM vs deterministic.** Deterministic builds the facts table (coded fields only), sorts, and maps citations; a post-check verifies every number/drug in the output appears verbatim. LLM only frames into SBAR/plain prose and lowers reading level — no new diagnosis, dose, or recommendation.
- **Client/server.** Hybrid, effectively server (its only real work is the LLM call). Client gathers the bundle and renders; `/api/chat` de-identifies and generates.
- **Removability.** Delete the "Summarize" button, the `/api/summary` segment, and the registry entry. Writes nothing by default, so removal leaves no orphaned data.
- **Key risk + guardrail.** Altered/hallucinated facts → fed only the facts table; server post-check rejects any number/drug/condition not present verbatim.
- **Phase.** 1 (draft-only); DocumentReference write-back → 2/3.

### F4 — Natural-language FHIR query
- **What / value.** Turns plain-language clinical questions ("show me her A1c trend over the last year") into validated FHIR searches against the in-context patient, rendering the result with the underlying query shown as provenance. Removes the need to know search params, codes, and date math — and the need to pre-build screens.
- **UX.** Shared assistant panel → a one-line restatement of what it searched, the literal FHIR query as a copyable code chip, and results as a compact table + sparkline. Every row links to its raw Observation. "No results found" stated plainly; a "did you mean" affordance corrects ambiguous code mappings.
- **FHIR.** Observation, MedicationRequest, Condition, Encounter, Allergy, Procedure, Immunization, DiagnosticReport, Patient (read). No writes.
- **LLM vs deterministic.** LLM does intent→plan translation only. Deterministic owns: forced patient-id injection from SMART context, per-resource param allowlist, terminology resolution/verification, date computation, and the actual fetch through the scoped FHIR client. Raw result table is always shown as ground truth.
- **Client/server.** Hybrid. The data fetch stays in the browser on the patient token; only plan/resolve/validate hits `/api/chat`, so the model only ever sees the question text.
- **Removability.** Purely additive, read-only. Delete the chat capability, its route, and its allowlist config. Leaves only the shared terminology resolver, which other features may reuse.
- **Key risk + guardrail.** Wrong code mapping → deterministic resolver verifies the code and the UI shows the resolved label for confirmation; ambiguous matches trigger "did you mean," never a silent guess.
- **Phase.** 1 (lowest-risk, highest-demo-value; generalizes the hardcoded search already in `index.html`).

### F5 — Order / prescription drafting (draft-only, human-confirmed)
- **What / value.** Turns natural-language order intent ("start her on lisinopril 10 mg daily") into a structured, fully-coded **draft** MedicationRequest the clinician reviews, edits, and signs. Faster, lower-friction ordering with fewer transcription errors. **The human stays in control; it drafts only.**
- **UX.** A distinct, non-conversational "Order draft" review card (never a chat message): coded drug chip, editable dose/route/frequency, indication linked to a real Condition, inline allergy and interaction safety banners with cited sources. "Drafted by AI; not yet signed." Action row: Edit / Sign / Discard, with Sign deliberately *not* the default focus. On confirm, the server writes and the card flips to read-only with the returned resource id.
- **FHIR.** **MedicationRequest (write: draft → active on sign)** — the only write resource. Reads: Patient, Allergy, Condition, MedicationRequest, Observation, Encounter, Practitioner/PractitionerRole.
- **LLM vs deterministic.** LLM parses intent into a candidate proposal and explains it back — proposes only. Deterministic: RxNorm resolution (refuses guessed codes), UCUM/dose-range validation, allergy/interaction/duplicate checks against real data, FHIR assembly with `status=draft` hard-set, the human-confirm gate, and write+audit only after explicit sign.
- **Client/server.** **Needs-server.** Write-back is privileged; the confirm gate, `*.write` brokering, validation authority, and audit must be trusted server code.
- **Removability.** Unusually clean — the *only* feature needing write scope. Delete its route and review card, drop `patient/MedicationRequest.write` from the scope request, and the whole app falls back to today's safer read-only posture. No read-only feature shares its write path.
- **Key risk + guardrail.** Auto-submission / accidental signing → `status` hard-set to draft, mandatory explicit confirm gate, Sign not default-focused, clear "AI-drafted, not signed" provenance.
- **Phase.** 1 can demo the full NL→draft→sign→write loop on the sandbox to prove the pattern; real-PHI write-back is **Phase 3** (BAA, production write-scope governance, audit, clinical sign-off).

### F6 — Documentation / note assistant
- **What / value.** Pulls the encounter, meds, problems, and recent results to draft a structured progress note and answer "what should I document for this visit?" Turns "pajama-time" charting into editing instead of typing from scratch, and flags documentation gaps.
- **UX.** Tab in the shared drawer. "Draft progress note" → a SOAP/H&P draft (Subjective/Objective/Assessment/Plan), each line carrying a citation chip that expands to the source resource. A second mode returns a "what to document" checklist. "AI draft — review and edit before signing. Not entered in the chart." Copy-to-note now; "Save as draft note" greyed out until write scope.
- **FHIR.** Encounter, Condition, MedicationRequest, Observation, Allergy, Patient (read); DocumentReference + Provenance (write, Phase 2 only, `status=preliminary`, never AI-signed).
- **LLM vs deterministic.** LLM composes prose only. Deterministic: the queries and date-windowing, the citation map, post-generation verbatim validation of drug/dose/values, and a write-back path that only fires on an explicit human click at `status=preliminary`.
- **Client/server.** Hybrid, effectively server. Client pulls resources and shows an editable surface; `/api/note-draft` generates; Phase 2 `/api/note-write` brokers the write.
- **Removability.** Delete its tab, its `/api/note-draft` (and Phase 2 `/api/note-write`) route, and its prompt/validator. The optional write scope is requested incrementally and simply dropped from the OAuth set.
- **Key risk + guardrail.** Silent omission of a critical item → deterministic "sources considered" list + gap checklist so the clinician sees what was and wasn't pulled, rather than trusting prose completeness.
- **Phase.** 1 (draft-only/copy); DocumentReference write-back → 2.

### F7 — Guideline & coding lookup
- **What / value.** Answers guideline/monitoring questions and suggests validated ICD-10/SNOMED codes, grounded in the patient's active problems and meds, always cited. Reduces tab-outs to UpToDate/Google and coding ambiguity at the point of ordering or encounter close.
- **UX.** Shared drawer, plus a "Suggest codes" affordance on the problem list. Monitoring answers render as bullets, each tagged with a source chip ("ADA Standards of Care 2025", "RxNorm: metformin 860975"). Coding answers render as selectable rows (ICD-10 + SNOMED equivalent) with a confidence note and the source Condition. Unsourced model text is de-emphasized and labeled "model summary, unverified." No auto-write.
- **FHIR.** Condition, MedicationRequest, Patient (read); Observation/Encounter/Allergy optional. Optional human-confirmed Condition.code write-back only in Phase 3.
- **LLM vs deterministic.** LLM does NL understanding, RAG-snippet ranking, phrasing, and intent→terminology-search-query mapping. Codes come only from a real terminology service (`$lookup`/`$validate-code`); the LLM can never invent or alter a code. Citations must resolve to actually-retrieved guideline documents; unsourced claims are suppressed.
- **Client/server.** **Needs-server.** Guideline RAG and terminology APIs need server keys and are CORS-restricted; code validation must run where the browser can't bypass it.
- **Removability.** Drop its tool from the registry and delete its `/api/guideline-lookup` route plus RAG/terminology deps. Writes nothing; no feature consumes its output.
- **Key risk + guardrail.** Hallucinated/wrong code → codes only from validated terminology; LLM cannot emit raw codes; show the source Condition + confidence; no auto-apply.
- **Phase.** 1 (full feature on sandbox best showcases grounded + cited + deterministically-validated codes); PHI gates and optional Condition.code write-back → 3.

### F8 — Proactive alerts
- **What / value.** On chart load, the assistant silently scans the patient and surfaces unprompted, ranked safety flags (e.g. "active NSAID with stage 3 CKD") before the clinician asks. Catches the *unasked* question that a reactive chatbot (F1–F7) by definition cannot.
- **UX.** A dismissible "Safety alerts" strip pinned above the chat panel, rendered first after load. A "Scanning chart…" shimmer, then 0–N severity-ranked cards (red/amber/gray) with a one-line headline, a "why" expander citing the triggering resources, and per-alert Dismiss / "Ask the assistant about this." When nothing fires, it collapses to an explicit "No safety flags detected." "Decision support — verify before acting" footer.
- **FHIR.** MedicationRequest, MedicationStatement, Condition, Observation, Allergy, Patient, Encounter (read); Flag, DetectedIssue (write, Phase 2); Provenance/AuditEvent (write, Phase 2/3).
- **LLM vs deterministic.** A deterministic rule engine owns detection: normalize to RxNorm/RxClass/SNOMED/LOINC, evaluate a versioned rule pack, emit candidate alerts with severity + triggering refs + rule id. LLM is strictly presentational (headline, rationale, clustering, "ask about this" draft) and may only reference resources the engine already cited. **Fire/no-fire and severity are always code.** If the LLM is unavailable, raw alerts still render with template wording.
- **Client/server.** Hybrid. Client runs a few cheap deterministic local rules for instant flags; `/api/chat` (fired on load) runs the broader reasoning; `/api/tools` for keyed lookups.
- **Removability.** Delete the strip component, the `/api/alerts` route, and the rule pack; drop the mount point from the chart layout. F1–F7 never call into F8, so they're untouched. Can be added later by mounting the strip and registering the route — no contract changes.
- **Key risk + guardrail.** Missing data read as "safe" (no eGFR → renal rule silently doesn't fire) → distinguish "rule could not evaluate (data missing)" from "evaluated, no issue"; surface "unable to assess renal dosing — no recent eGFR" as an informational flag rather than silence.
- **Phase.** 1 (read-only deterministic-rule + LLM-phrasing strip); Flag/DetectedIssue write + dismissal persistence → 2; PHI/BAA/audit → 3.

---

## 5. Client-Side vs. Server (Next.js)

**The question: what can be done client-side?** The asymmetry that keeps the rebuild cheap: **FHIR reads can stay in the browser; LLM calls cannot.**

- **FHIR reads → client-side.** The SMART launch already mints a patient-scoped `patient/*.read` token, scoped by the EHR to exactly one patient. Reading that chart into the clinician's own browser — where they're already authorized to see it — is not a new disclosure. This covers all data-gathering, citation resolution, FHIR-query execution, and cheap deterministic rules (duplicate drug class, med-without-problem, simple thresholds).
- **LLM calls → server-only.** A provider's secret key cannot live in browser JS without leaking; HIPAA de-identification must run in a trusted context; write-back and audit must enforce the draft→confirm flow server-side. The risk boundary is **not** "PHI in the browser" — it is **"PHI sent to a third-party model."**

### Per-feature verdict

| Feature | Verdict | Why server is touched | Stays client-side |
|---|---|---|---|
| **F1** | Hybrid | LLM key; de-ID; audit | fetch, candidate grounding, citation resolution, render |
| **F2** | Hybrid | keyed DDI/terminology; LLM narrative; de-ID | reads + cheap local checks (same-class, med-without-problem) |
| **F3** | Hybrid (eff. server) | LLM generation; de-ID; audit | bundle gather, render, SBAR/plain toggle |
| **F4** | Hybrid | LLM intent→params; allowlist validation | **executes the FHIR search itself** on the patient token; renders trend |
| **F5** | **Needs-server** | LLM draft; `*.write` broker; confirm gate; audit | capture instruction, render draft, require explicit confirm |
| **F6** | Hybrid (eff. server) | LLM draft; de-ID; write-back + audit | pull resources, editable note surface |
| **F7** | **Needs-server** | keyed guideline RAG + terminology; LLM; de-ID | read problem list, render + confirm code picks |
| **F8** | Hybrid | LLM reasoning; de-ID; keyed lookups; audit | on-load fetch + cheap deterministic local rules; render tray |

### The minimal set of API routes
| Route | Responsibility | Serves |
|---|---|---|
| **`/api/chat`** | the single LLM gateway (Vercel AI SDK `streamText`, default `claude-opus-4-8`, streaming, provider-swappable) — holds the secret key, de-identifies/minimizes, assembles prompts | F1, F2 (narrative), F3, F4 (translation), F5 (draft), F6, F7, F8. *The one route the AI layer cannot live without.* |
| **`/api/audit`** | append-only, tamper-evident log of every AI interaction | F5 mandatory; all features once PHI is in play |
| **`/api/terminology`** | proxy for keyed/CORS-restricted external knowledge (RxNorm, DDI, renal-dose, SNOMED/ICD-10, value sets, guideline content) | F2, F7, F8 |
| **`/api/fhir-write`** | guarded write broker holding `*.write`, enforcing draft → explicit-human-confirm → submit + audit | F5; reused by F6 if notes write back |
| **`/api/fhir-proxy`** *(optional)* | only if policy forces hiding the SMART token or centralizing read audit — **not required**; reads stay client-side | — |

### The blunt verdict
**No — the app cannot be fully client-side under realistic PHI assumptions.** Everything that is "fetch FHIR and render" already is, and should stay, client-side. But the AI itself is fundamentally server-backed for three non-negotiable reasons: (1) every feature ultimately calls an LLM whose secret key cannot live in the browser; (2) HIPAA de-identification of the chart before it reaches any LLM must happen server-side; (3) write-back and audit must be server-side and enforce the draft→confirm flow. So: **client-only for reads/render/lightweight rules; a minimal backend (`/api/chat` + `/api/audit`, adding `/api/terminology` and `/api/fhir-write` as F2/F7 and F5 switch on) for the assistant.** Each feature plugs into that shared route set, so removing a feature just stops calling its slice of `/api/chat` without disturbing the rest.

---

## 6. UX & Interaction Model

### Panel placement: a docked co-pilot rail
A **persistent, collapsible right-side dock** — not a modal, not purely inline. The chart stays visible (a modal would cover the very med list the clinician is reasoning about), context persists across views, and the dock is non-blocking. Lightweight inline affordances (a small "ask" icon on a med row or lab value) act as *launchers* that pre-fill the dock with that resource in scope; the dock is the *workspace*. Default state is a thin rail with an alert badge; expanded it is ~360–420px with a header (patient chip + scope lock), conversation, suggested-prompt chips, and composer. On narrow EHR embeds it becomes a bottom sheet — never a full-screen modal.

### Citations: every clinical claim is traceable
Each factual statement carries an inline **source chip** (e.g. `[MedicationRequest · lisinopril · 2026-04-02]`); hover reveals detail, click deep-links to the resource. Chips form a per-response "Sources" footer. **No citation → no assertion.** A persistent scope indicator ("Answers limited to *Jane Doe (DOB 1958-03-11)* 🔒") both enforces and teaches the single-patient boundary; out-of-scope questions are declined within scope.

### Rich tool-result cards
The LLM calls a capability; the tool returns structured data; the UI renders it as a **typed card** — not free text the model styled. This keeps safety-critical surfaces (doses, orders) out of the model's prose. Chat is for reasoning and "why"; cards are for anything with a schema or an action (reconciliation table, trend chart, draft order card, draft note, reference card, alert banner). **Anything actionable or numeric → a card**, reviewable field-by-field, so the model can't typo a dose into prose. Cards carry their own provenance, and external knowledge (F7) is visually distinguished from this patient's chart.

### Human-in-the-loop
Drafts and actions (F5, F6) are always **Confirm / Edit / Reject**. The assistant drafts only; every draft shows a "DRAFT — not signed / not ordered" badge. **Confirm hands off to the EHR's real order/sign flow** — the assistant never writes or signs directly. Edit is first-class and inline; Reject is one frictionless click. Irreversibility scales friction: read-only answers are frictionless; drafts require explicit confirm. Proactive alerts (F8) never interrupt with a modal — a rail badge plus a dismissible, snooze-able, severity-ranked inline banner with a "show why" expander.

### Discoverability: prompts driven by registered capabilities
Each registered capability contributes 1–2 example prompts and a "What can I do?" entry; the dock renders chips from *whatever capabilities are currently registered* — add F7 and "Look up the guideline for…" appears automatically; remove F2 and its chips silently drop. **No hardcoded prompt list to maintain.** Chips are context-aware (med list surfaces F2/F1; labs surface F4). The empty state is a grouped tour ("Ask · Summarize · Reconcile · Look up · Draft"). Asking for an unregistered capability yields a graceful "I can't do that yet" that points to what *is* available.

### Trust & safety UX
A standing, low-profile disclaimer ("AI assistant — verify before acting. Not a substitute for clinical judgment.") — shown always, never a blocking pop-up. "Verify before acting" is enforced by structure (drafts can't self-execute; claims are cited), not just text. "Not in this patient's chart" is a first-class answer. A data-phase banner ("Demo — synthetic patient data") later carries the PHI posture ("PHI — audited session") without redesign. Auditability is visible: "Drafted by AI · confirmed by you · 14:32."

### Sample transcript

> **Scope:** Answers limited to *Jane Doe (DOB 1958-03-11)* 🔒
>
> **Clinician:** Why is she on lisinopril?
>
> **Assistant:** Lisinopril 10 mg daily is active, started 2026-04-02. It maps to her recorded **Hypertension** problem.
> `[MedicationRequest · lisinopril · active]` `[Condition · Essential hypertension]`
> *Sources (2) ▸*
>
> **Clinician:** Reconcile her meds.
>
> **Assistant:** Here's the reconciliation. I found **1 duplicate** and **1 gap**:
>
> *[Reconciliation table card]*
>
> | Medication | Status | Flag |
> |---|---|---|
> | Lisinopril 10 mg | Active | — |
> | Metformin 500 mg | Active | ⚠️ No diabetes diagnosis on chart *(inferred gap)* |
> | Amlodipine 5 mg | Active | ⚠️ Possible duplicate antihypertensive |
>
> Metformin is active but I don't see a diabetes Condition recorded — worth confirming. *Verify before acting.*
> *Sources (3) ▸*
>
> **Clinician:** Show her potassium over the last year.
>
> **Assistant:** Here are 4 potassium results. The latest (2026-06-10) is **5.3 mmol/L**, slightly above range.
> *[Trend chart card: K+ over 12 months, 5.3 point flagged]*
> *Translated to: `Observation?code=2823-3&date=ge2025-06` · 4 results*
>
> **Clinician:** Draft a repeat BMP for next week.
>
> **Assistant:** Drafted — please review and sign in the order screen.
>
> *[Draft order card]* **DRAFT — not signed**
> Basic Metabolic Panel · routine · collect 2026-06-26 · Reason: recheck elevated potassium (5.3)
> **[Confirm & open order]** **[Edit]** **[Reject]**
>
> I can't place orders — confirming opens this in your normal ordering flow. *Verify before acting.*

---

## 7. Security, Privacy & Compliance

### The PHI threat in today's client-only app
The portal today runs `fhirclient.js` entirely in the browser. That is fine for *reading* FHIR but structurally incompatible with calling an LLM:
- **Any LLM key shipped to the browser is a leaked key** — anyone with DevTools reads it, bills you, and exfiltrates data through your account.
- **A browser→LLM call puts PHI on an uncontrolled wire** with no chokepoint to redact, minimize, log, or enforce a BAA boundary.
- **No audit, no minimization, no policy** — all of which require a trusted execution context the browser is not.

### Why LLM calls move server-side
**Decision: every LLM call goes through a Next.js Route Handler. No exceptions, in any phase.** The browser never holds a model key and never opens a socket to the model vendor. `/api/chat` is the *only* egress point to the LLM, which makes it the natural home for redaction, prompt assembly, guardrails, and the audit trail.

**Why FHIR reads can legitimately stay client-side.** The SMART token is scoped by the EHR's authorization server to exactly one patient; the browser cannot use it to read anyone else. Reading PHI into the clinician's own browser, where they're already authorized, is not a new disclosure. The clean split: **FHIR reads → client-side (patient-scoped token, no shared secret); LLM calls → server-side only (provider secret, third-party egress).** The browser sends only the minimum-necessary slice to the route; the route does not need to re-fetch FHIR in Phase 1 — but the seam is built so it *can* later via a server-side, BAA-covered FHIR client.

### De-identification & minimization
**Principle: minimum necessary.** Runs in the API route as a dedicated module — the *last thing* to touch the payload before egress — in every phase (permissive on synthetic, strict on PHI) so the path is never new.
- **Strip direct identifiers** (name, MRN, SSN, full DOB → keep age/age-band, address, phone/email, account/device ids) — the model needs *clinical* facts, not *who*.
- **Reference-by-id, not by-value.** Send the model a stable reference (`MedicationRequest/123`); the UI resolves it for display. This also powers citations for free.
- **Server-side free-text scrub** as a backstop over notes/`text.div`/comments where stray identifiers hide.
- **Field allow-listing over block-listing** — each feature declares the fields it needs; a new field is excluded by default (fail-safe).

### Clinical safety guardrails (cross-feature, in shared infra)
- **Grounding-only** — assert clinical content only from supplied context; reject/flag unsupported facts.
- **Citations required** — clinical claims with no citation are a guardrail failure.
- **Draft-and-confirm for any action** — nothing state-changing is autonomous; F5 write-back is a separate, audited, write-scoped call.
- **"Not a medical device / clinician verifies" disclaimer** — persistent and visible.
- **Prompt-injection defense** — chart content is untrusted *data*, clearly delimited, never able to alter system policy or tool authorization.
- **Refusal & uncertainty** — abstain rather than guess; surface uncertainty rather than hide it. A confident wrong answer is the worst outcome.

### SMART scopes / least-privilege
Authentication is unchanged — the assistant rides on the SMART identity, never invents its own user model.
- **Current state vs. target.** Today's `launch.html` requests a **blanket `patient/*.read`** (`scope: "launch openid fhirUser patient/*.read"`). The target is **narrowed per-feature read scopes** (`patient/MedicationRequest.read`, `patient/Condition.read`, …) assembled from the registered capabilities' declared scopes. Replacing the blanket scope with the narrowed set is a **Phase-1 Done-when item** (see §8), not yet the shipped reality.
- **Write-back (F5) requires an explicit write scope** requested *only when F5 is enabled*. No write scope → the write path is hard-disabled, not merely hidden.
- **Scopes drive the registry (the modularity contract):** capability = (feature toggled on) ∧ (scopes granted). The server-side route re-checks scope and identity before any write — the client is never trusted for authorization on state-changing calls. **Scopes are simultaneously the security boundary and the modularity boundary**, so authorization and pluggability are the same mechanism.

### Single-patient invariant (newly enforced)
Today's `meds.html` does **not** honor a single-patient scope: it requests a cross-patient batch (`MedicationRequest?_count=60`), groups results by subject, ranks patients by med count, and renders the top-ranked patient — an arbitrary one, not "the" patient. That **cross-patient scan pattern is dropped** in the rebuild. The **Patient Context** module now establishes and enforces "exactly one patient in context," and the Grounding layer rejects any fact outside that patient — so no feature, fixture, or query can fan out across patients. The one-patient invariant becomes a structural guarantee, not a convention.

---

## 8. Phased Roadmap

**Governing principle:** the data source is a config flip, not a rewrite. The chokepoint, redaction seam, and audit seam exist from day one — exercised against synthetic data so turning on PHI is configuration.

### Phase 1 — Synthetic MVP
**Scope.** Ship read-only, advisory features against sandbox/synthetic FHIR. No real patients → no BAA and no de-identification legally required, but the plumbing for both is built and run against fake data. Prove the UX of grounding, citations, and draft-and-confirm.
**Done when:**
- The **EHR shell** (patient banner · chart sidebar · medication list · docked assistant) is the launch surface; a real **SMART App Launch** lands the in-context patient in the shell, so the demo shows the embedded-in-the-chart experience, not a bare app.
- **F1 (Ask about this patient)** runs live end-to-end on synthetic data — grounded, cited, and streamed through the gateway.
- All LLM calls flow through `/api/chat` (Vercel AI SDK `streamText`); **zero** provider keys/SDKs in client bundles (verify by inspecting built JS).
- A `DataMode` flag (`synthetic` | `phi`) gates behavior centrally; Phase 1 runs `synthetic`.
- **Blanket `patient/*.read` is replaced by narrowed per-feature read scopes** assembled from the registered capabilities — `launch.html`'s `patient/*.read` no longer ships; the requested scope set is the union of declared per-capability scopes.
- **The single-patient invariant is enforced via Patient Context** — the `meds.html` cross-patient scan is removed; every fetcher and the grounding layer operate on exactly one in-context patient.
- The redaction/minimization module is on the call path (permissive for synthetic).
- An audit writer is called on every LLM request (who, feature, patient ref, timestamp — not the PHI payload).
- Every feature is independently toggleable; removing one doesn't break the others.
- Guardrails live: citations rendered, disclaimer shown, no write-back.
- A documented short "PHI readiness checklist" enumerates exactly what flips for Phase 3.

### Phase 2 — Hardening
**Scope.** Still synthetic (or a controlled internal de-identified set), but the system now behaves as if PHI were flowing. Turn stubs into real implementations; about *trust and reversibility*, not new data.
**Done when:**
- Audit log is durable, append-only/tamper-evident, and queryable.
- Guardrails are *enforced* server-side (not just prompted): uncited responses blocked/flagged; injection-resistant prompt assembly in place.
- **F5 write-back** exists but only ever produces a draft requiring an explicit, audited, write-scoped human confirm.
- Human-in-the-loop is default for any state-changing output.
- Rate limiting, abuse controls, and "I don't know" handling are wired into the route.
- A redaction test proves the module strips the defined identifier set from realistic records.

### Phase 3 — Real PHI / HIPAA
**Scope.** Flip `DataMode` to `phi`. A governance/contracts milestone more than a code one — the seams already exist.
**Done when:**
- **Signed BAA** with the model provider covering the exact endpoint/region; provider configured to not train on / not retain inputs (zero-data-retention where offered).
- De-identification runs in **strict mode** server-side before every LLM call.
- Access controls map authorized clinicians from SMART scopes; least-privilege per feature.
- Audit retention meets policy; audit-log access is itself restricted and logged.
- Data residency confirmed — LLM calls pinned to an approved region; no cross-border PHI egress.
- Documented incident/breach path and a global kill switch.
- Pen-test / security review of the route and redaction boundary passed.

### Phase × feature

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| F1 Ask about patient | ✅ full (read) | optional Q&A audit write | PHI hardening |
| F2 Med reconciliation | ✅ duplicate/missing-indication + curated interactions | full licensed DB, renal-dose, review-log write | PHI hardening |
| F3 Plain-language summary | ✅ draft-only | DocumentReference write-back | PHI hardening |
| F4 NL FHIR query | ✅ full (read) | + production terminology service | PHI hardening |
| F5 Order/Rx drafting | demo loop on sandbox | enforced confirm gate + audit | ✅ **real-PHI write** |
| F6 Note assistant | ✅ draft/copy | DocumentReference + Provenance write | PHI hardening |
| F7 Guideline & coding | ✅ full on sandbox | — | + Condition.code write-back, PHI gates |
| F8 Proactive alerts | ✅ read-only strip | Flag/DetectedIssue write + dismissal persistence | PHI/BAA/audit hardening |

---

## 9. Open Questions / Decisions to Make

- **Grounding transport.** Confirm client-side grounding POSTed to `/api/chat` (keeps the FHIR token in the browser — simplest now) vs. a server-side FHIR service account (needed once PHI + BAA arrive). The architecture supports both; the choice sets where Data Access's "server twin" lives.
- **Boundary rule.** Confirm and enforce "only the capabilities barrel may import a capability" — the lint/boundary rule that mechanically guarantees clean removal.
- **F7 sources.** Confirm which external guideline/terminology sources are in scope for Phase 1 (the main reason for `/api/tools/*` server handlers) and their licensing (SNOMED/UMLS).
- **Interaction/terminology vendor.** Curated open subset for the demo vs. a licensed clinical DB — and which features (F2, F5, F8) share the adapter.
- **Audit sink.** Where the append-only log lands and its Phase 3 retention window.
- **Model selection.** Default Claude/Anthropic model per feature (latency vs. quality), via the provider-agnostic gateway.
- **F5 timing.** Whether to ship the F5 demo loop in Phase 1 (proves the pattern) or hold all write affordances until Phase 2.

---

## 10. Appendix: Removability Checklist

**The contract:** a feature owns a folder, one registry line, its own route segment(s), and any feature-local adapters/config. It depends *into* shared infra and is never imported by it. Removing it is deterministic.

### What you delete to drop a feature
| Artifact | Always | Notes |
|---|---|---|
| `capabilities/<feature>/` folder | ✅ | descriptor, tools, prompt/validator, UI components |
| `register(...)` line in the barrel | ✅ | the only wiring |
| Its route segment(s) | ✅ | e.g. `/api/summary`, `/api/note-draft`, `/api/alerts`, `/api/guideline-lookup` |
| Its UI mount point | ✅ | panel/tab/strip/button — removed from layout |
| Feature-local adapters | if sole consumer | RxNorm/interaction (F2/F5/F8), guideline RAG (F7) |
| Feature-local config | ✅ | e.g. F4's param allowlist + query-plan schema |
| SMART scope entry | if feature-specific | drop `*.write` with F5; drop DocumentReference write with F6 |

### What is guaranteed not to break
- **The chat UI** — it renders whatever `getChatTools` returns; the removed tool simply isn't in the set.
- **The side panel and proactive band** — registry projections; a removed contributor disappears.
- **Shared infra** (Data Access, Patient Context, LLM gateway, grounding, orchestration, audit) — names no feature; operates on generic shapes. The boundary rule makes a reach-back a build failure.
- **Every other feature** — none read a removed feature's output; F1–F7 never call into F8; no read-only feature shares F5's write path.
- **The SMART scope set** — narrows automatically; no other feature loses access.
- **The med list, SMART launch, and synthetic/PHI data seam** — untouched.

**Adding a feature is the mirror image:** drop a folder, add one `register` line, declare scopes/resources/tools, edit no shared file.
