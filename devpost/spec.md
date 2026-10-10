---
doc: spec
status: approved
---
<!-- Provenance: technical blueprint derived from prd.md + the learner's brief in a
     delegated autonomous run. Stack and model choices follow the learner's explicit
     instruction (Next.js + server-side Gemini). Approved to proceed. -->

# Hackwise — Technical Spec

## How This Works, In Plain Language
Hackwise is one web page with one small brain behind it.

The page is the landing design recreated faithfully. Its centerpiece is a text box (the "composer") where you paste a hackathon URL. When you submit, the page sends that URL to a **server-side endpoint** — code that runs on the server, not in your browser, so the secret Gemini API key is never exposed to visitors.

The endpoint does four things in order: (1) checks the URL is a real web address; (2) downloads that page and strips it down to readable text; (3) sends that text to Google's Gemini model with instructions to return a strict JSON "brief"; (4) checks the JSON matches the exact shape we expect before sending it back. The page then renders that brief into the dark tabbed panel from the design.

If there is no API key on the server, the endpoint returns a **clearly-labeled demo brief** instead, so the whole flow still works for a walkthrough — it just says "Demo mode" and never pretends to have read your page.

Why this shape: it's the smallest thing that proves the kernel — one page, one endpoint, one model call — with the secret kept server-side and the model's output validated before anyone sees it.

## The Core Journey Through the System
PRD ref: `prd.md > The Core Journey`.
1. User types/pastes a URL in `<Composer>` → React state `url`.
2. Enter or send button → client validates the URL shape. Invalid → inline error, stop.
3. Valid → `POST /api/analyze` with `{ url }`; UI enters `analyzing` (four-stage animation).
4. Server route (`app/api/analyze/route.ts`): re-validates URL → `lib/fetchPage.ts` downloads + extracts text (size-capped) → `lib/gemini.ts` sends text to Gemini with a JSON response schema → `lib/schema.ts` (Zod) validates → returns `{ ok: true, brief, mode: "live" }`.
5. No key configured → route returns `{ ok: true, brief: demoBrief, mode: "demo" }` without calling the model.
6. Any failure → `{ ok: false, error: { code, message } }` with an appropriate HTTP status.
7. Client renders `<AnalysisPanel>` (the Preview component) with the returned brief, or an error card with "Try again". Copy button serializes the brief to text.

## Stack
> **As-built note (see `checklist.md > Revisions`):** the originally-approved stack was Next.js + React + Tailwind + `@google/genai` + cheerio + zod. During the build, the machine's network made npm installs impossible (9–41 min per package; the full dependency tree repeatedly failed/was killed). To ship a working product under that genuine blocker, the stack was changed to **zero external dependencies** using Node built-ins. The product, design, and PRD behavior are unchanged.

