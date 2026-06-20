# Phase 1 — Implementation TODO

Derived from [`ai-clinical-assistant-design.md`](./ai-clinical-assistant-design.md). This is the
gap between what's already built and what the design doc requires for Phase 1.

**Already built (Phase 1 surface):** the EHR shell (patient banner · chart sidebar · medication
list · docked assistant), the SMART App Launch handshake, F1–F8 card builders, grounding +
citations, and the single `/api/chat` gateway (Vercel AI SDK, default `claude-opus-4-8`).

The items below are what's **missing or incomplete** vs. the design — primarily the capability
registry (§3) and the Phase 1 "Done when" checklist (§8).

---

## A. Core architecture — the capability registry (§3)

The design's central thesis. Today tools are hardcoded flat in `lib/tools.ts` and the system
prompt in `app/api/chat/route.ts` hardwires all seven tool names — so no feature is removable
"by deleting a folder + one line" yet.

- [ ] Define the `descriptor` shape: `id`, `name`, `description`, `category`, required FHIR
      scopes, required resource types, tools, surface (`chat`/`panel`/`proactive`), execution
      side (`client`/`server`), lifecycle hooks (`onChartLoad`, `getPanelActions`,
      `getSystemPromptFragment`).
- [ ] Refactor F1–F8 into `capabilities/<feature>/` folders — each exports one descriptor plus
      its tool(s)/card builder/prompt fragment. Move the relevant slices out of `lib/tools.ts`.
- [ ] Add the `capabilities/index` barrel with one `register(descriptor)` call per feature.
- [ ] Make the UI + LLM projections of the registry: `getChatTools(context)`,
      `getSystemPromptFragments`, `getPanelActions`, `getProactiveScanners`. Replace the
      hardcoded `buildAssistantTools` and the static `SYSTEM_PROMPT` tool list.
- [ ] Enforce the boundary rule (§3, §9): a lint/import rule so **only the barrel may import a
      capability** — the compile-time guarantee of clean removal.

## B. Phase 1 "Done when" gaps (§8)

- [ ] **Narrow SMART scopes.** `lib/smart.ts` still ships blanket `patient/*.read`. Replace with
      the union of per-capability declared read scopes assembled from the registry (depends on A).
- [ ] **Central `DataMode` flag (`synthetic` | `phi`).** Today `app/page.tsx` only distinguishes
      demo-vs-live-launch; there is no `synthetic`/`phi` config gate. Add one central switch the
      data source and redaction strictness read from.
- [ ] **De-identification / minimization module**, called in `/api/chat` as the *last thing
      before egress* (§7). Only a comment seam exists in `lib/grounding.ts`; the route currently
      POSTs the full `patientContext` straight to the model. Permissive for synthetic, strict for
      PHI.
- [ ] **Audit writer** (`/api/audit`, append-only): log who / feature / patient ref / timestamp —
      not the payload — on every LLM request. No audit exists today.
- [ ] **Switch `/api/chat` to streaming** (`streamText`, per §3c / §5). The route uses
      non-streaming `generateText`. Update the route and the Console consumer.
- [ ] **Verify zero provider keys/SDKs in the client bundle** (inspect built JS).
- [ ] **Write the "PHI readiness checklist" doc** (§8) enumerating exactly what flips for Phase 3.

## C. Verify / likely already satisfied (confirm, don't rebuild)

- [ ] **Single-patient invariant** — `loadChart`/grounding already operate on one in-context
      patient and the `meds.html` cross-patient scan was never ported. Confirm Patient Context
      enforces "exactly one patient" structurally, not by convention.
- [ ] **Guardrails** — citations rendered, disclaimer shown, no write-back appear done; confirm
      against §8.

## D. Optional / later-phase seams (note now, not Phase-1-blocking)

- [ ] **F5 demo write loop** — `draft_order` only builds a card today; the
      sign → `/api/fhir-write` → submit loop is an open question (§9 "F5 timing"). Decide
      ship-in-P1 vs. hold to P2.
- [ ] **`/api/terminology` route** (§5) — curated local interactions/codes are fine for P1; the
      keyed-lookup route is a P2 seam.

---

## Open decisions to make first (§9)

1. Whether to ship the F5 write loop in Phase 1 (proves the pattern) or hold to Phase 2.
2. Confirm the boundary-rule enforcement mechanism (lint vs. build-time import check).

**Suggested order:** A (registry) first — B's scope narrowing and per-feature toggling depend on
it. The standalone items (DataMode flag, audit writer, de-id module, streaming) can proceed in
parallel.
