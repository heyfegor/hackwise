// Clearly-labeled SAMPLE brief, returned when no GEMINI_API_KEY is configured.
// Mirrors the sample tab data from the original design. NEVER presented as a real
// analysis of the submitted page — the UI shows a visible "Demo mode" badge.

export function demoBrief(sourceUrl) {
  return {
    meta: {
      name: "Sample AI Hackathon (demo)",
      organizer: "Demo Organizer",
      deadline: "14 days from start",
      deadlineTimezone: null,
      prize: "$25,000",
      sourceUrl,
      confidence: "low",
    },
    requirements: [
      { weight: "HIGH", text: "AI must be central to the experience." },
      { weight: "HIGH", text: "A working prototype is required — not slides." },
      { weight: "HIGH", text: "A demo video ships with the submission." },
      { weight: "BONUS", text: "Using a sponsor API earns extra credit." },
    ],
    judging: [
      { weight: "30%", text: "Technical execution — does it actually work?" },
      { weight: "25%", text: "Innovation — is the approach original?" },
      { weight: "25%", text: "Impact — does it solve a real problem?" },
      { weight: "20%", text: "Presentation — is the demo clear?" },
    ],
    submission: [
      { tag: "REQ", text: "Public repository with a clear README." },
      { tag: "REQ", text: "Demo video under three minutes." },
      { tag: "REQ", text: "Written explanation of the build." },
      { tag: "REQ", text: "Submitted before the 14-day deadline." },
    ],
    mvp: [
      { step: "01", text: "User enters a problem." },
      { step: "02", text: "AI analyzes it." },
      { step: "03", text: "System returns a result." },
      { step: "04", text: "Demo proves the end-to-end workflow." },
    ],
    mvpSummary:
      "Build one AI-powered workflow the user can trigger and see end to end, then prove it in a short demo video.",
    recommendation: {
      bestFitIdea: "A single-purpose AI tool with one clear input and one clear output.",
      justification:
        "It maximizes technical-execution and presentation scores while staying demo-able inside a tight deadline.",
    },
    risks: [
      "This is sample data — connect a GEMINI_API_KEY for a real analysis.",
      "Scope creep: resist adding accounts or dashboards before the core loop works.",
    ],
    notes:
      "Demo mode: no API key configured, so this sample brief was not generated from the submitted page.",
  };
}
