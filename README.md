# VERA — AI Clinical Assistant (SMART-on-FHIR)

A clinical-console demo: a mock EHR shell (patient banner, chart sidebar, medication
list) with an **embedded, grounded AI assistant** docked beside the chart. Built with
**Next.js 16 (App Router)**, React 19, Tailwind v4, **SMART-on-FHIR** (`fhirclient`), and
the **Vercel AI SDK** (provider-agnostic, default-backed by Claude).

> **Demo · synthetic data · no PHI.** See [docs/ai-clinical-assistant-design.md](docs/ai-clinical-assistant-design.md)
> for the full architecture and the synthetic → PHI phasing plan.

## Getting started

```bash
npm install
cp .env.example .env.local   # then paste your ANTHROPIC_API_KEY
npm run dev                  # http://localhost:3000
```

Without a SMART session the app renders the **synthetic "Jane Doe" demo chart**, so it
works standalone (and on Vercel) out of the box.

### Launch inside the SMART sandbox

1. `npm run dev`
2. Open the SMART App Launcher: <https://launch.smarthealthit.org>
3. Set the **App Launch URL** to `http://localhost:3000/launch`, pick a patient, and launch.
4. The app authorizes (`/launch` → `FHIR.oauth2.authorize`), lands on `/`
   (`FHIR.oauth2.ready`), and the patient banner + medication list bind to the live
   in-context patient. The assistant answers grounded in that chart.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build (the Vercel build) |
| `npm test` | Vitest + React Testing Library suite |
| `npm run test:watch` | Tests in watch mode |
| `npm run typecheck` | `next typegen` + `tsc --noEmit` |

## Architecture

- **EHR shell** — `app/components/` (`DemoBanner`, `AppBar`, `PatientBanner`,
  `ChartSidebar`, `MedicationList`) composed by `Console.tsx`.
- **Assistant dock** — `app/components/assistant/` (`AssistantDock`, `AtAGlance`,
  `SafetyScan` (F8), `Conversation`, `Composer`).
- **Tool-result cards** — `app/components/assistant/cards/` render typed payloads
  (not model prose) so doses/orders can't be typo'd into free text: `ReconcileCard`
  (F2), `TrendCard` (F4), `DraftOrderCard` (F5, draft→confirm→reject), `GuidelineCard`
  (F7, ICD-10/SNOMED picker + external-knowledge chips), `SummaryCard` (F3, SBAR/patient
  tabs), `NoteCard` (F6, SOAP/to-document tabs). Dispatched by `CardRenderer` from each
  assistant message's `card` payload.
- **FHIR layer** — `lib/fhir.ts` (pure view-model helpers, unit-tested), `lib/smart.ts`
  (client-only `fhirclient` calls), `lib/seed.ts` (synthetic demo chart).
- **AI gateway + tools** — `app/api/chat/route.ts` runs the AI SDK `generateText`
  server-side with a set of `tool()`s (`lib/tools.ts`); the model *chooses* a capability
  and narrates, while each tool's `execute` builds the typed card **deterministically**
  from the grounded context (so a dose/code can't be a hallucination). The
  `ANTHROPIC_API_KEY` never reaches the browser. Default model `claude-opus-4-8`; switch
  providers (OpenAI / Google) in one line. `lib/grounding.ts` builds the single-patient
  context (patient · meds · problems · labs); `lib/chat-client.ts` (`sendChat`) returns
  the `{ text, card }` turn into the dock. **No key?** the same builders run via a
  keyword router (`routeToCard`), so card actions work without a model.

**Status:** the EHR shell, SMART launch, safety scan (F8), **F1 (grounded chat)**, and the
**F2–F7 tool-result cards** are all wired end-to-end. The model calls the matching tool
(reconcile, trend, draft-order, guideline+coding, SBAR/patient summary, SOAP note) and the
deterministic builder returns the typed card grounded in the in-context patient — verified
live against the Anthropic API and, keyless, via the deterministic router.

## Deploy to Vercel

1. Push to GitHub and import the repo in Vercel (Next.js is auto-detected).
2. Add **`ANTHROPIC_API_KEY`** under Project → Settings → Environment Variables.
3. Deploy. To launch it inside the SMART sandbox against the deployed URL, set the
   launcher's App Launch URL to `https://<your-app>.vercel.app/launch`.
