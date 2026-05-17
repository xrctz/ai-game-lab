/* ============================================================
   CraftVerse Lab — inject layer  (v2 — pointer-lock fix)
   Scope: games/voxel/ only.  Prefix: cv-lab-
   Do NOT touch the Vite bundle or hub files.
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

  /* ── State ── */
  var clickOverlay  = null;
  var lockMsg       = null;
  var lockMsgTimer  = null;
  var canvas        = null;
  var inWorld       = false;

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
    title.textContent = "Click to Play";
    var sub   = makeEl("div", null, PREFIX + "overlay-sub");
    sub.textContent = "This captures your mouse for look controls. Press Esc to release.";

    clickOverlay.appendChild(icon);
    clickOverlay.appendChild(title);
    clickOverlay.appendChild(sub);

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
      " CraftVerse is best experienced on desktop with a keyboard and mouse."
    ));
    document.body.appendChild(banner);
    if (IS_EMBED) banner.classList.add(PREFIX + "show-mobile");
  }

  /* ─────────────────────────────────────────────────────
     9. BRANDING BADGE
     ───────────────────────────────────────────────────── */
  function createBrandBadge() {
    var badge = makeEl("div", PREFIX + "brand");
    badge.textContent = "CraftVerse Engine";
    document.body.appendChild(badge);
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

    if (IS_EMBED) {
      createClickOverlay();
    }

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