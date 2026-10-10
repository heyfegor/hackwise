# Handoff: Hackwise Landing Page

## Overview
Hackwise is a tool that reads a hackathon's web page and returns a focused "build brief" — the requirements, judging criteria, rules, and a recommended MVP scope. This handoff covers the **marketing landing page**, whose centerpiece is a ChatGPT-style composer where the user pastes a hackathon URL and triggers analysis.

The landing page is the UI shell. The actual analysis (fetch the pasted URL, extract requirements/judging/rules, run it through an LLM, return a structured brief) is the backend work to be built — the prototype currently fakes this with a scripted demo sequence. See **Interactions & Behavior → Analyze flow** for exactly what to replace.

## About the Design Files
The file in this bundle (`Hackwise Landing.dc.html`) is a **design reference created in HTML** — a prototype showing intended look and behavior, not production code to ship directly. It is authored as a "Design Component": a custom runtime (`support.js`) renders a template plus a logic class. **Do not copy that runtime.** The task is to **recreate this design in the target codebase's environment** (React, Vue, Svelte, etc.) using its established patterns, routing, and component libraries. If no front end exists yet, pick an appropriate framework (React + a CSS solution is a natural fit given the inline-style structure) and implement there.

Treat the `.dc.html` as the single source of truth for layout, copy, colors, and type. Every value below is extracted from it.

## Fidelity
**High-fidelity.** Final colors, typography, spacing, copy, and interactions are all specified. Recreate the UI pixel-faithfully, then wire the Analyze flow to a real backend.

## Tech & Layout Fundamentals
- **Fonts:** `Geist` (UI/body/headings) and `Geist Mono` (labels, tags, eyebrows, metrics). Loaded from Google Fonts. Weights used: Geist 400/450/500/600; Geist Mono 400/500.
- **Page background:** `#FBFAF7` (warm off-white). Body text `#141414`.
- **Content width:** sections are capped at `max-width: 1240px`, horizontal padding `clamp(20px, 4vw, 40px)`. The hero is narrower: `max-width: 820px`.
- **Vertical rhythm:** section padding is typically `clamp(64px, 9vw, 120–128px)` top/bottom.
- **Responsive breakpoint:** a single media query at **max-width 880px** switches desktop → mobile (see Responsive Behavior).
- **Font smoothing:** `-webkit-font-smoothing: antialiased`. `::selection` uses lime bg `#B8F23A` on `#141414`.
- **Reduced motion:** all animations/transitions collapse to ~0ms under `prefers-reduced-motion: reduce`.

## Screens / Views
This is a single scrolling landing page. Sections top to bottom:

### 1. Nav (sticky)
- **Layout:** sticky top bar, `z-index: 50`, background `rgba(251,250,247,.88)` with `backdrop-filter: saturate(1.1) blur(8px)`, 1px bottom border `rgba(20,20,20,.08)`. Inner row max-width 1240px, padding `18px clamp(20px,4vw,40px)`, flex row, `gap: 24px`, `align-items: center`.
- **Logo (left):** inline SVG checkmark-style mark (26×22) + wordmark "hackwise" (weight 600, 18px, letter-spacing -.02em). The SVG is two strokes: a dark zig-zag `#141414` (stroke-width 3.2) and a lime upstroke `#B8F23A` (stroke-width 3.4), both round caps/joins. ViewBox `0 0 32 28`, paths: `M2 5 L9 23 L16 10 L21 20` (dark) and `M21 20 L30 4` (lime).
- **Nav links (desktop only):** "Features", "How it works", "Preview" → anchor to `#features`, `#how`, `#preview`. 15px, color `#5c5c57`, weight 450, gap 30px.
- **Right cluster (`margin-left:auto`):**
  - **"Analyze" button** (desktop only): bg `#141414`, text `#FBFAF7`, radius 10px, padding `10px 20px`, 14.5px/500. Hover bg `#2a2a2a`. Clicking it scrolls to top and focuses the composer textarea.
  - **Hamburger button** (mobile only): 42×42, 1px border `rgba(20,20,20,.14)`, radius 10px, three-line icon.
