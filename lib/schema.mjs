// Hand-rolled validation of the structured brief returned by the model.
// (Zod was the planned validator; it could not be installed in this environment,
//  so this performs the equivalent shape check before anything is displayed.)
//
// VERIFIED facts: meta, requirements, judging, submission (missing -> null / []).
// INFERRED recommendations: mvp, mvpSummary, recommendation, risks (labeled in the UI).
// The model is never allowed to invent facts; unknowns must be null / empty.

const isStr = (v) => typeof v === "string";
const isStrOrNull = (v) => v === null || typeof v === "string";

/** Validate and normalize unknown input into a Brief. Throws on invalid shape. */
export function validateBrief(input, sourceUrl) {
  if (!input || typeof input !== "object") throw new Error("response is not an object");

  const meta = input.meta;
  if (!meta || typeof meta !== "object") throw new Error("meta missing");
  const confidence = ["high", "medium", "low"].includes(meta.confidence) ? meta.confidence : "low";

  const requirements = asArray(input.requirements)
    .map((r) => ({
      weight: r && (r.weight === "HIGH" || r.weight === "BONUS") ? r.weight : "HIGH",
      text: r && isStr(r.text) ? r.text : null,
    }))
    .filter((r) => r.text);

  const judging = asArray(input.judging)
    .map((j) => ({ weight: j && isStr(j.weight) ? j.weight : "—", text: j && isStr(j.text) ? j.text : null }))
    .filter((j) => j.text);

  const submission = asArray(input.submission)
    .map((s) => ({ tag: "REQ", text: s && isStr(s.text) ? s.text : null }))
    .filter((s) => s.text);

  const mvp = asArray(input.mvp)
    .map((m, i) => ({
      step: m && isStr(m.step) ? m.step : String(i + 1).padStart(2, "0"),
      text: m && isStr(m.text) ? m.text : null,
    }))
    .filter((m) => m.text);

  let recommendation = null;
  if (input.recommendation && typeof input.recommendation === "object") {
    const b = input.recommendation.bestFitIdea;
    const j = input.recommendation.justification;
    if (isStr(b) && isStr(j)) recommendation = { bestFitIdea: b, justification: j };
  }

  const risks = asArray(input.risks).filter(isStr);

  const brief = {
    meta: {
      name: isStrOrNull(meta.name) ? meta.name : null,
      organizer: isStrOrNull(meta.organizer) ? meta.organizer : null,
      deadline: isStrOrNull(meta.deadline) ? meta.deadline : null,
      deadlineTimezone: isStrOrNull(meta.deadlineTimezone) ? meta.deadlineTimezone : null,
      prize: isStrOrNull(meta.prize) ? meta.prize : null,
      sourceUrl,
      confidence,
    },
    requirements,
    judging,
    submission,
    mvp,
    mvpSummary: isStr(input.mvpSummary) ? input.mvpSummary : "",
    recommendation,
    risks,
    notes: isStrOrNull(input.notes) ? input.notes : null,
  };

  // Require the minimum that makes a brief meaningful.
  if (!brief.mvpSummary && brief.requirements.length === 0 && brief.judging.length === 0) {
    throw new Error("model returned no usable content");
  }
  return brief;
}

function asArray(v) {
  return Array.isArray(v) ? v : [];
}

/** Looks like an http(s) URL (shared shape check, also used client-side). */
export function isPlausibleUrl(value) {
  const v = (value || "").trim();
  if (!v) return false;
  try {
    const u = new URL(v);
    return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.includes(".");
  } catch {
    return false;
  }
}
