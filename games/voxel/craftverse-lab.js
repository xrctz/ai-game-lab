/* ============================================================
   CraftVerse Lab — inject layer
   Scope: games/voxel/ only.  Prefix: cv-lab-
   Do NOT touch the Vite bundle or hub files.
   ============================================================ */
(function () {
  "use strict";

  /* ── Constants ── */
  var PREFIX     = "cv-lab-";
  var FULL_PATH  = "/ai-game-lab/games/voxel/index.html";
  var IS_EMBED   = new URLSearchParams(location.search).get("embed") === "1"
                   || window !== window.top;
  var IS_MOBILE  = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function makeEl(tag, id, cls) {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (cls) el.className = cls;
    return el;
  }

  /* ─────────────────────────────────────────────────────
     1. EMBED DETECTION — add body class
     ───────────────────────────────────────────────────── */
  if (IS_EMBED) {
    document.body.classList.add("cv-embedded");
  }

  /* ─────────────────────────────────────────────────────
     2. CLICK-TO-PLAY OVERLAY  (embed mode only)
     Shown until user clicks → triggers pointer lock on canvas.
     ───────────────────────────────────────────────────── */
  var clickOverlay = null;

  function createClickOverlay() {
    clickOverlay = makeEl("div", PREFIX + "click-overlay");

    var icon  = makeEl("div", null, PREFIX + "overlay-icon");
    icon.textContent = "🎮";
    var title = makeEl("div", null, PREFIX + "overlay-title");
    title.textContent = "Click to Play";
    var sub   = makeEl("div", null, PREFIX + "overlay-sub");
    sub.textContent = "This captures your mouse for look controls. Press Esc to release.";

    clickOverlay.appendChild(icon);
    clickOverlay.appendChild(title);
    clickOverlay.appendChild(sub);

    clickOverlay.addEventListener("click", function () {
      hideClickOverlay();
      /* Focus the game canvas and request pointer lock */
      var canvas = getCanvas();
      if (canvas) {
        canvas.focus();
        try { canvas.requestPointerLock(); } catch (_) {}
      }
    });

    document.body.appendChild(clickOverlay);
  }

  function showClickOverlay() {
    if (clickOverlay) clickOverlay.classList.remove(PREFIX + "hidden");
  }
  function hideClickOverlay() {
    if (clickOverlay) clickOverlay.classList.add(PREFIX + "hidden");
  }

  /* ─────────────────────────────────────────────────────
     3. POINTER-LOCK ERROR / ESC MESSAGE
     Shown briefly when pointer lock fails or is lost unexpectedly.
     ───────────────────────────────────────────────────── */
  var lockMsg    = null;
  var lockMsgTimer = null;

  function createLockMsg() {
    lockMsg = makeEl("div", PREFIX + "lock-msg");
    lockMsg.innerHTML =
      'Mouse captured — <b>Esc</b> to release. ' +
      'If stuck, <a href="' + FULL_PATH + '" target="_blank" rel="noopener">open full screen ↗</a>';
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
     4. MOBILE BANNER  (embed + mobile only)
     ───────────────────────────────────────────────────── */
  function createMobileBanner() {
    if (!IS_MOBILE) return;
    var banner = makeEl("div", PREFIX + "mobile-banner");
    banner.id = PREFIX + "mobile-banner";
    var icon = makeEl("span", null, PREFIX + "mob-icon");
    icon.textContent = "🖥️";
    banner.appendChild(icon);
    banner.appendChild(document.createTextNode(
      " CraftVerse is best experienced on desktop with a keyboard and mouse."
    ));
    document.body.appendChild(banner);
    if (IS_EMBED) banner.classList.add(PREFIX + "show-mobile");
  }

  /* ─────────────────────────────────────────────────────
     5. BRANDING BADGE  (optional)
     ───────────────────────────────────────────────────── */
  function createBrandBadge() {
    var badge = makeEl("div", PREFIX + "brand");
    badge.textContent = "CraftVerse Engine";
    document.body.appendChild(badge);
  }

  /* ─────────────────────────────────────────────────────
     6. POINTER-LOCK EVENT LISTENERS
     ───────────────────────────────────────────────────── */
  function onPointerLockChange() {
    var locked = document.pointerLockElement != null;
    if (!locked) {
      /* Pointer lock released — show overlay if embed */
      if (IS_EMBED) showClickOverlay();
    }
  }

  function onPointerLockError() {
    if (IS_EMBED) showClickOverlay();
    flashLockMsg(5000);
  }

  /* ─────────────────────────────────────────────────────
     7. KEYBOARD FOCUS HELPERS
     After game starts (title hidden), ensure canvas has focus.
     ───────────────────────────────────────────────────── */
  function getCanvas() {
    var app = $("app");
    return app ? app.querySelector("canvas") : null;
  }

  /* Watch for the title screen being hidden (game started).
     Use MutationObserver so we don't touch the bundle. */
  function watchGameStart() {
    var titleScreen = $("title-screen");
    if (!titleScreen) return;

    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].attributeName === "class") {
          var hidden = titleScreen.classList.contains("hidden");
          if (hidden) {
            /* Game has started */
            if (IS_EMBED) {
              /* Show click overlay so user can grab pointer lock */
              showClickOverlay();
            }
            /* Try to focus canvas */
            var canvas = getCanvas();
            if (canvas) {
              setTimeout(function () { canvas.focus(); }, 200);
            }
          }
        }
      }
    });

    observer.observe(titleScreen, { attributes: true });
  }

  /* ─────────────────────────────────────────────────────
     8. EMBED: LOWER RENDER DISTANCE HINT
     If the bundle reads from localStorage, set a hint.
     This is non-destructive — if the bundle ignores it, no harm.
     ───────────────────────────────────────────────────── */
  function hintRenderDistance() {
    if (!IS_EMBED) return;
    try {
      var existing = localStorage.getItem("cw-settings");
      if (!existing) {
        /* Default hint: lower render distance for embeds */
        localStorage.setItem("cv-lab-embed-hint", JSON.stringify({
          renderDistance: 4,
          source: "craftverse-lab-embed"
        }));
      }
    } catch (_) {}
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
      hintRenderDistance();
    }

    /* Event listeners */
    document.addEventListener("pointerlockchange", onPointerLockChange, false);
    document.addEventListener("pointerlockerror", onPointerLockError, false);

    /* Watch for game start */
    watchGameStart();

    /* Non-embed: show lock msg briefly when pointer lock activates */
    if (!IS_EMBED) {
      document.addEventListener("pointerlockchange", function () {
        if (document.pointerLockElement) flashLockMsg(3000);
      }, false);
    }
  }

  /* Wait for DOM ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