- **Mobile dropdown menu:** when open, an **absolutely positioned overlay** (`position:absolute; left:0; right:0; top:100%`) so it does NOT push page content down. Background `rgba(251,250,247,.98)`, blur, top+bottom hairline borders, shadow `0 20px 40px -24px rgba(20,20,20,.35)`. Stacked links (17px, `#141414`, 12px vertical padding, hairline dividers) + a full-width dark "Analyze a hackathon" button (radius 10px, 14px padding). Selecting any item closes the menu; the Analyze item also scrolls-to-top + focuses the composer.

### 2. Hero (`#top`)
- **Layout:** single **centered column**, `max-width: 820px`, `display:flex; flex-direction:column; align-items:center; text-align:center`. Padding `clamp(56px,9vw,120px)` top, `clamp(48px,7vw,88px)` bottom.
- **Availability pill:** inline-flex, `white-space:nowrap`, white bg, 1px border `rgba(20,20,20,.12)`, radius 999px, padding `6px 14px 6px 12px`, 13.5px, color `#3a3a37`. Leading 7×7 lime dot. Text: "hackwise is now available". Margin-bottom `clamp(22px,3vw,30px)`.
- **H1:** "Know exactly what to **build.**" — "build." is colored `#5a7a2e` (olive-lime). Size `clamp(42px,6.5vw,80px)`, line-height 1, letter-spacing -.04em, weight 600, `text-wrap:balance`. Margin-bottom 22px.
- **Subhead `<p>`:** "Paste a hackathon URL. Hackwise reads the requirements, judging criteria, and rules, then hands back a focused plan for what to build." Size `clamp(16px,1.3vw,19px)`, color `#5c5c57`, max-width 30em, line-height 1.55, `text-wrap:pretty`. Margin-bottom 36px.
- **Composer (the key component):** width 100%, max-width 620px, white bg, **1.5px** border `rgba(20,20,20,.14)`, radius 22px, padding `14px 14px 12px`, shadow `0 14px 40px -28px rgba(20,20,20,.5)`, `text-align:left`. Transitions border-color + box-shadow over .18s.
  - **Textarea:** `rows=2`, placeholder "Paste a Hackathon URL", transparent, no border/outline, no resize, 15.5px/1.5, color `#141414`, padding `4px 6px`, `max-height:140px`. `aria-label="Hackathon URL"`.
  - **Send button:** bottom-right, round 40×40, lime bg `#B8F23A`, up-arrow icon (`#141414` stroke 2.2). Hover: `translateY(-1px)` + glow `0 8px 20px rgba(184,242,58,.55)`. `aria-label="Analyze"`.
  - **Focus state:** when the textarea is focused, the whole composer wrapper gets `border-color:#B8F23A; box-shadow:0 0 0 4px rgba(184,242,58,.2)`.
- **Platform row:** eyebrow (Geist Mono 12px, letter-spacing .06em, color `#a0a09a`) "WORKS WITH THE PLATFORMS YOU ALREADY USE", then a centered wrap of wordmarks "Devpost · MLH · Devfolio · HackerEarth" at 16px/600, color `#b4b4ae`. Margin-top `clamp(40px,6vw,64px)`.

### 3. Feature strip
- Full-width band (max-width 1240px inner), top+bottom 1px borders `rgba(20,20,20,.1)`, 3-column grid. Two absolutely-positioned 1px vertical dividers at 33.33% and 66.66% (hidden on mobile).
- Each of 3 cells: centered, 44×44 round white icon chip (1px border), title 16px/600, body 14px color `#8a8a84` max-width 24em.
- Items: **Instant build brief** / "A full hackathon read in seconds, not an afternoon." — **AI analysis** / "Requirements, judging, and rules pulled out automatically." — **Focused MVP scope** / "The smallest thing that proves the idea to judges." Icons are inline SVG (clock, sparkle, layers).

