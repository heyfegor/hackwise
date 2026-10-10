/* Hackwise UI logic — vanilla JS, no framework.
   Two screens: the landing page (#landing, with a static sample showcase) and a
   separate results screen (#results-screen) shown after a URL is analyzed. The
   browser Back button and the on-screen Back button both return to the landing. */
(function () {
  "use strict";

  var LIME = "#B8F23A", MUTED = "#9a9a94";

  // Live analysis state (results screen).
  var res = { phase: "idle", tab: "requirements", brief: null, error: null, doneCount: 0, url: "" };
  var sampleTab = "requirements";
  var timers = [];

  // Sample brief shown in the landing's "Preview" showcase (mirrors the design).
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
    mvpSummary: "", recommendation: null, risks: [], notes: null,
    _meta: { mode: "sample", model: null },
  };

  var STAGES = ["Reading requirements", "Analyzing judging criteria", "Checking submission rules", "Determining MVP scope"];
  var STAGE_DONE = ["Requirements found", "Judging criteria mapped", "Submission rules parsed", "MVP scope ready"];
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

  function tabsHtml(activeId) {
    var h = '<div class="tabs">';
    TABS.forEach(function (t) { h += '<button class="tab' + (t.id === activeId ? " active" : "") + '" data-tab="' + t.id + '">' + t.label + "</button>"; });
    return h + "</div>";
  }
  function rowsHtml(tab, b) {
    return rowsFor(tab, b).map(function (r) {
      return '<div class="brief-row"><span class="tag" style="color:' + r.color + ';">' + esc(r.tag) + '</span><span class="txt">' + esc(r.text) + "</span></div>";
    }).join("") + '<div class="row-cap"></div>';
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
  function doCopy(btn, b) {
    var text = briefToText(b);
    var done = function () { btn.textContent = "COPIED ✓"; setTimeout(function () { btn.textContent = "COPY BRIEF"; }, 2000); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text, done); });
    else fallbackCopy(text, done);
  }
  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); done();
    } catch (e) {}
  }

  // ---------- landing sample showcase ----------
  function renderSample() {
    var b = SAMPLE;
    $("hw-lede").textContent = "A sample analysis of how this works. Switch between what Hackwise pulled out of the page.";
    $("hw-metrics").innerHTML =
      '<div><div class="mono-label">DEADLINE</div><div class="metric-val lime">' + esc(b.meta.deadline) + "</div></div>" +
      '<div><div class="mono-label">PRIZE</div><div class="metric-val">' + esc(b.meta.prize) + "</div></div>";
    $("hw-mvpbox").innerHTML = "";
    var el = $("hw-panel-right");
    el.innerHTML = tabsHtml(sampleTab) + rowsHtml(sampleTab, b);
    Array.prototype.forEach.call(el.querySelectorAll("[data-tab]"), function (btn) {
      btn.addEventListener("click", function () { sampleTab = btn.getAttribute("data-tab"); renderSample(); });
    });
  }

  // ---------- results screen ----------
  function renderResults() {
    var b = res.brief;
    $("res-url").textContent = res.url;
    $("res-url").title = res.url;

    if (res.phase === "analyzing") {
      $("res-title").textContent = "Reading the hackathon…";
      $("res-lede").textContent = "Hackwise is pulling out what matters. This takes a few seconds.";
      $("res-metrics").innerHTML = "";
      $("res-mvpbox").innerHTML = "";
      var h = '<div class="mono-label" style="margin-bottom:20px;">ANALYZING…</div>';
      for (var i = 0; i < STAGES.length; i++) {
        var done = i < res.doneCount, active = i === res.doneCount;
        var markStyle = done ? "background:" + LIME + ";" : active ? "border:2px solid " + LIME + ";border-top-color:transparent;animation:hw-spin .7s linear infinite;" : "border:1.5px solid rgba(255,255,255,.16);";
        h += '<div class="stage" style="opacity:' + (done || active ? 1 : 0.42) + ';"><span class="mark" style="' + markStyle + '">' + (done ? "✓" : "") + "</span>" +
             '<span class="lbl" style="color:' + (done || active ? "#FBFAF7" : "#8a8a84") + ';">' + esc(done ? STAGE_DONE[i] : active ? STAGES[i] + "…" : STAGES[i]) + "</span></div>";
      }
      $("res-panel-right").innerHTML = h;
      return;
    }

    if (res.phase === "error") {
      $("res-title").textContent = "That didn't work.";
      $("res-lede").textContent = "Hackwise couldn't finish this analysis. You can head back and try another URL.";
      $("res-metrics").innerHTML = "";
      $("res-mvpbox").innerHTML = "";
      $("res-panel-right").innerHTML =
        '<div class="err-card"><div class="code">ANALYSIS FAILED · ' + esc(res.error.code) + "</div><p>" + esc(res.error.message) + "</p>" +
        '<button class="pill-lime" id="res-retry">Try again</button></div>';
      $("res-retry").addEventListener("click", function () { runAnalysis(res.url); });
      return;
    }

    // brief
    var isDemo = b._meta && b._meta.mode === "demo";
    $("res-title").textContent = "Your hackathon brief";
    $("res-lede").textContent = "What Hackwise pulled out of the page. Facts are read from the page; the MVP plan is a recommendation.";
    var metrics =
      '<div><div class="mono-label">DEADLINE</div><div class="metric-val lime">' + esc(b.meta.deadline || "unknown") + "</div></div>" +
      '<div><div class="mono-label">PRIZE</div><div class="metric-val">' + esc(b.meta.prize || "unknown") + "</div></div>" +
      '<div><div class="mono-label">CONFIDENCE</div><div class="metric-val" style="text-transform:uppercase;">' + esc(b.meta.confidence) + "</div></div>";
    $("res-metrics").innerHTML = metrics;
    $("res-mvpbox").innerHTML =
      (b.mvpSummary || b.notes)
        ? '<div class="mvp-box"><div class="mono-label">RECOMMENDED MVP (INFERRED)</div>' +
          (b.mvpSummary ? "<p>" + esc(b.mvpSummary) + "</p>" : "") +
          (b.notes ? '<p class="note">' + esc(b.notes) + "</p>" : "") + "</div>"
        : "";

    var toolbar = '<div class="toolbar">' + (isDemo ? '<span class="badge-demo">DEMO MODE</span>' : "") + '<button class="copy-btn" id="res-copy">COPY BRIEF</button></div>';
    var el = $("res-panel-right");
    el.innerHTML = toolbar + tabsHtml(res.tab) + rowsHtml(res.tab, b);
    Array.prototype.forEach.call(el.querySelectorAll("[data-tab]"), function (btn) {
      btn.addEventListener("click", function () { res.tab = btn.getAttribute("data-tab"); renderResults(); });
    });
    $("res-copy").addEventListener("click", function () { doCopy($("res-copy"), b); });
  }

  // ---------- navigation between screens ----------
  function showResults() { $("landing").hidden = true; $("results-screen").hidden = false; window.scrollTo(0, 0); var rb = $("res-back"); if (rb) rb.focus(); }
  function showLanding() { $("results-screen").hidden = true; $("landing").hidden = false; }

  function goResults() {
    try { history.pushState({ screen: "results" }, "", "/analyze"); } catch (e) {}
    showResults();
  }
  function goBackToLanding() {
    // Prefer real history back so the entry is popped; fall back to a push.
    if (location.pathname === "/analyze" && history.state && history.state.screen === "results") history.back();
    else { try { history.pushState({ screen: "landing" }, "", "/"); } catch (e) {} showLanding(); }
  }

  window.addEventListener("popstate", function () {
    if (location.pathname === "/analyze" && res.phase !== "idle") showResults();
    else showLanding();
  });

  // ---------- behavior ----------
  function focusInput() {
    setMenu(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(function () { var t = $("hw-url"); if (t) t.focus(); }, 440);
  }
  function setInlineError(msg) { $("hw-inline-err").textContent = msg || ""; }

  function submit() {
    setMenu(false);
    var url = ($("hw-url").value || "").trim();
    if (!isPlausibleUrl(url)) { setInlineError("Enter a valid hackathon URL (https://…)"); return; }
    setInlineError("");
    goResults();
    runAnalysis(url);
  }

  function runAnalysis(url) {
    clearTimers();
    res.url = url; res.phase = "analyzing"; res.doneCount = 0; res.error = null; res.brief = null; res.tab = "requirements";
    renderResults();
    for (var i = 1; i <= STAGES.length; i++) {
      (function (n) { timers.push(setTimeout(function () { if (res.phase === "analyzing") { res.doneCount = n; renderResults(); } }, 480 * n)); })(i);
    }
    fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url }) })
      .then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); })
      .then(function (r) {
        clearTimers();
        if (r.data && r.data.ok) { res.brief = r.data.brief; res.phase = "brief"; res.tab = "requirements"; }
        else { res.error = (r.data && r.data.error) || { code: "SERVER_ERROR", message: "Something went wrong." }; res.phase = "error"; }
        renderResults();
      })
      .catch(function () {
        clearTimers();
        res.error = { code: "NETWORK", message: "Couldn't reach the server. Check your connection and try again." };
        res.phase = "error"; renderResults();
      });
  }

  function setMenu(open) {
    var menu = $("hw-mobile-menu"), ham = $("hw-hamburger");
    if (menu) menu.classList.toggle("open", open);
    if (ham) ham.setAttribute("aria-expanded", String(open));
  }

  // ---------- wire up ----------
  function init() {
    // A fresh load / reload of /analyze has no analysis in memory -> start on the landing.
    if (location.pathname === "/analyze") { try { history.replaceState({ screen: "landing" }, "", "/"); } catch (e) {} }
    showLanding();

    var ta = $("hw-url"), composer = $("hw-composer");
    ta.addEventListener("input", function () { if ($("hw-inline-err").textContent) setInlineError(""); });
    ta.addEventListener("focus", function () { composer.classList.add("focused"); });
    ta.addEventListener("blur", function () { composer.classList.remove("focused"); });
    ta.addEventListener("keydown", function (e) { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } });
    $("hw-send").addEventListener("click", submit);

    $("hw-hamburger").addEventListener("click", function () { setMenu(!$("hw-mobile-menu").classList.contains("open")); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-analyze]"), function (btn) { btn.addEventListener("click", focusInput); });
    Array.prototype.forEach.call(document.querySelectorAll("[data-close]"), function (a) { a.addEventListener("click", function () { setMenu(false); }); });

    // Results-screen back controls.
    $("res-back").addEventListener("click", goBackToLanding);
    Array.prototype.forEach.call(document.querySelectorAll("[data-back]"), function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); goBackToLanding(); });
    });

    renderSample();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
