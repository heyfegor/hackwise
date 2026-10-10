# Hackwise

**Paste a hackathon URL → get a focused build brief and a realistic MVP plan.**

Hackwise reads a hackathon or competition page and turns it into a structured brief:
the requirements, judging criteria, submission rules, deadline and prize it can **verify
from the page**, plus an **inferred** MVP recommendation and build order. Verified facts
and recommendations are kept visibly separate, and anything the page doesn't state is
shown as *unknown* — never invented.

Built for the [Devpost **Build With AI: Basics**](https://learn-ai-basics.devpost.com/)
learning hackathon, following its Skill Pack plan-first workflow (see `devpost/`).

---

## What it does (the one core flow)

1. Paste a hackathon URL into the composer and press **Enter** (or the send button).
2. The browser validates the URL, then POSTs it to a **server-side** endpoint.
3. The server fetches the page, extracts readable text, sends it to **Google Gemini**
   with a strict prompt, and **validates the returned JSON** against a schema.
4. The result renders in the dark **Requirements / Judging / MVP / Submission** panel,
   with deadline + prize metrics and a one-line MVP summary.
5. **Copy brief** puts a readable plain-text version on your clipboard.

If no API key is configured, the app runs in a clearly-labeled **Demo mode** that returns
a sample brief so the whole flow is still demonstrable — it never pretends to have read
your page.

---

## Tech (zero dependencies)

Hackwise runs on **Node.js built-ins only** — no `npm install` required:

- `server.mjs` — Node `http` server; serves the static UI and `POST /api/analyze`. The
  `GEMINI_API_KEY` is read server-side only and is never sent to the browser.
- `public/index.html` + `public/app.js` — the landing design (ported from
  `design/Hackwise Landing.dc.html`) and a vanilla-JS state machine.
- `lib/extract.mjs` — fetches the URL and reduces the HTML to text (size/time-capped;
  the page is treated as untrusted data, never as instructions to the model).
- `lib/gemini.mjs` — calls Gemini via the built-in `fetch` REST API, and **automatically
  uses the official `@google/genai` SDK if it is installed** (see below).
- `lib/schema.mjs` — validates the model's JSON before it is displayed.
- `lib/demoBrief.mjs` — the labeled sample brief for demo mode.

> **Why zero-dependency?** The chosen stack was originally Next.js + the official Gemini
> SDK, but the build environment's network could not install npm packages. The
> implementation was moved to Node built-ins so it ships and runs anywhere, with the
> same design and behavior. See `devpost/checklist.md > Revisions` for the full story.

---

## Requirements

- **Node.js ≥ 18.17** (developed on Node 24). That's it.

## Run it

```bash
# from the project root
node server.mjs
# or: npm start
```

Then open **http://localhost:3000**.

- With **no** `GEMINI_API_KEY`, the server prints `analysis mode: DEMO` and returns the
  labeled sample brief.
- With a key set, it prints `analysis mode: LIVE` and performs real analysis.

`PORT=4000 node server.mjs` runs on a different port.

## Configure live analysis

Copy `.env.example` to `.env.local` (gitignored) and fill in your key:

```bash
GEMINI_API_KEY=your_key_here        # from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash       # optional; any supported Flash model
MAX_PAGE_CHARS=16000                # optional; caps text sent to the model
```

Restart the server after editing `.env.local`.

### Optional: use the official Google GenAI SDK

The Gemini call works out of the box over REST. If you prefer the **official SDK**, just
install it — `lib/gemini.mjs` will detect and use it automatically, no code change:

```bash
npm install @google/genai
```

## Test / verify

No test framework (kept proof-of-concept sized). Verify the core flow by hand:

```bash
# page serves
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/        # -> 200

# demo analysis (no key needed)
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"https://devpost.com/"}'                                  # -> {"ok":true,"mode":"demo",...}

# input validation
curl -s -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url":"not a url"}'                                             # -> 400 INVALID_URL
```

With a key set, the same POST against a real hackathon URL returns `"mode":"live"` and a
brief reflecting that page.

## Error handling

The endpoint returns `{ ok:false, error:{ code, message } }` with an appropriate status for:
`INVALID_URL`, `FETCH_FAILED` (page unreachable / not HTML / timeout), `BAD_MODEL_OUTPUT`
(malformed model JSON, after one retry), `MODEL_ERROR` / rate limit, and `SERVER_ERROR`.
The UI shows a recoverable error card with **Try again**. Pages with little extractable
text come back with low confidence and a note rather than fabricated facts.

## Project layout

```
server.mjs            # zero-dep server (static + /api/analyze)
public/               # index.html (design) + app.js (UI logic)
lib/                  # extract.mjs, gemini.mjs, schema.mjs, demoBrief.mjs
design/               # PRE-EXISTING design assets (reference, preserved)
devpost/              # Skill Pack planning docs: scope.md, prd.md, spec.md, checklist.md
.env.example          # config template (copy to .env.local)
```

## Honesty & scope notes

- Hackwise **never invents** competition rules, deadlines, prizes, or judging weights.
  Unknown facts are `null`/"unknown"; inferred advice (MVP, recommendation, risks) is
  labeled as inferred.
- Intentionally narrow: no accounts, teams, dashboards, or billing — just
  URL → brief → MVP plan.

## License

[MIT](./LICENSE).