### 4. Features grid (`#features`)
- Eyebrow row: lime dot + "Features" (Geist Mono 13px).
- H2: "Everything you need to decide what matters." `clamp(32px,4.5vw,56px)`, line-height 1.04, -.03em, 600.
- Intro `<p>`: "A focused toolkit that helps hackathon builders cut the noise and ship the right thing in record time." (color `#5c5c57`, max-width 34em).
- Responsive grid `repeat(auto-fit, minmax(min(100%,280px),1fr))`, gaps `clamp(36px,4vw,56px)` / `clamp(32px,4vw,48px)`.
- **6 cards**, each: 34×34 rounded (9px) white icon chip; then a row with a 3px lime left accent bar + title (18.5px/600) + body (15px, `#6d6d68`, line-height 1.55):
  1. **Hackathon intelligence** — "Understand the requirements, rules, judging criteria, sponsors, and technologies that actually count."
  2. **AI-powered analysis** — "Describe the hackathon or paste the link and Hackwise reads the fine print for you."
  3. **Build brief** — "The whole page turned into one concise, actionable summary you can scan in seconds."
  4. **Submission plan** — "Requirements turned into a clear checklist for shipping before the deadline."
  5. **Scope guardrails** — "Clear guidance on what to skip so you never over-build under a deadline."
  6. **Build order** — "A sequenced plan — what to do first, second, and last — right up to the demo."

### 5. How it works (`#how`)
- Band with bg `#F4F3EE`, top+bottom hairline borders.
- Centered H2: "From a URL to a plan in three steps." `clamp(30px,4vw,50px)`.
- 3-column responsive grid. Each step: top 1px border `rgba(20,20,20,.14)`, 40×40 **dark** (`#141414`) rounded icon chip with a white-stroke glyph, title 20px/600, body 15px `#6d6d68`.
  1. **Paste the URL** — "One link is all Hackwise needs to get started — no setup, no account."
  2. **Hackwise reads it** — "It extracts the requirements, judging criteria, technologies, and submission rules that affect your score."
  3. **Get your scope** — "A clear build order and the next steps you need to ship before the deadline."

### 6. Why Hackwise (diagram)
- 2-column (text + SVG diagram).
- Pill label "Why Hackwise" (dark bg, white text, Geist Mono 11.5px, radius 6px).
- Large statement `<p>` `clamp(22px,2.4vw,32px)`, weight 500: "Hackwise filters the whole hackathon page down to what scores — " + muted span (`#9a9a94`) "turning rules, sponsors, and fine print into a plan you can build."
- Diagram: an inline SVG hub-and-spoke (central white node, a dark node top labeled "ADAPTING", two lime nodes labeled "LEARNING" and "DEPLOYING") connected by dashed curves. Decorative — can be rebuilt as an illustration/asset in the target app.

### 7. Preview — dark tabbed analysis demo (`#preview`)
- Full-bleed **dark** section, bg `#141414`, text `#FBFAF7`.
- **Left column:** H2 "See exactly / what matters." (clamp 30–48px). Muted `<p>` (`#9a9a94`): "A sample analysis of how this works. Switch between what Hackwise pulled out of the page." Lime pill button "Analyze yours →" (bg `#B8F23A`, text `#141414`, radius 999px) that scrolls to the hero composer. Two metric blocks: DEADLINE "14 days" (lime value), PRIZE "$25,000".
- **Right column:** a row of 4 pill **tabs** (Geist Mono 13px, radius 999px). Active tab: lime bg / dark text; inactive: `rgba(255,255,255,.07)` bg / `#9a9a94` text. Below, a list of rows (each a `min-width:52px` mono tag + a statement), separated by 1px `rgba(255,255,255,.1)` top borders.
- **Tab content** (this is sample data illustrating the eventual real output):
  - **Requirements:** HIGH "AI must be central to the experience." / HIGH "A working prototype is required — not slides." / HIGH "A demo video ships with the submission." / BONUS "Using a sponsor API earns extra credit." (HIGH tags lime, BONUS grey)
  - **Judging:** 30% "Technical execution — does it actually work?" / 25% "Innovation — is the approach original?" / 25% "Impact — does it solve a real problem?" / 20% "Presentation — is the demo clear?" (first % lime, rest grey)
  - **MVP:** 01 "User enters a problem." / 02 "AI analyzes it." / 03 "System returns a result." / 04 "Demo proves the end-to-end workflow." (all lime tags)
  - **Submission:** REQ ×4 — "Public repository with a clear README." / "Demo video under three minutes." / "Written explanation of the build." / "Submitted before the 14-day deadline."

