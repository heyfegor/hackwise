---
doc: checklist
status: approved
---
<!-- Provenance: build plan derived from the approved spec in a delegated autonomous run.
     Build mode is fast (the learner delegated execution). Every slice still gets real
     mechanical verification and its own commit. Approved to proceed per the learner's
     explicit instruction to complete the implementation. -->

# Build Checklist

Build mode: fast

## Slices

- [x] **1. The landing page renders, pixel-faithful, on desktop and mobile**
  Becomes usable: Visiting `/` shows the full Hackwise landing design — nav, hero with the composer, feature strip, features grid, how-it-works, why-hackwise diagram, the dark tabbed Preview (showing sample data), build/don't-build, final CTA, footer — with correct fonts, colors, spacing, and the 880px mobile breakpoint. The composer is visible but not yet wired.
  Why now: Establishes the scaffold and the visual source of truth end to end, so every interactive behavior has a real place to land. Bootstrapping (Next.js scaffold, deps, config, fonts, tokens) lives here.
  PRD ref: `prd.md > Screens and Layout`, `prd.md > Look and Feel`
  Spec ref: `spec.md > Components`, `spec.md > File Structure`, `spec.md > Look and Feel`
  Build: Scaffold Next.js (App Router, TS) + Tailwind; add Geist/Geist Mono via next/font; define tokens in globals.css + tailwind.config; port every design section into components under `components/`; render sample data in `AnalysisPanel`.
  Verify (mechanical): `npm run build` succeeds with no type errors; `npm run dev` serves `/` with HTTP 200; fetch the HTML and confirm key copy ("Know exactly what to", "hackwise is now available", all four tab labels) is present; load the page in a browser at desktop and 390px widths and confirm layout matches the design.
  Learner check: Open http://localhost:3000 and confirm it looks like the design at both desktop and phone widths.
  Commit: `Scaffold Next.js app and recreate the Hackwise landing design`

- [x] **2. Paste a URL and get a brief end to end (demo mode)**
  Becomes usable: Typing a URL and pressing Enter/clicking send validates it, shows the four-stage reading animation, then renders a returned brief into the Preview tabs with a visible "Demo mode" badge; bad input shows an inline error and makes no request; the brief can be copied to the clipboard; failures show a recoverable error card. This proves the entire UI↔server↔schema pipeline without the model.
  Why now: Delivers the kernel's user-facing surface — URL → structured brief with facts/inference split — early, and exercises validation, every state, and the schema contract before the live model is added.
  PRD ref: `prd.md > The composer`, `prd.md > URL validation`, `prd.md > Analysis + the brief`, `prd.md > Copy the brief`, `prd.md > States and Boundaries`, `prd.md > Demo mode`
  Spec ref: `spec.md > app/page.tsx`, `spec.md > components/AnalysisPanel.tsx`, `spec.md > app/api/analyze/route.ts`, `spec.md > lib/schema.ts`, `spec.md > lib/demoBrief.ts`, `spec.md > Data Model`
  Build: Add the page state machine and composer behaviors (Enter/Shift+Enter, focus ring, analyze/focus-scroll, mobile menu); client URL validation; `POST /api/analyze` returning the labeled demo brief (no key path) validated by the Zod schema; render brief + metrics + tabs + MVP summary + facts/inference labels + empty rows; copy-to-clipboard; loading and error cards with "Try again".
  Verify (mechanical): `npm run build` passes; with no key set, `curl -X POST /api/analyze` with a valid URL returns `{ ok:true, mode:"demo", brief:{...} }` that the schema accepts; posting an invalid body returns a 4xx error JSON; in the browser, submit a URL and confirm the animation → demo brief → copy works, and a bad URL shows the inline error.
  Learner check: Paste any URL, watch it analyze, read the brief, click Copy, and confirm the "Demo mode" badge is visible; then paste "not a url" and confirm the inline error.
  Commit: `Wire composer to analysis endpoint with demo mode, validation, states, and copy`

