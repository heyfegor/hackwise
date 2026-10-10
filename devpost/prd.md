---
doc: prd
status: approved
---
<!-- Provenance: distilled from the learner's written brief and the supplied design
     (design/Hackwise Landing.dc.html) in a delegated autonomous run. Approved to proceed
     per the learner's explicit instruction. -->

# Hackwise — Product Requirements

One line: Hackwise turns a pasted hackathon URL into a focused build brief + MVP plan, for hackathon participants who need to know what to build.
Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`.

## The Core Journey
1. The visitor lands on the Hackwise landing page (recreated from `design/Hackwise Landing.dc.html`). Hero headline "Know exactly what to build." with a ChatGPT-style composer front and center.
2. They paste a hackathon URL into the composer and press the lime send button or hit **Enter** (Shift+Enter inserts a newline). Source: `scope.md > The Core Loop`.
3. Hackwise validates the input is a plausible URL. If not, it shows an inline error and does not call the backend.
4. On a valid URL, the app POSTs it to a server-side endpoint, and shows a **loading/reading** state (the four-stage "reading requirements → judging → rules → MVP scope" sequence).
5. The backend fetches the page, extracts readable text, sends it to the LLM with a strict prompt, validates the returned JSON against a schema, and responds.
6. The app renders the **brief**: a deadline + prize summary and a tabbed panel (Requirements / Judging / MVP / Submission), plus a one-line MVP summary. Verified facts and inferred recommendations are visibly distinguished. Source: `scope.md > What "Working" Looks Like`.
7. The user can **copy** the full brief to the clipboard, and run another URL.
8. On any failure (bad fetch, unreadable/non-hackathon page, LLM/timeout/invalid JSON), a clear, recoverable error is shown with a re-run affordance.

## Screens and Layout
A single scrolling landing page (one surface) with an in-page result area. Sections, top to bottom, exactly as in the design handoff:
1. **Sticky nav** — logo + wordmark "hackwise", desktop links (Features, How it works, Preview), a dark "Analyze" button; mobile hamburger → overlay dropdown menu that does not push content down.
2. **Hero** (`#top`) — availability pill, H1 "Know exactly what to **build.**", subhead, the **composer**, and a platform row (Devpost · MLH · Devfolio · HackerEarth).
3. **Feature strip** — 3 cells (Instant build brief / AI analysis / Focused MVP scope).
4. **Features grid** (`#features`) — 6 cards.
5. **How it works** (`#how`) — 3 steps.
6. **Why Hackwise** — statement + hub-and-spoke diagram.
7. **Preview** (`#preview`) — dark section; the tabbed analysis component. **This is the live result display** — it renders sample data until an analysis runs, then renders the real brief.
8. **Build this / Don't build this** — two columns.
9. **Final CTA** — "Stop reading. Start **building.**"
10. **Footer**.

Navigation: anchor links jump to `#features`, `#how`, `#preview`. Every "Analyze" affordance (nav, Preview CTA, final CTA, mobile menu) smooth-scrolls to top and focuses the composer. The result renders in-place at the Preview section.

## Look and Feel
Carried from `scope.md > Inspiration & Identity` and `design/HANDOFF.md` (high-fidelity, pixel-faithful intent):
- **Colors:** page `#FBFAF7`; secondary band `#F4F3EE`; ink `#141414`; dark-surface hover `#2a2a2a`; body `#5c5c57`; tertiary `#6d6d68`; muted `#8a8a84`/`#9a9a94`; faint `#a0a09a`; disabled wordmarks `#b4b4ae`; lime `#B8F23A`; olive-lime emphasis `#5a7a2e`. Dark section bg `#141414` with `#FBFAF7` text.
- **Type:** Geist (400/450/500/600) + Geist Mono (400/500), from Google Fonts. Display letter-spacing -.02 to -.04em; mono eyebrows +.04 to +.14em; body line-height 1.55.
- **Radius:** 999px pills, 22px composer, 18–20px cards, 10–14px buttons/chips. **Shadows:** composer `0 14px 40px -28px rgba(20,20,20,.5)`; send-button hover glow lime.
- **Energy:** calm, editorial, spacious; hairline borders; `::selection` lime on ink; reduced-motion collapses animation.
- **Responsive:** single breakpoint at max-width 880px (desktop → mobile), mobile-first and usable on both.

## Features and Behavior