### 8. Build this / Don't build this
- H2: "Build what wins. Skip the rest." (clamp 30–52px, max-width 13em).
- Two columns:
  - **BUILD THIS** (lime dot, Geist Mono label): list with lime `✓` marks — "Core user workflow", "Required AI functionality", "A working prototype", "A demo-ready experience". Each row 15px vertical padding, hairline bottom border, item text clamp 16–20px.
  - **DON'T BUILD THIS** (hollow dot, grey label `#9a9a94`): list with grey `×` marks, muted text — "Complex user accounts", "Advanced analytics", "Large admin systems", "Anything unrelated to judging".

### 9. Final CTA
- Band bg `#F4F3EE`, top hairline. 2-col grid `1.2fr 1fr`, `align-items:end` (stacks to 1 col on mobile).
- H2: "Stop reading. / Start **building.**" ("building." in `#5a7a2e`), `clamp(38px,5.5vw,76px)`, line-height 1, -.04em.
- Right: `<p>` "Give Hackwise the hackathon and get back the shortest path to a submission." + dark pill button "Analyze a hackathon →" (bg `#141414`, radius 999px, padding `15px 30px`) — scrolls to composer. Hover: bg `#2a2a2a` + `translateY(-2px)`.

### 10. Footer
- bg `#FBFAF7`. Grid `repeat(auto-fit, minmax(140px,1fr))`.
- Brand block (spans full row): logo + wordmark + "Hackathon intelligence that tells you exactly what to build." (14.5px, `#6d6d68`).
- Columns (Geist Mono heads, color `#a0a09a`; links 14.5px, `#5c5c57`):
  - **PRODUCT:** Features, How it works, Preview
  - **COMPANY:** About, Blog
  - **RESOURCES:** Docs, GitHub
- Bottom bar: top hairline + "© 2026 hackwise. All rights reserved." (Geist Mono 11.5px, `#a0a09a`).

## Interactions & Behavior

### Analyze flow (THE part to build for real)
In the prototype this is a **fake scripted demo** living in the logic class. Replace it end-to-end:

**Current (prototype) behavior — to be removed:**
- `analyze()` sets a phase to `analyzing`, then fires 4 timers that reveal 4 canned "reading" steps one at a time (speed configurable: Slow 1000ms / Normal 700ms / Fast 420ms per step), then switches to a `brief` phase showing a hard-coded brief. The dark Preview section (#7) shows static sample tab data. (Note: the inline hero result card was removed per design direction; the dark Preview section remains as the sample demo.)

**Target behavior:**
1. User pastes a URL into the hero composer and hits the send button or presses **Enter** (Shift+Enter inserts a newline — preserve this).
2. Validate the input is a plausible URL; surface an inline error state if not.
3. POST the URL to a backend endpoint. Backend should: fetch the page, extract text, run it through an LLM with a prompt that returns a **structured brief** (see schema below), and respond with JSON.
4. Show a **loading/analyzing state** while this runs (the 4-step "reading requirements → judging → rules → MVP scope" sequence is a good real progress model if the backend streams stages; otherwise a single spinner).
5. Render the returned brief. The dark tabbed Preview UI (Requirements / Judging / MVP / Submission) is the intended display format for a real result — reuse that component to render live data.
6. Handle **error states**: fetch failed, page unreadable, non-hackathon page, LLM/timeout errors — each should show a clear, recoverable message with a re-run affordance.

**Suggested brief schema** (matches what the UI already displays):
```
{
  meta: { deadline: string, prize: string, focus: string, sourceUrl: string },
  requirements: [{ weight: "HIGH"|"BONUS", text: string }],
  judging:      [{ weight: string /* e.g. "30%" */, text: string }],
  mvp:          [{ step: string /* "01".. */, text: string }],
  submission:   [{ tag: "REQ", text: string }],
  mvpSummary:   string
}
```

### Other interactions
- **"Analyze" buttons everywhere** (nav, Preview CTA, final CTA, mobile menu) call `focusInput`: smooth-scroll to top, then focus the composer textarea after ~440ms. Preserve this convenience behavior.
- **Nav anchor links** jump to `#features`, `#how`, `#preview`.
- **Mobile menu** toggles open/closed; opening does not shift page layout (overlay). Any selection closes it.
- **Hover transitions:** buttons lift (`translateY`) and/or deepen color over .15s; composer send button glows lime.
- **Tabs** in the Preview section switch the displayed list; active tab is lime.

## State Management
State needed for the real app:
- `url` (string) — composer value.
- `phase` — `idle | analyzing | brief | error` (prototype also uses `doneCount` for the fake step reveal; replace with real progress).
- `tab` — active Preview tab (`requirements | judging | mvp | submission`).
- `focused` (bool) — composer focus ring.
- `menuOpen` (bool) — mobile nav.
- **New:** the fetched `brief` object, plus `error` message.
- **Data fetching:** one request to the analysis endpoint on submit; consider streaming progress stages.

## Design Tokens
**Colors**
- Page bg warm white: `#FBFAF7`
- Secondary band bg: `#F4F3EE`
- Ink / primary text & dark surfaces: `#141414`
- Dark surface hover: `#2a2a2a`
- Body/secondary text: `#5c5c57`
- Tertiary text: `#6d6d68`
- Muted text: `#8a8a84`, `#9a9a94`
- Faint text / eyebrows: `#a0a09a`
- Disabled wordmarks: `#b4b4ae`
- Lime accent: `#B8F23A`
- Olive-lime (on-light accent text, e.g. "build."): `#5a7a2e`
- Hairline borders: `rgba(20,20,20,.08)` / `.1` / `.12` / `.14`; on dark: `rgba(255,255,255,.07)` / `.1` / `.16`

**Typography**
- Families: `'Geist'` (with `system-ui, sans-serif` fallback), `'Geist Mono', monospace`
- Scale (clamped): H1 `clamp(42px,6.5vw,80px)`; section H2 `clamp(30–38px … 48–76px)`; statement `clamp(22px,2.4vw,32px)`; body 15–19px; labels/tags 10–13px mono.
- Letter-spacing: display -.02em to -.04em; mono eyebrows +.04 to +.14em.
- Line-height: display ~1–1.05; body 1.55.

**Radius:** 999px (pills), 22px (composer), 20px/18px (cards), 10–14px (buttons/chips), 9px/7px (small chips).

**Shadows:** composer `0 14px 40px -28px rgba(20,20,20,.5)`; send-button hover glow `0 8px 20px rgba(184,242,58,.55)`; mobile menu `0 20px 40px -24px rgba(20,20,20,.35)`.

**Spacing:** section padding `clamp(64px,9vw,120–128px)`; content max-width 1240px (hero 820px); gutter `clamp(20px,4vw,40px)`.

## Assets
- **Fonts:** Geist + Geist Mono via Google Fonts (`fonts.googleapis.com/css2?family=Geist…&family=Geist+Mono…`). Use the codebase's standard font-loading approach.
- **Icons & logo:** all inline SVG, hand-authored in the prototype (logo mark, feature/step glyphs, the "Why Hackwise" hub diagram, nav arrow/hamburger). No external icon library or raster images. Recreate with the codebase's icon system or inline SVG; the logo mark paths are given in the Nav section above.
- No photographic or AI-generated imagery is used.

## Files
- `Hackwise Landing.dc.html` — the full prototype (included in this bundle). Template markup + a `Component` logic class at the bottom (`<script data-dc-script>`). The logic class holds the fake `analyze()` sequence, all section copy as data arrays, and the inline-SVG icon/diagram builders. Read it as the source of truth; ignore the `support.js` runtime reference (not shippable).
