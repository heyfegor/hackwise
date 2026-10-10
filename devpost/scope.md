---
doc: scope
status: approved
---
<!-- Provenance: distilled from the learner's written brief in a delegated autonomous run,
     not a live interview. Content reflects the learner's own stated intentions. Approved to
     proceed per the learner's explicit instruction to complete the planning workflow and
     then the implementation. -->

# Hackwise

One line: paste a hackathon URL and get back a focused "build brief" — the requirements, judging criteria, rules, and a realistic MVP plan — that tells you exactly what to build.

## The Unique Kernel
Hackwise reads the *whole* hackathon page and filters it down to **what actually scores**, then turns that into a concrete, sequenced MVP you could start building immediately. The distinctive move is the pairing: verified facts pulled from the page (requirements, judging weights, deadline) sitting right next to an *inferred* MVP recommendation — with the two kept visibly separate so the builder trusts what's real and treats the advice as advice. Delete the "what to build" recommendation and you're left with a generic page summarizer; the recommendation is the kernel.

## Who It's For
A hackathon participant — picture a student or indie developer who just found a promising hackathon on Devpost with a 2-week deadline. They're staring at a long rules page full of eligibility clauses, sponsor tracks, judging rubrics, and submission requirements, and they don't know where to start. Today they skim the page, maybe miss a required deliverable, and over-build the wrong thing. They want to know, in one minute, what to build and what to skip.

## The Core Loop
They open Hackwise, paste a hackathon URL into a ChatGPT-style composer, and hit analyze. Hackwise fetches and reads the page, then shows a structured brief: deadline, prize, requirements, judging criteria, submission rules, and a focused MVP plan with a clear build order. They read it, copy the parts they need, and go build. They come back for the next hackathon.

## Inspiration & Identity
Supplied design (the single source of truth): `design/Hackwise Landing.dc.html` + `design/HANDOFF.md`.
- Warm off-white canvas (`#FBFAF7`), ink text (`#141414`), a single lime accent (`#B8F23A`), olive-lime for emphasis (`#5a7a2e`).
- Typography: Geist (UI/body/display) + Geist Mono (labels, tags, metrics).
- Centerpiece: a ChatGPT-style composer. Energy is calm, confident, editorial — spacious rhythm, hairline borders, high-fidelity.
- Works-with platforms referenced: Devpost, MLH, Devfolio, HackerEarth.

## Why This Matters to the Learner
It's being submitted to the Devpost Learn AI Basics hackathon, so it has to demonstrate one real, reliable AI-powered workflow end to end — and model the exact behavior it preaches: figure out what matters, build the smallest thing that proves it, skip the rest.

## What "Working" Looks Like
Someone pastes a real hackathon URL, clicks analyze, watches a short reading/loading state, and within a few seconds sees a structured brief: a deadline and prize up top, then tabbed sections for Requirements, Judging, MVP, and Submission, plus a one-line MVP summary — and can copy the whole brief to the clipboard. The "oh, that's cool" beat: the MVP tab shows a sequenced 01→04 build plan derived from *this specific* hackathon's rules, visibly distinct from the facts it was inferred from.

## The POC Boundary
In: one page (the recreated landing design) + one working composer; a server-side endpoint that fetches the pasted URL, extracts text, sends it to an LLM (Gemini Flash), validates the structured JSON, and renders it into the dark tabbed brief component; validation, loading, empty, success, and error states; copy-to-clipboard; a clearly-labeled demo mode when no API key is configured.

## Later
- Streaming the four reading stages as real backend progress.
- Saving/﻿history of past analyses.
- Supporting platform-specific parsers (Devpost vs MLH page shapes).
- Export to Markdown / share links.

## Explicitly Cut
- **User accounts / auth** — nothing in the core loop needs identity.
- **Team management, dashboards, billing** — out of scope for a proof of concept and explicitly excluded by the brief.
- **Project-management features** (task tracking, reminders) — would turn a focused analyzer into a platform; the brief says keep it narrow.
- **Advanced analytics** — not needed to prove the kernel.