### The composer (core interaction)
- A rounded white card, max-width 620px, with a 2-row textarea (placeholder "Paste a Hackathon URL") and a round lime send button (up-arrow).
- Focus ring: the whole wrapper gets a lime border + lime glow when the textarea is focused.
- **Enter** submits; **Shift+Enter** inserts a newline. The send button also submits.
- As a hackathon participant, I want to paste a URL and trigger analysis in one gesture so that I get my brief with no setup.
  - [ ] Typing updates the field; the send button and Enter both trigger analyze.
  - [ ] Shift+Enter inserts a newline and does NOT submit.
  - [ ] Focusing the composer shows the lime focus ring.

### URL validation
- As a user, I want obvious bad input caught before anything runs so that I'm not left waiting on a doomed request.
  - [ ] Empty/whitespace input: the composer shows an inline hint and does not call the backend.
  - [ ] A string that isn't a plausible http(s) URL: inline error "Enter a valid hackathon URL (https://…)"; no backend call.
  - [ ] A plausible http(s) URL proceeds to analysis.

### Analysis + the brief
- As a user, I want the page turned into a structured brief so that I can see requirements, judging, MVP, and submission at a glance.
  - [ ] While analyzing, the four reading stages advance and a spinner/active state is visible.
  - [ ] On success, the Preview section shows: DEADLINE and PRIZE metrics; four tabs (Requirements, Judging, MVP, Submission); and the active tab's rows.
  - [ ] Requirements rows show a weight tag (HIGH lime / BONUS grey); Judging rows show a percent/weight; MVP rows show 01–04 order; Submission rows show REQ.
  - [ ] A one-line MVP summary is shown.
  - [ ] Verified facts vs. inferred recommendations are visibly labeled; unknown facts render as an explicit "unknown"/"—", never fabricated.

### Copy the brief
- As a user, I want to copy the generated brief so that I can paste it into my notes or README.
  - [ ] A "Copy brief" control copies a readable plain-text version of the whole brief to the clipboard and confirms ("Copied").

### Demo mode (no key configured)
- As a user without an API key, I want to still see the end-to-end flow so that I can evaluate the product.
  - [ ] When the server has no `GEMINI_API_KEY`, analysis returns a **clearly-labeled** sample brief and the UI shows a visible "Demo mode" badge. It is never presented as a real analysis of the submitted page.

## States and Boundaries
- **First use / idle** — landing page with sample data in the Preview section and an idle composer.
- **Validating (client)** — inline error for bad input; no network call.
- **Analyzing** — loading state with advancing reading stages; composer disabled from re-submitting the same run.
- **Success** — real brief rendered in the Preview tabs; metrics populated; copy enabled.
- **Empty fields within a success** — a section with no extractable items shows an explicit empty row ("No explicit requirements found on the page"), not an invented one.
- **Error** — fetch failed / page unreadable / likely not a hackathon page / LLM or timeout / invalid model JSON: a clear message naming the problem + a "Try again" affordance. The composer stays usable.
- **Demo mode** — labeled badge; sample brief.
- **Persistence** — none; nothing is stored between sessions (no accounts). Re-running replaces the current brief.

## Product Decisions
- **Keep the Preview (dark tabbed) component as the single result surface** — the design already frames it as the intended output format; reusing it avoids inventing a second UI. Reason: faithful to the design and to scope.
- **Facts vs. inference are visibly separated** — core to the kernel and to honest compliance; the learner was emphatic about never inventing competition rules.
- **Demo mode is explicitly labeled, never silent** — required by the brief so judges aren't misled.
- **One analysis request per submit** (no streaming in the POC) — the four-stage animation is a client-side progress model; real streaming is deferred.

## What We're Building
Everything in **Features and Behavior** above, within the recreated landing design, with real server-side Gemini analysis + labeled demo-mode fallback, and all five states (idle/loading/success/empty/error).

## Deferred From the POC
- Real streamed backend progress stages (POC uses a client-side animation).
- History / saved analyses (implies storage + identity).
- Platform-specific extractors for JS-heavy pages (POC does server-side HTML fetch + text extraction).
- Markdown export / shareable result links (copy-to-clipboard covers the demo need).

## Possible Later Enhancements
- Per-platform parsers (Devpost/MLH/Devfolio/HackerEarth) for higher extraction accuracy.
- Headless-browser rendering for client-rendered pages.
- Side-by-side comparison of multiple hackathons.

## Non-Goals
- **Authentication / user accounts** — nothing in the loop needs identity.
- **Team management / dashboards / billing** — explicitly out per the brief.
- **A project-management platform** — scope must stay narrow.
- **Claiming verified facts that weren't on the page** — the product must never invent rules, deadlines, prizes, or judging weights.

## Open Questions
- None blocking `4-spec`. The one external dependency (a valid `GEMINI_API_KEY`) is handled by demo mode when absent; live analysis is verified when a key is supplied.
