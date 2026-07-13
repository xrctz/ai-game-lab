/* ============================================================
   Midnight Watch Lab — inject layer  (v1)
   Scope: games/fnaf/ only.  Prefix: fw-
   Do NOT touch the Vite bundle. This layer only observes the
   DOM the bundle renders and adds its own fw- prefixed nodes.
   Every feature degrades silently if an expected node is gone.
   ============================================================ */
(function () {
  "use strict";

  var PREFIX  = "fw-";
  var LS_BEST = "fw_best_night";
  var LOW_POWER_THRESHOLD = 20;

  /* ── State ── */
  var sessionActive = false;   /* a night is being tracked */
  var nightNum      = 0;
  var nightStart    = 0;       /* Date.now() when HUD appeared */
  var lastPower     = 100;     /* last % read from #power-text */
  var doorLeft      = 0;       /* Q presses this night */
  var doorRight     = 0;       /* E presses this night */
  var sixamShown    = false;   /* #sixam revealed this night */
  var summaryEl     = null;
  var badgeEl       = null;

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function isShown(el) { return !!el && !el.classList.contains("hidden"); }
  function makeEl(tag, id, cls) {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (cls) el.className = cls;
    return el;
  }
  function onClassChange(el, fn) {
    if (!el) return;
    new MutationObserver(fn).observe(el, { attributes: true, attributeFilter: ["class"] });
  }
  function formatDuration(ms) {
    var totalSec = Math.max(0, Math.round(ms / 1000));
    var m = Math.floor(totalSec / 60);
    var s = totalSec % 60;
    return m + ":" + (s < 10 ? "0" : "") + s;
  }

  /* ─────────────────────────────────────────────────────
     1. POWER OBSERVER
     The bundle writes `${n}%` into #power-text. We track
     the latest value and drive the low-power HUD pulse.
     ───────────────────────────────────────────────────── */
  function readPower() {
    var el = $("power-text");
    if (!el) return null;
    var n = parseInt(el.textContent, 10);
    return isNaN(n) ? null : n;
  }

  function watchPower() {
    var el = $("power-text");
    if (!el) return;
    var block = el.closest ? el.closest(".hud-block") : null;
    var apply = function () {
      var p = readPower();
      if (p == null) return;
      lastPower = p;
      if (block) {
        block.classList.toggle(PREFIX + "low-power", sessionActive && p < LOW_POWER_THRESHOLD && p > 0);
      }
    };
    new MutationObserver(apply).observe(el, { childList: true, characterData: true, subtree: true });
    apply();
  }

  /* ─────────────────────────────────────────────────────
     2. DOOR USAGE COUNTERS
     Doors toggle on Q / E (the mobile control shim
     dispatches synthetic KeyboardEvents on document, so
     touch play is counted too).
     ───────────────────────────────────────────────────── */
  function watchDoors() {
    document.addEventListener("keydown", function (e) {
      if (!sessionActive || e.repeat) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT" || t.tagName === "TEXTAREA")) return;
      var k = (e.key || "").toLowerCase();
      if (k === "q") doorLeft++;
      else if (k === "e") doorRight++;
    }, false);
  }

  /* ─────────────────────────────────────────────────────
     3. NIGHT SESSION LIFECYCLE
     Session starts when #hud is revealed (night begins)
     and ends when #sixam or #end-screen appears. Transient
     HUD toggles mid-night do not reset the counters.
     ───────────────────────────────────────────────────── */
  function startSession() {
    if (sessionActive) return;
    sessionActive = true;
    nightStart = Date.now();
    doorLeft = 0;
    doorRight = 0;
    sixamShown = false;
    var p = readPower();
    lastPower = p == null ? 100 : p;
    var hudLabel = $("night-hud");
    var m = hudLabel && /(\d+)/.exec(hudLabel.textContent);
    nightNum = m ? parseInt(m[1], 10) : 0;
  }

  function endSession() {
    sessionActive = false;
    var el = $("power-text");
    var block = el && el.closest ? el.closest(".hud-block") : null;
    if (block) block.classList.remove(PREFIX + "low-power");
  }

  function watchScreens() {
    var hud = $("hud");
    onClassChange(hud, function () {
      if (isShown(hud)) startSession();
    });
    if (isShown(hud)) startSession();

    var sixam = $("sixam");
    onClassChange(sixam, function () {
      if (isShown(sixam) && sessionActive) {
        sixamShown = true;
        recordBest();
      }
    });

    var end = $("end-screen");
    onClassChange(end, function () {
      if (isShown(end)) {
        showSummary();
        endSession();
      }
    });

    var title = $("title-screen");
    onClassChange(title, function () {
      if (isShown(title)) renderBestBadge();
    });
  }

  /* ─────────────────────────────────────────────────────
     4. NIGHT-RESULT SUMMARY CARD
     Injected into the end-screen panel above the buttons.
     ───────────────────────────────────────────────────── */
  function didWin() {
    if (sixamShown) return true;
    var t = $("end-title");
    return !!t && /6\s*AM/i.test(t.textContent);
  }

  function summaryRow(label, value) {
    var row = makeEl("div", null, PREFIX + "sum-row");
    var l = makeEl("span", null, PREFIX + "sum-label");
    l.textContent = label;
    var v = makeEl("span", null, PREFIX + "sum-value");
    v.textContent = value;
    row.appendChild(l);
    row.appendChild(v);
    return row;
  }

  function showSummary() {
    if (!sessionActive && !summaryEl) return; /* end-screen without a tracked night */
    var end = $("end-screen");
    var panel = end && end.querySelector(".panel");
    if (!panel) return;

    if (!summaryEl) {
      summaryEl = makeEl("div", PREFIX + "summary");
      var retry = $("btn-retry");
      if (retry && retry.parentNode === panel) panel.insertBefore(summaryEl, retry);
      else panel.appendChild(summaryEl);
    }
    if (!sessionActive) return; /* keep previous card content */

    var won = didWin();
    summaryEl.innerHTML = "";

    var head = makeEl("div", null, PREFIX + "sum-head");
    head.textContent = "NIGHT REPORT";
    summaryEl.appendChild(head);

    if (nightNum > 0) summaryEl.appendChild(summaryRow("Night", String(nightNum)));
    summaryEl.appendChild(summaryRow("Time on duty", formatDuration(Date.now() - nightStart)));
    summaryEl.appendChild(summaryRow(won ? "Power remaining" : "Power at end", lastPower + "%"));
    summaryEl.appendChild(summaryRow("Power used", Math.max(0, 100 - lastPower) + "%"));
    summaryEl.appendChild(summaryRow("Left door toggles", String(doorLeft)));
    summaryEl.appendChild(summaryRow("Right door toggles", String(doorRight)));

    var best = loadBest();
    if (won && best && best.night === nightNum && best.power === lastPower) {
      var badge = makeEl("div", null, PREFIX + "sum-best");
      badge.textContent = "\u2605 NEW BEST";
      summaryEl.appendChild(badge);
    }
  }

  /* ─────────────────────────────────────────────────────
     5. BEST-NIGHT TRACKING  (localStorage)
     Furthest night survived; ties broken by remaining
     power. Shown as a badge under the title night picker.
     ───────────────────────────────────────────────────── */
  function loadBest() {
    try {
      var raw = localStorage.getItem(LS_BEST);
      if (!raw) return null;
      var b = JSON.parse(raw);
      if (typeof b.night !== "number" || typeof b.power !== "number") return null;
      return b;
    } catch (_) { return null; }
  }

  function recordBest() {
    if (nightNum <= 0) return;
    var best = loadBest();
    var better = !best
      || nightNum > best.night
      || (nightNum === best.night && lastPower > best.power);
    if (!better) return;
    try {
      localStorage.setItem(LS_BEST, JSON.stringify({ night: nightNum, power: lastPower }));
    } catch (_) { /* storage unavailable — feature stays inactive */ }
    renderBestBadge();
  }

  function renderBestBadge() {
    var best = loadBest();
    if (!best) return;
    if (!badgeEl) {
      var title = $("title-screen");
      var select = title && title.querySelector(".night-select");
      if (!select || !select.parentNode) return;
      badgeEl = makeEl("div", PREFIX + "best-badge");
      select.parentNode.insertBefore(badgeEl, select.nextSibling);
    }
    badgeEl.textContent = "\u2605 BEST \u2014 Night " + best.night +
      " cleared \u00B7 " + best.power + "% power left";
  }

  /* ─────────────────────────────────────────────────────
     INIT
     ───────────────────────────────────────────────────── */
  function init() {
    if (!$("app")) return; /* bundle DOM missing — stay inactive */
    watchPower();
    watchDoors();
    watchScreens();
    renderBestBadge();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
