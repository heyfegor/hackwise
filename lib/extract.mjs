// Fetch a URL server-side and extract readable text.
// Regex-based (cheerio was the planned extractor but could not be installed here).
//
// Strategy: try a direct fetch with browser-like headers first. If that is blocked
// (e.g. Devpost/Cloudflare 403) or returns very little text, fall back to a public
// "reader" proxy (default r.jina.ai) that renders the page and returns clean text.
// The reader can be changed/disabled with the READER_PROXY env var.
//
// The fetched page is UNTRUSTED input: it is size-capped, reduced to plain text, and
// never interpreted as instructions to the model.

const DEFAULT_MAX_CHARS = 16000;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 12000;
const MAX_BYTES = 2_500_000; // ~2.5 MB cap on the downloaded HTML
// Reader proxy used when a direct fetch is blocked. Set READER_PROXY="" to disable.
const READER_PROXY = process.env.READER_PROXY !== undefined ? process.env.READER_PROXY : "https://r.jina.ai/";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function maxChars() {
  return Number(process.env.MAX_PAGE_CHARS) || DEFAULT_MAX_CHARS;
}

export async function fetchPageText(url) {
  let direct = null;
  let directErr = null;
  try {
    direct = await fetchDirect(url);
  } catch (e) {
    directErr = e;
  }

  const needReader = (!direct || direct.thin) && READER_PROXY;
  let readerFailed = false;
  if (needReader) {
    // The anonymous reader tier is intermittently rate-limited (403/429). Retry
    // once, then fail fast to the honest "paste the text" fallback — a long wait
    // that still ends in failure is worse UX than offering paste quickly.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const reader = await fetchViaReader(url);
        if (reader && reader.text && (!direct || reader.text.length > direct.text.length)) {
          return reader;
        }
        break; // reader returned but wasn't better than direct
      } catch (e) {
        readerFailed = true;
        if (process.env.HW_DEBUG) console.error(`[reader attempt ${attempt + 1} failed]`, e && e.message);
        if (attempt < 1) await delay(900);
      }
    }
  }

  if (direct) return direct;
  if (readerFailed || needReader) {
    throw new FetchError(
      "We couldn't automatically read that page — it likely blocks automated readers (many hackathon sites do). Use “Paste the text instead” and paste the page’s text."
    );
  }
  throw directErr || new FetchError("Could not read that page.");
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Analyze text the user pasted directly (no fetch). */
export function wrapPastedText(text, sourceUrl) {
  const trimmed = String(text || "").slice(0, maxChars());
  return {
    title: "",
    description: "",
    text: trimmed,
    truncated: String(text || "").length > maxChars(),
    thin: trimmed.replace(/\s+/g, " ").trim().length < 200,
    source: "pasted",
    sourceUrl: sourceUrl || "",
  };
}

async function fetchDirect(url) {
  const res = await timedFetch(url, { headers: BROWSER_HEADERS, redirect: "follow" });
  if (!res.ok) throw new FetchError(`The page returned HTTP ${res.status}.`);
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("html") && !ctype.includes("text")) {
    throw new FetchError("That link is not a readable web page (expected HTML).");
  }
  const raw = await readCapped(res, MAX_BYTES);
  const { title, description, text } = htmlToText(raw);
  const trimmed = text.slice(0, maxChars());
  return {
    title,
    description,
    text: trimmed,
    truncated: text.length > maxChars(),
    thin: trimmed.replace(/\s+/g, " ").trim().length < 400,
    source: "direct",
  };
}

async function fetchViaReader(url) {
  const readerUrl = READER_PROXY + url;
  const res = await timedFetch(readerUrl, {
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/plain", "X-Return-Format": "text" },
    redirect: "follow",
  });
  if (!res.ok) throw new FetchError(`The reader returned HTTP ${res.status}.`);
  const body = await readCapped(res, MAX_BYTES);
  // The reader returns text/markdown already; take a title from the first strong line.
  const clean = body.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
  const firstLine = (clean.split("\n").find((l) => l.trim().length > 3) || "").replace(/^#+\s*/, "").trim();
  const trimmed = clean.slice(0, maxChars());
  return {
    title: firstLine.slice(0, 200),
    description: "",
    text: trimmed,
    truncated: clean.length > maxChars(),
    thin: trimmed.replace(/\s+/g, " ").trim().length < 200,
    source: "reader",
  };
}

async function timedFetch(url, opts) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } catch (e) {
    throw new FetchError(e && e.name === "AbortError" ? "The page took too long to respond." : "Could not reach that URL.");
  } finally {
    clearTimeout(timer);
  }
}

async function readCapped(res, maxBytes) {
  if (!res.body || !res.body.getReader) {
    const t = await res.text();
    return t.slice(0, maxBytes);
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let out = "";
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    out += decoder.decode(value, { stream: true });
    if (bytes >= maxBytes) {
      try { await reader.cancel(); } catch {}
      break;
    }
  }
  return out;
}

function htmlToText(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i);

  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/[ \t\r\f\v]+/g, " ")
    .replace(/\n\s*\n\s*\n+/g, "\n\n")
    .replace(/[ ]*\n[ ]*/g, "\n")
    .trim();

  return {
    title: decodeEntities(titleMatch ? titleMatch[1].trim() : ""),
    description: decodeEntities(descMatch ? descMatch[1].trim() : ""),
    text,
  };
}

function decodeEntities(s) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&quot;/gi, '"');
}

export class FetchError extends Error {}