- **Node.js ≥ 18 built-in `http` server** (`server.mjs`) — serves the static UI and the `/api/analyze` endpoint, keeping the Gemini key server-side. Zero framework. Docs: https://nodejs.org/api/http.html
- **Static HTML + CSS + vanilla JS** (`public/index.html`, `public/app.js`) — the full landing design ported 1:1 with inline CSS tokens and a small vanilla-JS state machine (mirrors the original design file's own structure). No build step.
- **Geist + Geist Mono** via Google Fonts `<link>` (as in the original design), with `system-ui` fallback.
- **Gemini via built-in `fetch`** to the REST API, with an automatic dynamic `import('@google/genai')` that uses the **official SDK if it is installed** (`npm install @google/genai`) — so the official-SDK requirement is honored the moment the network allows, with no code change. Model from env (`GEMINI_MODEL`, default `gemini-2.5-flash`), `responseMimeType: application/json`. Docs: https://ai.google.dev/gemini-api/docs · SDK: https://googleapis.github.io/js-genai/ · models: https://ai.google.dev/gemini-api/docs/models
- **HTML → text via regex** (`lib/extract.mjs`) instead of cheerio — script/style/tag-stripped, size-capped text. Tradeoff: JS-rendered pages extract less text (flagged as a low-confidence failure mode).
- **Hand-rolled schema validation** (`lib/schema.mjs > validateBrief`) instead of zod — validates the model's JSON shape and rejects malformed output before it is displayed.
- Rationale/tradeoff accepted: zero dependencies means nothing to install (immune to the network blocker) and a smaller attack surface; the cost is writing extraction/validation by hand, which is modest for this POC and fully covers its needs.

## Where It Runs and How Someone Tries It
- Runtime: Node.js 18+ (dev machine has Node 24). Browser for the UI.
- Environment: `GEMINI_API_KEY` (required for live analysis), `GEMINI_MODEL` (optional, default `gemini-2.5-flash`), `MAX_PAGE_CHARS` (optional, default 16000). Keys live in `.env.local` (gitignored); `.env.example` documents them.
- Start: `node server.mjs` (or `npm start`), open http://localhost:3000. No `npm install` is required (zero dependencies). `PORT` env overrides the port.
- Demo recording: the local app is sufficient for the required demo video. Deployment is optional (Vercel is the natural target: set the same env vars in the project settings) and never replaces the video or the public repo.

## Look and Feel
Carried from `prd.md > Look and Feel` and `scope.md > Inspiration & Identity` — do not re-interview.
- Palette, typography, radii, shadows, and the single 880px breakpoint exactly as in `prd.md > Look and Feel`. Tokens are defined once in `tailwind.config.ts` + `app/globals.css` `:root`, then referenced everywhere.
- Density/energy: calm, editorial, spacious; hairline borders; lime used sparingly as the single accent. Reduced-motion collapses animation to ~0ms. Dark Preview section is `#141414`.
- Stack constraint: all icons/logo/diagram are inline SVG (ported from the design); no icon library, no raster assets. Tailwind can honor every value here (arbitrary values cover the clamps).

## Components
### `app/layout.tsx`
Root layout: loads Geist + Geist Mono via `next/font`, sets `<body>` background, metadata. Talks to: `globals.css`.

### `app/page.tsx`
Client component holding the app state machine (`url`, `phase: idle|analyzing|brief|error`, `tab`, `focused`, `menuOpen`, `brief`, `error`, `mode`). Orchestrates the submit → fetch → render flow and smooth-scroll/focus behavior. PRD ref: `prd.md > The Core Journey`.

### `components/Nav.tsx`
Sticky nav + mobile overlay menu. PRD ref: `prd.md > Screens and Layout` (1).

### `components/Hero.tsx` + `components/Composer.tsx`
Hero copy, availability pill, platform row, and the composer (textarea + lime send, focus ring, Enter/Shift+Enter). Raises `onSubmit(url)`. PRD ref: `prd.md > The composer`, `prd.md > URL validation`.

### `components/FeatureStrip.tsx`, `components/FeaturesGrid.tsx`, `components/HowItWorks.tsx`, `components/WhyHackwise.tsx`, `components/BuildThis.tsx`, `components/FinalCTA.tsx`, `components/Footer.tsx`
Static design sections, copy/SVG ported from the design. PRD ref: `prd.md > Screens and Layout` (3–6, 8–10).

### `components/AnalysisPanel.tsx`
The dark tabbed Preview. Renders `brief` into DEADLINE/PRIZE metrics + four tabs + rows, shows the facts/inference distinction, the MVP summary, the "Copy brief" button, the "Demo mode" badge, loading (four reading stages), empty rows, and the error card with "Try again". Falls back to sample data at idle. PRD ref: `prd.md > Analysis + the brief`, `prd.md > Copy the brief`, `prd.md > States and Boundaries`.

### `components/icons.tsx`
Inline SVG set (logo mark, feature/step glyphs, hub diagram, arrows) ported from the design.

### `app/api/analyze/route.ts`
POST endpoint. Validates body, orchestrates fetch → extract → model → validate, maps errors to codes, enforces demo mode when no key. PRD ref: `prd.md > Analysis + the brief`, `prd.md > Demo mode`.

### `lib/fetchPage.ts`
`fetch()` the URL with a timeout + size cap + sane User-Agent; cheerio extracts title, meta description, and visible text; returns trimmed text (≤ `MAX_PAGE_CHARS`). Rejects non-HTML and oversized responses.

### `lib/gemini.ts`
Wraps `@google/genai`. Reads `GEMINI_API_KEY`/`GEMINI_MODEL`. Builds a prompt that (a) treats page text as **untrusted data**, not instructions, (b) demands the exact JSON, (c) requires `null`/"unknown" for missing facts and a `verified` vs `inferred` split. Requests `responseMimeType: application/json` with a `responseSchema`. Modular so the model swaps via env.

### `lib/schema.ts`
Zod schema for the brief + a safe-parse helper. Shared by the route (validation) and the client (types).

### `lib/demoBrief.ts`
A clearly-labeled sample brief (mirrors the design's sample tab data) returned in demo mode.

## Data Model
No database; nothing persists. In-flight shapes only.

`Brief` (validated server-side, rendered client-side):
```ts
{
  meta: {
    name: string | null,              // competition name (verified)
    organizer: string | null,
    deadline: string | null,          // human string, e.g. "Mar 14, 2026"
    deadlineTimezone: string | null,
    prize: string | null,
    sourceUrl: string,
    confidence: "high" | "medium" | "low"
  },
  requirements: { weight: "HIGH" | "BONUS", text: string }[],
  judging:      { weight: string, text: string }[],   // weight e.g. "30%" or "—"
  submission:   { tag: "REQ", text: string }[],
  mvp:          { step: string, text: string }[],      // "01".."NN"
  mvpSummary:   string,                                 // inferred
  recommendation: { bestFitIdea: string, justification: string } | null, // inferred
  risks:        string[],                               // inferred
  notes:        string | null,                          // e.g. "Page looked JS-heavy; extraction partial"
  _meta:        { mode: "live" | "demo", model: string | null }  // added by server, not from model
}
```
Facts (`meta`, `requirements`, `judging`, `submission`) are extracted/verified from the page; `mvp`, `mvpSummary`, `recommendation`, `risks` are explicitly **inferred** and labeled as such in the UI. Missing facts are `null` / empty arrays, never fabricated.

## File Structure (as built)
```
Hackwise/
├── server.mjs                   # zero-dep Node http server: static files + POST /api/analyze
├── public/
│   ├── index.html               # full landing design (inline CSS tokens, all sections)
│   └── app.js                   # vanilla-JS state machine: composer, validation, tabs, analyze, copy
├── lib/
│   ├── schema.mjs               # validateBrief() + isPlausibleUrl() (hand-rolled validation)
│   ├── extract.mjs              # fetchPageText(): fetch + regex HTML→text, size/time-capped
│   ├── gemini.mjs               # analyzeWithGemini(): REST + optional official SDK, prompt, retry
│   └── demoBrief.mjs            # labeled sample brief for demo mode (no key)
├── design/                      # PRE-EXISTING design assets (preserved, not shipped)
│   ├── Hackwise Landing.dc.html  HANDOFF.md  support.js
├── devpost/                     # Devpost Learn workspace (plans)
│   ├── learner-profile.md  scope.md  prd.md  spec.md  checklist.md  app-map.html
├── .env.example  .env.local(gitignored)  .gitignore  README.md  LICENSE
└── package.json                 # no dependencies; scripts: start/dev -> node server.mjs
```
Component/behavior mapping (supersedes the Next.js `Components` headings below): the `app/page.tsx` state machine is now `public/app.js`; `components/AnalysisPanel.tsx` is the Preview block in `public/index.html` rendered by `app.js`; `app/api/analyze/route.ts` is the `/api/analyze` handler in `server.mjs`; `lib/fetchPage.ts`→`lib/extract.mjs`, `lib/gemini.ts`→`lib/gemini.mjs`, `lib/schema.ts`→`lib/schema.mjs`, `lib/demoBrief.ts`→`lib/demoBrief.mjs`.

## External Services and Dependencies
- **Google Gemini API** via `@google/genai`.
  - Call: `ai.models.generateContent({ model, contents, config: { responseMimeType: "application/json", responseSchema, temperature, maxOutputTokens, systemInstruction } })`; read `response.text`.
  - Key: `GEMINI_API_KEY` (server env). Model: `GEMINI_MODEL` default `gemini-2.5-flash`.
  - Docs: https://ai.google.dev/gemini-api/docs · rate limits: https://ai.google.dev/gemini-api/docs/rate-limits (free tier is limited; handled as a failure mode). Cost: free tier available; capped output tokens keep cost/latency bounded.
- **The user's pasted URL** — an arbitrary third-party page fetched server-side. Treated as untrusted: size-capped, text-only, and never interpreted as model instructions.

## Important Failure Modes
- **No `GEMINI_API_KEY`** → server returns the labeled demo brief (`mode: "demo"`); UI shows a "Demo mode" badge.
- **Page fetch fails / times out / non-HTML / too large** → `{ ok:false, error:{ code:"FETCH_FAILED" }}`; UI: "Couldn't load that page — check the URL and try again."
- **Page has almost no extractable text (JS-heavy or blocked)** → model gets little; `meta.confidence:"low"` + a `notes` flag; UI surfaces the low-confidence note rather than pretending.
- **Model returns invalid/non-conforming JSON** → Zod rejects → one retry, then `{ ok:false, error:{ code:"BAD_MODEL_OUTPUT" }}`; UI: "The analysis came back malformed — try again."
- **Rate limit / model error** → `{ ok:false, error:{ code:"MODEL_ERROR" }}`; UI shows the recoverable message with "Try again."

## What Was Simplified and Why
- **Client-side four-stage animation** instead of real streamed backend progress — the fuller version needs server-sent events and staged model calls; the animation gives the same demo feel. (`prd.md > Deferred`.)
- **Plain `fetch` + cheerio** instead of a headless browser — the fuller version renders JS pages but adds a heavy dependency and latency; accepted, with a low-confidence note when extraction is thin.
- **No persistence** — re-running replaces the brief; history is deferred.

## Decisions and Open Issues
- **Stack = Next.js + server route** (learner-selected) — chosen to keep the Gemini key server-side with the least moving parts; tradeoff: more than a static page, accepted.
- **Model = Gemini Flash via env** (learner-selected family; implementation default `gemini-2.5-flash`) — fast + cheap + supports JSON response schema.
- **Facts vs. inference split** (learner requirement) — enforced in the prompt, the schema, and the UI.
- **One genuine uncertainty to verify early in the build:** will `@google/genai`'s `responseSchema` reliably coerce Gemini Flash into our exact JSON shape? Plan to check first thing in `5-build` by running one real analysis (when a key is available) and confirming Zod parses it; if `responseSchema` is unreliable, fall back to strict prompt + Zod + one retry (already the error path). Evidence will live in the live-test output recorded during build.
- Open: live end-to-end depends on a valid `GEMINI_API_KEY`; without one, only demo mode + validation/error paths are verifiable. No other consequential gaps.
