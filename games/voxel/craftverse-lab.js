/* ============================================================
   CraftVerse Lab — inject layer  (v3 — hub overhaul)
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
  var EMBED_RENDER_KEY = "cv-lab-embed-render-distance";
  window.__craftverseLabVersion = "v4";

  /* ── State ── */
  var clickOverlay  = null;
  var lockMsg       = null;
  var lockMsgTimer  = null;
  var canvas        = null;
  var inWorld       = false;

  /* Diagnostics overlay (F3) state */
  var diagEl            = null;
  var diagVisible       = false;
  var diagRafId         = null;
  var diagFrameCount    = 0;
  var diagFpsSampleFrom = 0;
  var diagFps           = 0;

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
     EMBED PERFORMANCE HINT
     Lower render distance in hub iframe unless user opted out.
     ───────────────────────────────────────────────────── */
  function applyEmbedRenderHint() {
    if (!IS_EMBED) return;
    try {
      if (localStorage.getItem(EMBED_RENDER_KEY) === "off") return;
      if (!localStorage.getItem(EMBED_RENDER_KEY)) {
        localStorage.setItem(EMBED_RENDER_KEY, "6");
      }
      var hint = document.createElement("div");
      hint.id = PREFIX + "perf-hint";
      hint.className = PREFIX + "perf-hint";
      hint.innerHTML =
        "Hub embed mode — render distance capped for smoother FPS. " +
        "<button type=\"button\" id=\"" + PREFIX + "perf-dismiss\">Use full quality</button>";
      document.body.appendChild(hint);
      var btn = $(PREFIX + "perf-dismiss");
      if (btn) {
        btn.addEventListener("click", function () {
          localStorage.setItem(EMBED_RENDER_KEY, "off");
          hint.remove();
        });
      }
      setTimeout(function () {
        if (hint.parentNode) hint.classList.add(PREFIX + "perf-hint-fade");
      }, 8000);
    } catch (_) {}
  }

  /* ─────────────────────────────────────────────────────
     9b. DIAGNOSTICS OVERLAY  (toggle with F3, Minecraft-style)
     Purely observational — reads canvas size/DPR/pointer-lock
     state that already lives on the DOM/window; never touches
     the bundle. FPS is measured entirely in this layer via our
     own requestAnimationFrame loop (only runs while visible).
     ───────────────────────────────────────────────────── */
  function createDiagOverlay() {
    diagEl = makeEl("pre", PREFIX + "diag");
    diagEl.classList.add(PREFIX + "hidden");
    diagEl.setAttribute("aria-hidden", "true");
    document.body.appendChild(diagEl);
  }

  function renderDiagContents() {
    if (!diagEl) return;
    var c = resolveCanvas();
    var dpr = window.devicePixelRatio || 1;
    var resLine = c
      ? c.width + "\u00d7" + c.height + " px canvas / " +
        Math.round(c.clientWidth) + "\u00d7" + Math.round(c.clientHeight) + " css"
      : "canvas not mounted yet";
    var locked = document.pointerLockElement != null;

    diagEl.textContent = [
      "CraftVerse Lab diagnostics — F3 to close",
      "FPS: " + (diagFps || "\u2026"),
      "Resolution: " + resLine,
      "Device pixel ratio: " + dpr.toFixed(2),
      "Pointer lock: " + (locked ? "locked" : "unlocked"),
      "Mode: " + (IS_EMBED ? "embed" : "standalone") + (IS_MOBILE ? " · mobile" : ""),
      "In world: " + (inWorld ? "yes" : "no")
    ].join("\n");
  }

  function diagTick(now) {
    diagFrameCount++;
    if (!diagFpsSampleFrom) diagFpsSampleFrom = now;
    var elapsed = now - diagFpsSampleFrom;
    if (elapsed >= 400) {
      diagFps = Math.round((diagFrameCount * 1000) / elapsed);
      diagFrameCount = 0;
      diagFpsSampleFrom = now;
      renderDiagContents();
    }
    if (diagVisible) {
      diagRafId = requestAnimationFrame(diagTick);
    }
  }

  function showDiagOverlay() {
    if (!diagEl) return;
    diagVisible = true;
    diagFrameCount = 0;
    diagFpsSampleFrom = 0;
    diagEl.classList.remove(PREFIX + "hidden");
    diagEl.setAttribute("aria-hidden", "false");
    renderDiagContents();
    if (diagRafId == null) diagRafId = requestAnimationFrame(diagTick);
  }

  function hideDiagOverlay() {
    if (!diagEl) return;
    diagVisible = false;
    diagEl.classList.add(PREFIX + "hidden");
    diagEl.setAttribute("aria-hidden", "true");
    if (diagRafId != null) {
      cancelAnimationFrame(diagRafId);
      diagRafId = null;
    }
  }

  function toggleDiagOverlay() {
    if (diagVisible) hideDiagOverlay(); else showDiagOverlay();
  }

  function isTypingTarget(el) {
    if (!el) return false;
    var tag = el.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || !!el.isContentEditable;
  }

  function onDiagKeyDown(e) {
    if (e.key !== "F3" && e.code !== "F3") return;
    if (isTypingTarget(e.target)) return;
    e.preventDefault();
    toggleDiagOverlay();
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
     INIT
     ───────────────────────────────────────────────────── */
  function init() {
    createLockMsg();
    createMobileBanner();
    createBrandBadge();
    applyEmbedRenderHint();
    createDiagOverlay();
    if (preferReducedMotion()) {
      document.documentElement.classList.add(PREFIX + "reduced-motion");
    }

    if (IS_EMBED) {
      createClickOverlay();
      document.body.classList.add("cv-embedded");
    }

    watchCanvasInsertion();
    watchScreens();

    document.addEventListener("pointerlockchange", onPointerLockChange, false);
    document.addEventListener("pointerlockerror", onPointerLockError, false);
    document.addEventListener("keydown", onDiagKeyDown, false);
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