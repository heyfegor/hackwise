// Hackwise server — zero external dependencies (Node >= 18 built-ins only).
// Serves the static UI from public/ and exposes POST /api/analyze.
// The GEMINI_API_KEY is read server-side only and never sent to the browser.

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { join, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

import { isPlausibleUrl } from "./lib/schema.mjs";
import { fetchPageText, wrapPastedText, FetchError } from "./lib/extract.mjs";
import { analyzeWithGemini, ModelError } from "./lib/gemini.mjs";
import { demoBrief } from "./lib/demoBrief.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const MAX_BODY = 256 * 1024; // request body cap (allows pasted page text)

// ---- Minimal .env loader (no dotenv dependency) ----
loadEnvFile(join(__dirname, ".env.local"));
loadEnvFile(join(__dirname, ".env"));

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  try {
    for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let val = m[2];
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
  } catch {
    /* ignore */
  }
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url === "/api/analyze") {
      return await handleAnalyze(req, res);
    }
    if (req.method === "GET" || req.method === "HEAD") {
      return await serveStatic(req, res);
    }
    sendJson(res, 405, { ok: false, error: { code: "SERVER_ERROR", message: "Method not allowed." } });
  } catch (err) {
    console.error("Unhandled error:", err);
    sendJson(res, 500, { ok: false, error: { code: "SERVER_ERROR", message: "Something went wrong on the server." } });
  }
});

async function serveStatic(req, res) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  let rel = urlPath === "/" ? "/index.html" : urlPath;
  // Prevent path traversal.
  const safe = normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(PUBLIC_DIR, safe);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403); res.end("Forbidden"); return;
  }
  try {
    const s = await stat(filePath);
    if (s.isDirectory()) throw new Error("dir");
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(req.method === "HEAD" ? undefined : data);
  } catch {
    // SPA fallback: extensionless client routes (e.g. /analyze) serve the app shell.
    if (!extname(safe)) {
      try {
        const data = await readFile(join(PUBLIC_DIR, "index.html"));
        res.writeHead(200, { "Content-Type": MIME[".html"] });
        res.end(req.method === "HEAD" ? undefined : data);
        return;
      } catch {
        /* fall through to 404 */
      }
    }
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end("<h1>404 — Not found</h1>");
  }
}

async function handleAnalyze(req, res) {
  const body = await readBody(req);
  if (body === null) {
    return sendJson(res, 413, { ok: false, error: { code: "SERVER_ERROR", message: "Request too large." } });
  }
  let url, text;
  try {
    const parsed = JSON.parse(body);
    url = parsed.url;
    text = typeof parsed.text === "string" ? parsed.text.trim() : "";
  } catch {
    return sendJson(res, 400, { ok: false, error: { code: "INVALID_URL", message: "Malformed request body." } });
  }

  const hasText = text && text.length >= 40;
  const hasUrl = isPlausibleUrl(url);
  if (!hasText && !hasUrl) {
    return sendJson(res, 400, { ok: false, error: { code: "INVALID_URL", message: "Enter a valid hackathon URL (https://…), or paste the page text." } });
  }
  const sourceUrl = hasUrl ? String(url).trim() : "Pasted text";

  // No key -> clearly-labeled demo mode.
  if (!process.env.GEMINI_API_KEY) {
    const brief = { ...demoBrief(sourceUrl), _meta: { mode: "demo", model: null } };
    return sendJson(res, 200, { ok: true, mode: "demo", brief });
  }

  // Live analysis: (fetch | pasted text) -> extract -> model -> validate.
  try {
    const page = hasText ? wrapPastedText(text, hasUrl ? String(url).trim() : "") : await fetchPageText(sourceUrl);
    const { brief, model } = await analyzeWithGemini(page, sourceUrl);
    return sendJson(res, 200, { ok: true, mode: "live", brief: { ...brief, _meta: { mode: "live", model } } });
  } catch (err) {
    if (err instanceof FetchError) {
      return sendJson(res, 502, { ok: false, error: { code: "FETCH_FAILED", message: err.message } });
    }
    if (err instanceof ModelError) {
      const status = err.code === "RATE_LIMIT" ? 429 : err.code === "BAD_MODEL_OUTPUT" ? 502 : 502;
      return sendJson(res, status, { ok: false, error: { code: err.code === "BAD_MODEL_OUTPUT" ? "BAD_MODEL_OUTPUT" : "MODEL_ERROR", message: err.message } });
    }
    console.error("analyze error:", err);
    return sendJson(res, 500, { ok: false, error: { code: "SERVER_ERROR", message: "Unexpected error during analysis." } });
  }
}

function readBody(req) {
  return new Promise((resolve) => {
    let data = "";
    let tooBig = false;
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > MAX_BODY) { tooBig = true; req.destroy(); }
    });
    req.on("end", () => resolve(tooBig ? null : data));
    req.on("error", () => resolve(tooBig ? null : data));
  });
}

function sendJson(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(payload);
}

server.listen(PORT, () => {
  const mode = process.env.GEMINI_API_KEY ? "LIVE (GEMINI_API_KEY detected)" : "DEMO (no GEMINI_API_KEY — labeled sample briefs)";
  console.log(`Hackwise running at http://localhost:${PORT}  —  analysis mode: ${mode}`);
});
