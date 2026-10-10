/* Hackwise UI logic — vanilla JS, no framework. */
(function () {
  "use strict";

  var LIME = "#B8F23A", MUTED = "#9a9a94";

  var state = {
    url: "",
    phase: "idle", // idle | analyzing | brief | error
    tab: "requirements",
    focused: false,
    menuOpen: false,
    brief: null, // BriefResponse when phase === 'brief'
    error: null, // { code, message }
    doneCount: 0,
  };
  var timers = [];

  // Sample brief shown at idle (mirrors the design's sample tab data).
  var SAMPLE = {
    meta: { deadline: "14 days", prize: "$25,000", confidence: "low", sourceUrl: "" },
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
    mvpSummary: "",
    recommendation: null,
    risks: [],
    notes: null,
    _meta: { mode: "sample", model: null },
  };

  var STAGES = [
    "Reading requirements",
    "Analyzing judging criteria",
    "Checking submission rules",
    "Determining MVP scope",
  ];
  var STAGE_DONE = [
    "Requirements found",
    "Judging criteria mapped",
    "Submission rules parsed",
    "MVP scope ready",
  ];
  var TABS = [
    { id: "requirements", label: "Requirements" },
    { id: "judging", label: "Judging" },
    { id: "mvp", label: "MVP" },
    { id: "submission", label: "Submission" },
  ];

  // ---------- helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function isPlausibleUrl(v) {
    v = (v || "").trim();
    if (!v) return false;
    try { var u = new URL(v); return (u.protocol === "http:" || u.protocol === "https:") && u.hostname.indexOf(".") !== -1; }
    catch (e) { return false; }
  }
  function clearTimers() { timers.forEach(clearTimeout); timers = []; }

  function current() { return state.phase === "brief" && state.brief ? state.brief : SAMPLE; }

  function rowsFor(tab, b) {
    if (tab === "requirements") {
      if (!b.requirements.length) return [{ tag: "—", color: MUTED, text: "No explicit requirements found on the page." }];
      return b.requirements.map(function (r) { return { tag: r.weight, color: r.weight === "HIGH" ? LIME : MUTED, text: r.text }; });
    }
    if (tab === "judging") {
      if (!b.judging.length) return [{ tag: "—", color: MUTED, text: "No judging criteria found on the page." }];
      var nums = b.judging.map(function (j) { return parseFloat(String(j.weight).replace(/[^0-9.]/g, "")) || 0; });
      var max = Math.max.apply(null, nums);
      return b.judging.map(function (j, i) { return { tag: j.weight || "—", color: nums[i] === max && max > 0 ? LIME : MUTED, text: j.text }; });
    }
    if (tab === "mvp") {
      if (!b.mvp.length) return [{ tag: "—", color: MUTED, text: "No MVP steps generated." }];
      return b.mvp.map(function (m) { return { tag: m.step, color: LIME, text: m.text }; });
    }
    if (!b.submission.length) return [{ tag: "—", color: MUTED, text: "No submission requirements found on the page." }];
    return b.submission.map(function (s) { return { tag: s.tag, color: LIME, text: s.text }; });
  }

  function briefToText(b) {
    var L = [];
    L.push("HACKWISE BRIEF" + (b._meta && b._meta.mode === "demo" ? " (DEMO MODE — sample data, not a real analysis)" : ""));
    L.push("Source: " + (b.meta.sourceUrl || ""));
    L.push("Confidence: " + b.meta.confidence);
    L.push("");
    L.push("— VERIFIED FROM THE PAGE —");
    L.push("Competition: " + (b.meta.name || "unknown"));
    L.push("Organizer: " + (b.meta.organizer || "unknown"));
    L.push("Deadline: " + (b.meta.deadline || "unknown") + (b.meta.deadlineTimezone ? " (" + b.meta.deadlineTimezone + ")" : ""));
    L.push("Prize: " + (b.meta.prize || "unknown"));
    L.push("");
    L.push("Requirements:");
    (b.requirements.length ? b.requirements : [{ weight: "—", text: "none found" }]).forEach(function (r) { L.push("  [" + r.weight + "] " + r.text); });
    L.push("Judging:");
    (b.judging.length ? b.judging : [{ weight: "—", text: "none found" }]).forEach(function (j) { L.push("  [" + j.weight + "] " + j.text); });
    L.push("Submission:");
    (b.submission.length ? b.submission : [{ tag: "—", text: "none found" }]).forEach(function (s) { L.push("  [" + s.tag + "] " + s.text); });
    L.push("");
    L.push("— RECOMMENDED (inferred, not from the page) —");
    L.push("MVP summary: " + b.mvpSummary);
    L.push("MVP build order:");
    b.mvp.forEach(function (m) { L.push("  " + m.step + ". " + m.text); });
    if (b.recommendation) { L.push("Best-fit idea: " + b.recommendation.bestFitIdea); L.push("Why: " + b.recommendation.justification); }
    if (b.risks && b.risks.length) { L.push("Risks / unknowns:"); b.risks.forEach(function (r) { L.push("  - " + r); }); }
    if (b.notes) L.push("Notes: " + b.notes);
    return L.join("\n");
  }

  // ---------- rendering ----------
  function renderLeft() {
    var b = current();
    var live = state.phase === "brief" && state.brief;
    $("hw-lede").textContent = live
      ? "What Hackwise pulled out of the page. Facts are read from the page; the MVP plan is a recommendation."
      : "A sample analysis of how this works. Switch between what Hackwise pulled out of the page.";

    var metrics =
      '<div><div class="mono-label">DEADLINE</div><div class="metric-val lime">' + esc(b.meta.deadline || "unknown") + "</div></div>" +
      '<div><div class="mono-label">PRIZE</div><div class="metric-val">' + esc(b.meta.prize || "unknown") + "</div></div>";
    if (live) metrics += '<div><div class="mono-label">CONFIDENCE</div><div class="metric-val" style="text-transform:uppercase;">' + esc(b.meta.confidence) + "</div></div>";
    $("hw-metrics").innerHTML = metrics;

    if (live && (b.mvpSummary || b.notes)) {
      $("hw-mvpbox").innerHTML =
        '<div class="mvp-box"><div class="mono-label">RECOMMENDED MVP (INFERRED)</div>' +
        (b.mvpSummary ? "<p>" + esc(b.mvpSummary) + "</p>" : "") +
        (b.notes ? '<p class="note">' + esc(b.notes) + "</p>" : "") +
        "</div>";
    } else {
      $("hw-mvpbox").innerHTML = "";
    }
  }

  function renderRight() {
    var el = $("hw-panel-right");
    if (state.phase === "error" && state.error) {
      el.innerHTML =
        '<div class="err-card"><div class="code">ANALYSIS FAILED · ' + esc(state.error.code) + "</div>" +
        "<p>" + esc(state.error.message) + "</p>" +
        '<button class="pill-lime" id="hw-retry">Try again</button></div>';
      $("hw-retry").addEventListener("click", analyze);
      return;
    }
    if (state.phase === "analyzing") {
      var html = '<div class="mono-label" style="margin-bottom:20px;">ANALYZING…</div>';
      for (var i = 0; i < STAGES.length; i++) {
        var done = i < state.doneCount, active = i === state.doneCount;
        var markStyle = done
          ? "background:" + LIME + ";"
          : active
          ? "border:2px solid " + LIME + ";border-top-color:transparent;animation:hw-spin .7s linear infinite;"
          : "border:1.5px solid rgba(255,255,255,.16);";
        html +=
          '<div class="stage" style="opacity:' + (done || active ? 1 : 0.42) + ';">' +
          '<span class="mark" style="' + markStyle + '">' + (done ? "✓" : "") + "</span>" +
          '<span class="lbl" style="color:' + (done || active ? "#FBFAF7" : "#8a8a84") + ';">' +
          esc(done ? STAGE_DONE[i] : active ? STAGES[i] + "…" : STAGES[i]) + "</span></div>";
      }
      el.innerHTML = html;
      return;
    }

    // idle (sample) or brief
    var b = current();
    var live = state.phase === "brief" && state.brief;
    var isDemo = live && b._meta && b._meta.mode === "demo";
    var toolbar = "";
    if (live) {
      toolbar =
        '<div class="toolbar">' +
        (isDemo ? '<span class="badge-demo">DEMO MODE</span>' : "") +
        '<button class="copy-btn" id="hw-copy">COPY BRIEF</button></div>';
    }
    var tabsHtml = '<div class="tabs">';
    TABS.forEach(function (t) {
      tabsHtml += '<button class="tab' + (t.id === state.tab ? " active" : "") + '" data-tab="' + t.id + '">' + t.label + "</button>";
    });
    tabsHtml += "</div>";

    var rows = rowsFor(state.tab, b).map(function (r) {
      return '<div class="brief-row"><span class="tag" style="color:' + r.color + ';">' + esc(r.tag) + '</span><span class="txt">' + esc(r.text) + "</span></div>";
    }).join("");

    el.innerHTML = toolbar + tabsHtml + rows + '<div class="row-cap"></div>';

    Array.prototype.forEach.call(el.querySelectorAll("[data-tab]"), function (btn) {
      btn.addEventListener("click", function () { state.tab = btn.getAttribute("data-tab"); renderRight(); });
    });
    var copyBtn = $("hw-copy");
    if (copyBtn) copyBtn.addEventListener("click", function () { doCopy(copyBtn); });
  }

  function render() { renderLeft(); renderRight(); }

  function doCopy(btn) {
    var text = briefToText(current());
    var done = function () { btn.textContent = "COPIED ✓"; setTimeout(function () { btn.textContent = "COPY BRIEF"; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    } else { fallbackCopy(text, done); }
  }
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta);
      done();
    } catch (e) { /* ignore */ }
  }

  // ---------- behavior ----------
  function focusInput() {
    state.menuOpen = false; syncMenu();
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () { var t = $("hw-url"); if (t) t.focus(); }, 440);
  }

  function setInlineError(msg) { $("hw-inline-err").textContent = msg || ""; }

  function analyze() {
    clearTimers();
    state.menuOpen = false; syncMenu();
    if (!isPlausibleUrl(state.url)) {
      setInlineError("Enter a valid hackathon URL (https://…)");
      return;
    }
    setInlineError("");
    state.phase = "analyzing";
    state.doneCount = 0;
    state.error = null;
    $("hw-send").disabled = true;
    render();

    // Reading animation (visual progress while the request runs).
    for (var i = 1; i <= STAGES.length; i++) {
      (function (n) { timers.push(setTimeout(function () { if (state.phase === "analyzing") { state.doneCount = n; renderRight(); } }, 480 * n)); })(i);
    }

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: state.url.trim() }),
    })
      .then(function (res) { return res.json().then(function (data) { return { ok: res.ok, data: data }; }); })
      .then(function (r) {
        clearTimers();
        $("hw-send").disabled = false;
        if (r.data && r.data.ok) {
          state.brief = r.data.brief;
          state.phase = "brief";
          state.tab = "requirements";
          render();
          $("preview").scrollIntoView({ behavior: "smooth", block: "start" });
        } else {
          state.error = (r.data && r.data.error) || { code: "SERVER_ERROR", message: "Something went wrong." };
          state.phase = "error";
          render();
          $("preview").scrollIntoView({ behavior: "smooth", block: "start" });
        }
      })
      .catch(function () {
        clearTimers();
        $("hw-send").disabled = false;
        state.error = { code: "NETWORK", message: "Couldn't reach the server. Check your connection and try again." };
        state.phase = "error";
        render();
      });
  }

  function syncMenu() {
    var menu = $("hw-mobile-menu"), ham = $("hw-hamburger");
    if (menu) menu.classList.toggle("open", state.menuOpen);
    if (ham) ham.setAttribute("aria-expanded", String(state.menuOpen));
  }

  // ---------- wire up ----------
  function init() {
    var ta = $("hw-url"), composer = $("hw-composer"), send = $("hw-send");
    ta.addEventListener("input", function () { state.url = ta.value; if ($("hw-inline-err").textContent) setInlineError(""); });
    ta.addEventListener("focus", function () { state.focused = true; composer.classList.add("focused"); });
    ta.addEventListener("blur", function () { state.focused = false; composer.classList.remove("focused"); });
    ta.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); analyze(); }
    });
    send.addEventListener("click", analyze);

    $("hw-hamburger").addEventListener("click", function () { state.menuOpen = !state.menuOpen; syncMenu(); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-analyze]"), function (btn) {
      btn.addEventListener("click", focusInput);
    });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (a) {
      a.addEventListener("click", function () { state.menuOpen = false; syncMenu(); });
    });

    render();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