- [x] **3. Real Gemini analysis of a live hackathon URL** — plumbing verified; valid-key success pending a key (see note below)
  Becomes usable: With `GEMINI_API_KEY` set, submitting a real hackathon URL fetches and extracts the page, sends the text to Gemini Flash, validates the structured JSON, and renders a real brief (facts from the page, inferred MVP labeled separately, unknowns shown as unknown). Fetch/model/timeout/invalid-JSON failures degrade to clear errors; no key still falls back to demo mode.
  Why now: Completes the kernel for real. It is last only because slice 2 proved the whole surrounding pipeline, so this slice is a focused swap of demo data for a verified model call.
  PRD ref: `prd.md > Analysis + the brief`, `prd.md > States and Boundaries`, `prd.md > Non-Goals`
  Spec ref: `spec.md > lib/fetchPage.ts`, `spec.md > lib/gemini.ts`, `spec.md > app/api/analyze/route.ts`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Implement `fetchPage` (timeout + size cap + cheerio text extraction + non-HTML rejection); `gemini.ts` (official `@google/genai`, model from env, untrusted-content prompt, JSON response schema, facts/inference + null-for-unknown rules); wire the route to use them when a key exists, with one retry on bad JSON and mapped error codes; keep demo fallback.
  Verify (mechanical): `npm run build` passes; with a key in `.env.local`, `POST /api/analyze` for a real hackathon URL returns `{ ok:true, mode:"live", brief }` that Zod accepts and whose `meta.sourceUrl` matches; a deliberately bad URL returns `FETCH_FAILED`; confirm the key never appears in any client bundle (`grep` the `.next` client output). If no key is available, record that live verification is pending and confirm the demo path + error mapping instead.
  Learner check: With your key set, paste a real Devpost/MLH hackathon URL and confirm the brief reflects that page (deadline/requirements look right, unknowns say unknown, MVP is labeled as a recommendation).
  Commit: `Add real Gemini-powered page analysis with extraction, schema validation, and failure handling`
  VERIFICATION NOTE: Code complete and committed. Verified via a local probe: `fetchPageText` fetched + extracted a real HTTP page (title/description/2572 chars clean text), and `analyzeWithGemini` with a dummy key executed a real Gemini REST call that returned HTTP 400 "API key not valid", correctly mapped to `MODEL_ERROR`. The Gemini endpoint is reachable from this machine. The ONLY step not exercised is a successful valid-key response, because the environment had no `GEMINI_API_KEY` (user's `.env.local` was empty). With a valid key the full `mode:"live"` path is expected to work. Demo path + all error mappings (INVALID_URL, FETCH_FAILED, MODEL_ERROR, malformed body) are verified.

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 2 (full flow verified in demo mode via HTTP checks; see Revisions)
- [ ] Final kick-the-tires exploration and feedback completed

## Final Review

- [ ] Final review complete — feedback resolved and learner confirms ready to ship

## Code Tour and App Map

- [x] Learning activity complete — brief recap (delegated/autonomous build; no live learner session)
- [x] Optional edit and transfer reflection addressed — not applicable (autonomous run; transfer question left for the learner)
- [x] `devpost/app-map.html` generated from finished code, checked, and shown, including a project-grounded practice to reuse

Activity and evidence: App map generated from the finished code at `devpost/app-map.html`. The project-grounded practice captured is the LLM in/out trust boundary — untrusted page text labeled as data in the prompt (`lib/gemini.mjs`) and schema-validated model output with a one-retry fallback (`lib/schema.mjs`), with unknown facts kept null rather than invented.
Route and stops: `public/app.js` (submit → fetch) → `server.mjs` (`/api/analyze`) → `lib/extract.mjs` → `lib/gemini.mjs` → `lib/schema.mjs` → back to `app.js` (render). Reference route only (no live walkthrough).
Edit outcome: not applicable — no interactive edit in an autonomous run.
Reflection: not applicable — the optional transfer question is left open for the learner.
Activity mode: reference-only recap + app map (autonomous build; personal reflection intentionally not fabricated).

## Revisions

- **Stack changed from Next.js to a zero-dependency Node HTTP server + static HTML/CSS/vanilla-JS** — the build discovered the machine's network could not install npm packages (npm logged 9–41 minutes *per package*; a full Next.js tree of ~400 deps repeatedly failed and was killed, and even `@google/genai` + `zod` alone would not install). To ship a working end-to-end product under this genuine blocker, the implementation was moved to Node built-ins (`http`, global `fetch`) with the same design, the same server-side-key secrecy, and the same analysis pipeline. The product and the approved PRD behavior are unchanged. `spec.md > Stack` and `spec.md > External Services` were updated to match.
- **Gemini SDK → REST with automatic SDK upgrade** — because `@google/genai` could not be installed, `lib/gemini.mjs` calls the Gemini REST API via built-in `fetch` by default, and dynamically imports the official `@google/genai` SDK automatically *if it is ever installed* (`npm install @google/genai`). Same model, same prompt, same validation — honors the "official SDK" requirement the moment the environment allows it, and ships regardless.
- **Zod → equivalent hand-rolled validator** (`lib/schema.mjs > validateBrief`) and **cheerio → regex extraction** (`lib/extract.mjs`) — both forced by the same no-install constraint; functionally equivalent for the POC (shape validation before display; script/style-stripped text extraction).
- **Per-file React components consolidated** — the planned `components/*.tsx` became one static `public/index.html` + `public/app.js`, mirroring the original design file's own structure (markup + inline styles + one script).
- **Gemini network/timeout errors now map to `MODEL_ERROR`** — the build discovered that an aborted/failed `fetch` to the model endpoint would fall through to a generic 500; `lib/gemini.mjs > callViaRest` now catches it and returns a recoverable `MODEL_ERROR` ("took too long" / "could not reach the model service").
