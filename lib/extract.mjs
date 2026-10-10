// Fetch a URL server-side and extract readable text.
// Regex-based (cheerio was the planned extractor but could not be installed here).
// The fetched page is UNTRUSTED input: it is size-capped, reduced to plain text, and
// never interpreted as instructions to the model.

const DEFAULT_MAX_CHARS = 16000;
const FETCH_TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS) || 12000;
const MAX_BYTES = 2_500_000; // ~2.5 MB cap on the downloaded HTML

export async function fetchPageText(url) {
  const maxChars = Number(process.env.MAX_PAGE_CHARS) || DEFAULT_MAX_CHARS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent": "HackwiseBot/0.1 (+hackathon brief generator)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch (e) {
    clearTimeout(timer);
    throw new FetchError(e.name === "AbortError" ? "The page took too long to respond." : "Could not reach that URL.");
  }
  clearTimeout(timer);

  if (!res.ok) throw new FetchError(`The page returned HTTP ${res.status}.`);
  const ctype = res.headers.get("content-type") || "";
  if (!ctype.includes("html") && !ctype.includes("text")) {
    throw new FetchError("That link is not a readable web page (expected HTML).");
  }

  const raw = await readCapped(res, MAX_BYTES);
  const { title, description, text } = htmlToText(raw);
  const trimmed = text.slice(0, maxChars);

  return {
    title,
    description,
    text: trimmed,
    truncated: text.length > maxChars,
    thin: trimmed.replace(/\s+/g, " ").trim().length < 400, // likely JS-rendered / blocked
  };
}

async function readCapped(res, maxBytes) {
  // Stream and stop once we exceed the cap, so a huge page can't blow memory.
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
