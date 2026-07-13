/* ============================================================
   CraftVerse Lab — inject layer  (v4 — stats, screenshot, cheatsheet)
   Scope: games/voxel/ only.  Prefix: cv-lab-
   Do NOT touch the Vite bundle.
   ============================================================ */
(function () {
  "use strict";

  /* ── Constants ── */
  var PREFIX     = "cv-lab-";
  var FULL_PATH  = "/ai-game-lab/games/voxel/index.html";
  var IS_EMBED   = (function () {
    try { return new URLSearchParams(location.search).get("embed") === "1" || window !== window.top; }
    catch (_) { return false; }
  })();
  var IS_MOBILE  = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
  window.__craftverseLabVersion = "v4";

  /* ── State ── */
  var clickOverlay  = null;
  var lockMsg       = null;
  var lockMsgTimer  = null;
  var canvas        = null;
  var inWorld       = false;
  var statsEl       = null;
  var statsTimeEl   = null;
  var statsFpsEl    = null;
  var statsVisible  = false;
  var playSeconds   = 0;
  var frameCount    = 0;
  var lastRafStamp  = -1;
  var lastFpsCheck  = 0;
  var shotPending   = false;
  var shotFallback  = null;
  var cheatsheetEl  = null;
  var toastEl       = null;
  var toastTimer    = null;

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function makeEl(tag, id, cls) {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (cls) el.className = cls;
    return el;
  }

  /* ─────────────────────────────────────────────────────
     1. EMBED BODY CLASS
     ───────────────────────────────────────────────────── */
  if (IS_EMBED) {
    document.body.classList.add("cv-embedded");
  }

  /* ─────────────────────────────────────────────────────
     2. CANVAS RESOLVER
     Finds the Three.js renderer canvas inside #app
     and sets tabIndex so it can receive focus.
     ───────────────────────────────────────────────────── */
  function resolveCanvas() {
    if (canvas && canvas.isConnected) return canvas;
    var app = $("app");
    if (app) {
      canvas = app.querySelector("canvas");
      if (canvas) {
        canvas.tabIndex = 0;
        canvas.style.outline = "none";
      }
    }
    return canvas;
  }

  function watchCanvasInsertion() {
    var app = $("app");
    if (!app) return;
    var obs = new MutationObserver(function () {
      if (resolveCanvas()) obs.disconnect();
    });
    obs.observe(app, { childList: true });
    resolveCanvas();
  }

  /* ─────────────────────────────────────────────────────
     3. FOCUS + LOCK  (single authoritative function)
     requestPointerLock() requires a TRUSTED user gesture.
     We cannot dispatch a synthetic click — isTrusted=false
     blocks pointer lock in all modern browsers.
     Instead, the overlay uses pointer-events:none so the
     user's real click reaches the canvas, and the bundle's
     own listener fires yn.domElement.requestPointerLock().
     This function is used by the postMessage bridge only
     (hub parent requesting focus, not lock).
     ───────────────────────────────────────────────────── */
  function focusCanvas() {
    var c = resolveCanvas();
    if (!c) return;
    c.focus();
  }

  /* Export bridge for hub parent */
  window.__craftverseLab = {
    focusCanvas: focusCanvas,
    isEmbed: IS_EMBED
  };

  /* ─────────────────────────────────────────────────────
     4. IN-WORLD DETECTION
     We are "in world" when title-screen is hidden
     and pause/death/settings are also hidden.
     ───────────────────────────────────────────────────── */
  function updateInWorld() {
    var title    = $("title-screen");
    var pause    = $("pause-screen");
    var death    = $("death-screen");
    var settings = $("settings-screen");

    var wasInWorld = inWorld;
    inWorld = title && title.classList.contains("hidden")
           && (!pause    || pause.classList.contains("hidden"))
           && (!death    || death.classList.contains("hidden"))
           && (!settings || settings.classList.contains("hidden"));

    if (inWorld && !wasInWorld) {
      showClickOverlay();
    }
    if (!inWorld && wasInWorld) {
      hideClickOverlay();
    }
  }

  function watchScreens() {
    ["title-screen", "pause-screen", "death-screen", "settings-screen"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      new MutationObserver(updateInWorld).observe(el, { attributes: true, attributeFilter: ["class"] });
    });
    updateInWorld();
  }

  /* ─────────────────────────────────────────────────────
     5. CLICK-TO-PLAY OVERLAY  (in-world + embed only)
     ───────────────────────────────────────────────────── */
  function createClickOverlay() {
    clickOverlay = makeEl("div", PREFIX + "click-overlay");

    var icon  = makeEl("div", null, PREFIX + "overlay-icon");
    icon.textContent = "\u{1F3AE}";
    var title = makeEl("div", null, PREFIX + "overlay-title");
    title.textContent = "Click to capture mouse";
    var sub   = makeEl("div", null, PREFIX + "overlay-sub");
    sub.textContent = "Look controls need pointer lock. Press Esc to release. WASD move · Space jump · E inventory.";

    clickOverlay.appendChild(icon);
    clickOverlay.appendChild(title);
    clickOverlay.appendChild(sub);

    if (IS_EMBED) {
      var link = makeEl("a", PREFIX + "open-tab", PREFIX + "open-tab");
      link.href = FULL_PATH;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open full screen \u2197";
      link.style.pointerEvents = "auto";
      clickOverlay.appendChild(link);
    }

    /* Overlay is pointer-events:none in CSS when in-world.
       No click handler needed — user's real click passes through
       to the canvas, where the bundle's own listener fires
       yn.domElement.requestPointerLock().  This is the only way
       to get a TRUSTED user gesture for pointer lock. */

    /* Start hidden — updateInWorld() will show it when in-world */
    clickOverlay.classList.add(PREFIX + "hidden");
    document.body.appendChild(clickOverlay);
  }

  function showClickOverlay() {
    if (!clickOverlay) return;
    clickOverlay.classList.remove(PREFIX + "hidden");
  }
  function hideClickOverlay() {
    if (!clickOverlay) return;
    clickOverlay.classList.add(PREFIX + "hidden");
  }

  /* ─────────────────────────────────────────────────────
     6. POINTER-LOCK EVENTS
     ───────────────────────────────────────────────────── */
  function onPointerLockChange() {
    var locked = document.pointerLockElement != null;
    if (locked) {
      hideClickOverlay();
    } else if (inWorld) {
      showClickOverlay();
    }
  }

  function onPointerLockError() {
    if (inWorld) showClickOverlay();
    flashLockMsg(5000);
  }

  /* ─────────────────────────────────────────────────────
     7. LOCK MESSAGE
     ───────────────────────────────────────────────────── */
  function createLockMsg() {
    lockMsg = makeEl("div", PREFIX + "lock-msg");
    lockMsg.innerHTML =
      "Mouse captured — <b>Esc</b> to release. " +
      "If stuck, <a href=\"" + FULL_PATH + "\" target=\"_blank\" rel=\"noopener\">open full screen ↗</a>";
    document.body.appendChild(lockMsg);
  }

  function flashLockMsg(ms) {
    if (!lockMsg) return;
    clearTimeout(lockMsgTimer);
    lockMsg.classList.add(PREFIX + "visible");
    lockMsgTimer = setTimeout(function () {
      lockMsg.classList.remove(PREFIX + "visible");
    }, ms || 4000);
  }

  /* ─────────────────────────────────────────────────────
     8. MOBILE BANNER
     ───────────────────────────────────────────────────── */
  function createMobileBanner() {
    if (!IS_MOBILE) return;
    var banner = makeEl("div", PREFIX + "mobile-banner");
    var icon = makeEl("span", null, PREFIX + "mob-icon");
    icon.textContent = "\u{1F5A5}️";
    banner.appendChild(icon);
    banner.appendChild(document.createTextNode(
      " CraftVerse on mobile — use the on-screen joystick and look zone."
    ));
    document.body.appendChild(banner);
    if (IS_EMBED) banner.classList.add(PREFIX + "show-mobile");
  }

  /* ─────────────────────────────────────────────────────
     9. BRANDING BADGE
     ───────────────────────────────────────────────────── */
  function createBrandBadge() {
    var badge = makeEl("div", PREFIX + "brand");
    badge.textContent = IS_EMBED ? "CraftVerse · hub embed" : "CraftVerse Engine";
    document.body.appendChild(badge);
  }

  function preferReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  /* ─────────────────────────────────────────────────────
     10. HUB POSTMESSAGE LISTENER
     ───────────────────────────────────────────────────── */
  function onParentMessage(e) {
    if (!e.data || typeof e.data !== "object") return;
    if (e.data.type === "cv-lab-request-lock") {
      focusCanvas();
    }
  }

  /* ─────────────────────────────────────────────────────
     11. TOAST  (small transient message, bottom-center)
     ───────────────────────────────────────────────────── */
  function createToast() {
    toastEl = makeEl("div", PREFIX + "toast");
    document.body.appendChild(toastEl);
  }

  function showToast(text, ms) {
    if (!toastEl) return;
    toastEl.textContent = text;
    clearTimeout(toastTimer);
    toastEl.classList.add(PREFIX + "visible");
    toastTimer = setTimeout(function () {
      toastEl.classList.remove(PREFIX + "visible");
    }, ms || 2500);
  }

  /* ─────────────────────────────────────────────────────
     12. FRAME HOOK  (shared by FPS meter + screenshot)
     Wraps window.requestAnimationFrame so we can:
       a) count the game's rendered frames (FPS meter),
       b) read the canvas right after the bundle renders —
          required because the WebGL context does not use
          preserveDrawingBuffer, so toBlob() is only valid
          inside the same frame as the render call.
     Callbacks sharing a timestamp are counted once, so
     other rAF users (e.g. mobile shim) don't inflate FPS.
     ───────────────────────────────────────────────────── */
  function installFrameHook() {
    var nativeRAF = window.requestAnimationFrame;
    if (typeof nativeRAF !== "function") return;
    window.requestAnimationFrame = function (cb) {
      return nativeRAF.call(window, function (t) {
        if (t !== lastRafStamp) {
          lastRafStamp = t;
          frameCount++;
        }
        var out = cb(t);
        if (shotPending) {
          shotPending = false;
          clearTimeout(shotFallback);
          captureScreenshot();
        }
        return out;
      });
    };
  }

  /* ─────────────────────────────────────────────────────
     13. SESSION STATS OVERLAY  (F3)
     Time played (while in-world) + FPS meter.
     ───────────────────────────────────────────────────── */
  function createStatsOverlay() {
    statsEl = makeEl("div", PREFIX + "stats");

    var head = makeEl("div", null, PREFIX + "stats-head");
    head.textContent = "SESSION — F3 to hide";

    var timeRow = makeEl("div", null, PREFIX + "stats-row");
    var timeLabel = makeEl("span", null, PREFIX + "stats-label");
    timeLabel.textContent = "Time played";
    statsTimeEl = makeEl("span", null, PREFIX + "stats-value");
    statsTimeEl.textContent = "0:00";
    timeRow.appendChild(timeLabel);
    timeRow.appendChild(statsTimeEl);

    var fpsRow = makeEl("div", null, PREFIX + "stats-row");
    var fpsLabel = makeEl("span", null, PREFIX + "stats-label");
    fpsLabel.textContent = "FPS";
    statsFpsEl = makeEl("span", null, PREFIX + "stats-value");
    statsFpsEl.textContent = "\u2014";
    fpsRow.appendChild(fpsLabel);
    fpsRow.appendChild(statsFpsEl);

    statsEl.appendChild(head);
    statsEl.appendChild(timeRow);
    statsEl.appendChild(fpsRow);
    statsEl.classList.add(PREFIX + "hidden");
    document.body.appendChild(statsEl);

    /* Play-time accrues only while in-world and tab visible */
    setInterval(function () {
      if (inWorld && !document.hidden) playSeconds++;
    }, 1000);

    /* Refresh readout twice a second while shown */
    lastFpsCheck = performance.now();
    setInterval(function () {
      var now = performance.now();
      var elapsed = now - lastFpsCheck;
      var fps = frameCount > 0 && elapsed > 0
        ? Math.round(frameCount * 1000 / elapsed)
        : 0;
      frameCount = 0;
      lastFpsCheck = now;
      if (!statsVisible) return;
      statsTimeEl.textContent = formatDuration(playSeconds);
      statsFpsEl.textContent = fps > 0 ? String(fps) : "\u2014";
    }, 500);
  }

  function formatDuration(totalSec) {
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    var mm = (h > 0 && m < 10 ? "0" : "") + m;
    var ss = (s < 10 ? "0" : "") + s;
    return h > 0 ? h + ":" + mm + ":" + ss : m + ":" + ss;
  }

  function toggleStats() {
    if (!statsEl) return;
    statsVisible = !statsVisible;
    statsEl.classList.toggle(PREFIX + "hidden", !statsVisible);
  }

  /* ─────────────────────────────────────────────────────
     14. SCREENSHOT  (F2)
     Captures the game canvas via toBlob and downloads it.
     Capture happens inside the frame hook, right after the
     bundle renders (DOM overlays are never part of the
     canvas, so nothing extra needs hiding). If the render
     loop is idle, fall back to a direct capture.
     ───────────────────────────────────────────────────── */
  function requestScreenshot() {
    var c = resolveCanvas();
    if (!c || typeof c.toBlob !== "function") {
      showToast("Screenshot unavailable \u2014 no canvas yet");
      return;
    }
    shotPending = true;
    clearTimeout(shotFallback);
    shotFallback = setTimeout(function () {
      if (!shotPending) return;
      shotPending = false;
      captureScreenshot();
    }, 400);
  }

  function captureScreenshot() {
    var c = resolveCanvas();
    if (!c || typeof c.toBlob !== "function") return;
    try {
      c.toBlob(function (blob) {
        if (!blob) {
          showToast("Screenshot failed");
          return;
        }
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = "craftverse-" + timestampSlug() + ".png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
        showToast("\u{1F4F8} Screenshot saved");
      }, "image/png");
    } catch (_) {
      showToast("Screenshot failed");
    }
  }

  function timestampSlug() {
    var d = new Date();
    function p(n) { return (n < 10 ? "0" : "") + n; }
    return d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) +
      "-" + p(d.getHours()) + p(d.getMinutes()) + p(d.getSeconds());
  }

  /* ─────────────────────────────────────────────────────
     15. CONTROLS CHEATSHEET  (H)
     ───────────────────────────────────────────────────── */
  var CHEATSHEET_ROWS = [
    ["W A S D", "Move"],
    ["Space", "Jump / fly up"],
    ["Shift", "Sprint"],
    ["Ctrl", "Crouch / fly down"],
    ["Mouse", "Left break \u00B7 right place"],
    ["Wheel", "Cycle hotbar"],
    ["E", "Inventory & crafting"],
    ["T", "Chat"],
    ["F", "Toggle flying"],
    ["G", "Creative / survival"],
    ["Esc", "Pause menu"],
    ["F2", "Screenshot"],
    ["F3", "Session stats"]
  ];

  function createCheatsheet() {
    cheatsheetEl = makeEl("div", PREFIX + "cheatsheet");

    var title = makeEl("div", null, PREFIX + "cheat-title");
    title.textContent = "Controls";
    cheatsheetEl.appendChild(title);

    var grid = makeEl("div", null, PREFIX + "cheat-grid");
    CHEATSHEET_ROWS.forEach(function (row) {
      var key = makeEl("span", null, PREFIX + "cheat-key");
      key.textContent = row[0];
      var desc = makeEl("span", null, PREFIX + "cheat-desc");
      desc.textContent = row[1];
      grid.appendChild(key);
      grid.appendChild(desc);
    });
    cheatsheetEl.appendChild(grid);

    var foot = makeEl("div", null, PREFIX + "cheat-foot");
    foot.textContent = "Press H to close";
    cheatsheetEl.appendChild(foot);

    cheatsheetEl.classList.add(PREFIX + "hidden");
    document.body.appendChild(cheatsheetEl);
  }

  function toggleCheatsheet() {
    if (!cheatsheetEl) return;
    cheatsheetEl.classList.toggle(PREFIX + "hidden");
  }

  /* ─────────────────────────────────────────────────────
     16. LAB HOTKEYS  (F2 / F3 / H — unused by the bundle)
     Ignored while typing in chat or other inputs.
     ───────────────────────────────────────────────────── */
  function onLabKeydown(e) {
    if (e.repeat) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (e.code === "F3") {
      e.preventDefault();
      toggleStats();
    } else if (e.code === "F2") {
      e.preventDefault();
      requestScreenshot();
    } else if (e.code === "KeyH") {
      toggleCheatsheet();
    }
  }

  /* ─────────────────────────────────────────────────────
     INIT
     ───────────────────────────────────────────────────── */
  function init() {
    createLockMsg();
    createMobileBanner();
    createBrandBadge();
    if (preferReducedMotion()) {
      document.documentElement.classList.add(PREFIX + "reduced-motion");
    }

    if (IS_EMBED) {
      createClickOverlay();
      document.body.classList.add("cv-embedded");
    }

    createToast();
    installFrameHook();
    createStatsOverlay();
    createCheatsheet();
    document.addEventListener("keydown", onLabKeydown, false);

    watchCanvasInsertion();
    watchScreens();

    document.addEventListener("pointerlockchange", onPointerLockChange, false);
    document.addEventListener("pointerlockerror", onPointerLockError, false);
    window.addEventListener("message", onParentMessage, false);

    if (!IS_EMBED) {
      document.addEventListener("pointerlockchange", function () {
        if (document.pointerLockElement) flashLockMsg(3000);
      }, false);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();