/* ============================================================
   CraftVerse Lab — inject layer  (v4 — accessibility assists)
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
  var ASSIST_KEY = "craftverse-accessibility-v1";
  window.__craftverseLabVersion = "v4";

  /* ── State ── */
  var clickOverlay  = null;
  var lockMsg       = null;
  var lockMsgTimer  = null;
  var canvas        = null;
  var inWorld       = false;
  var assistDialog  = null;
  var assistStatus  = null;
  var lastFocus     = null;
  var assistPrefs   = loadAssistPrefs();

  /* ── Helpers ── */
  function $(id) { return document.getElementById(id); }
  function makeEl(tag, id, cls) {
    var el = document.createElement(tag);
    if (id) el.id = id;
    if (cls) el.className = cls;
    return el;
  }

  function loadAssistPrefs() {
    var defaults = {
      largeCrosshair: false,
      contrastCrosshair: false,
      reduceMotion: preferReducedMotion()
    };
    try {
      var saved = JSON.parse(localStorage.getItem(ASSIST_KEY));
      if (!saved || typeof saved !== "object") return defaults;
      return {
        largeCrosshair: saved.largeCrosshair === true,
        contrastCrosshair: saved.contrastCrosshair === true,
        reduceMotion: typeof saved.reduceMotion === "boolean" ? saved.reduceMotion : defaults.reduceMotion
      };
    } catch (_) {
      return defaults;
    }
  }

  function saveAssistPrefs() {
    try {
      localStorage.setItem(ASSIST_KEY, JSON.stringify(assistPrefs));
    } catch (_) {}
  }

  function applyAssistPrefs() {
    var root = document.documentElement;
    root.classList.toggle(PREFIX + "large-crosshair", assistPrefs.largeCrosshair);
    root.classList.toggle(PREFIX + "contrast-crosshair", assistPrefs.contrastCrosshair);
    root.classList.toggle(PREFIX + "reduced-motion", assistPrefs.reduceMotion);
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
     10. ACCESSIBILITY ASSISTS
     Persistent crosshair and motion preferences, with a
     keyboard-accessible controls reference available from
     title, pause, and settings screens.
     ───────────────────────────────────────────────────── */
  function makeAssistToggle(label, description, key) {
    var row = makeEl("div", null, PREFIX + "assist-option");
    var copy = makeEl("div", null, PREFIX + "assist-option-copy");
    var title = makeEl("strong");
    title.textContent = label;
    var detail = makeEl("span");
    detail.textContent = description;
    copy.appendChild(title);
    copy.appendChild(detail);

    var toggle = makeEl("button", PREFIX + "toggle-" + key, PREFIX + "assist-toggle");
    toggle.type = "button";
    toggle.setAttribute("role", "switch");
    toggle.setAttribute("aria-label", label);

    function sync() {
      var enabled = assistPrefs[key];
      toggle.setAttribute("aria-checked", enabled ? "true" : "false");
      toggle.textContent = enabled ? "On" : "Off";
    }

    toggle.addEventListener("click", function () {
      assistPrefs[key] = !assistPrefs[key];
      saveAssistPrefs();
      applyAssistPrefs();
      sync();
      if (assistStatus) {
        assistStatus.textContent = label + " " + (assistPrefs[key] ? "enabled" : "disabled");
      }
    });
    sync();
    row.appendChild(copy);
    row.appendChild(toggle);
    return row;
  }

  function closeAssistDialog() {
    if (!assistDialog || assistDialog.classList.contains(PREFIX + "hidden")) return;
    assistDialog.classList.add(PREFIX + "hidden");
    assistDialog.setAttribute("aria-hidden", "true");
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  }

  function openAssistDialog() {
    if (!assistDialog) return;
    lastFocus = document.activeElement;
    assistDialog.classList.remove(PREFIX + "hidden");
    assistDialog.setAttribute("aria-hidden", "false");
    var close = $(PREFIX + "assist-close");
    if (close) close.focus();
  }

  function createAssistDialog() {
    assistDialog = makeEl("div", PREFIX + "assist-dialog", PREFIX + "hidden");
    assistDialog.setAttribute("role", "dialog");
    assistDialog.setAttribute("aria-modal", "true");
    assistDialog.setAttribute("aria-hidden", "true");
    assistDialog.setAttribute("aria-labelledby", PREFIX + "assist-title");

    var card = makeEl("div", null, PREFIX + "assist-card");
    var heading = makeEl("div", null, PREFIX + "assist-heading");
    var title = makeEl("h2", PREFIX + "assist-title");
    title.textContent = "Controls & Accessibility";
    var close = makeEl("button", PREFIX + "assist-close", PREFIX + "assist-close");
    close.type = "button";
    close.setAttribute("aria-label", "Close controls and accessibility");
    close.textContent = "\u00d7";
    close.addEventListener("click", closeAssistDialog);
    heading.appendChild(title);
    heading.appendChild(close);

    var intro = makeEl("p", null, PREFIX + "assist-intro");
    intro.textContent = "Adjust aiming visibility and motion. Preferences are saved on this device.";

    var options = makeEl("div", null, PREFIX + "assist-options");
    options.appendChild(makeAssistToggle(
      "Large crosshair",
      "Makes the aiming marker easier to locate.",
      "largeCrosshair"
    ));
    options.appendChild(makeAssistToggle(
      "High-contrast crosshair",
      "Adds a dark outline around a bright marker.",
      "contrastCrosshair"
    ));
    options.appendChild(makeAssistToggle(
      "Reduce motion",
      "Removes non-essential interface animation.",
      "reduceMotion"
    ));

    var controlsTitle = makeEl("h3");
    controlsTitle.textContent = "Keyboard & mouse";
    var controls = makeEl("dl", null, PREFIX + "assist-controls");
    [
      ["W A S D", "Move"],
      ["Mouse", "Look"],
      ["Left / right click", "Break / place"],
      ["Space", "Jump"],
      ["E", "Inventory"],
      ["Esc", "Release mouse / pause"],
      ["H", "Open this panel from a menu"]
    ].forEach(function (entry) {
      var key = makeEl("dt");
      var action = makeEl("dd");
      key.textContent = entry[0];
      action.textContent = entry[1];
      controls.appendChild(key);
      controls.appendChild(action);
    });

    assistStatus = makeEl("div", PREFIX + "assist-status", PREFIX + "sr-only");
    assistStatus.setAttribute("role", "status");
    assistStatus.setAttribute("aria-live", "polite");

    card.appendChild(heading);
    card.appendChild(intro);
    card.appendChild(options);
    card.appendChild(controlsTitle);
    card.appendChild(controls);
    card.appendChild(assistStatus);
    assistDialog.appendChild(card);
    assistDialog.addEventListener("mousedown", function (event) {
      if (event.target === assistDialog) closeAssistDialog();
    });
    document.body.appendChild(assistDialog);
  }

  function addAssistButton(container, before) {
    if (!container) return;
    var button = makeEl("button", null, "menu-btn " + PREFIX + "assist-open");
    button.type = "button";
    button.textContent = "Controls & Accessibility";
    button.addEventListener("click", openAssistDialog);
    container.insertBefore(button, before || null);
  }

  function mountAssistEntryPoints() {
    var titleMain = $("title-main");
    addAssistButton(titleMain, titleMain ? titleMain.querySelector(".title-hint") : null);
    var pause = $("pause-screen");
    addAssistButton(pause, pause ? $("btn-save-quit") : null);
  }

  function onAssistKeydown(event) {
    var target = event.target;
    var isTyping = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
    var dialogOpen = assistDialog && !assistDialog.classList.contains(PREFIX + "hidden");
    if (event.key === "Tab" && dialogOpen) {
      var focusable = assistDialog.querySelectorAll("button:not([disabled]), a[href], input:not([disabled])");
      if (focusable.length) {
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    if (event.key === "Escape" && dialogOpen) {
      event.preventDefault();
      event.stopPropagation();
      closeAssistDialog();
      return;
    }
    if ((event.key === "h" || event.key === "H") && !event.repeat && !isTyping && !inWorld) {
      event.preventDefault();
      if (assistDialog.classList.contains(PREFIX + "hidden")) openAssistDialog();
      else closeAssistDialog();
    }
  }

  /* ─────────────────────────────────────────────────────
     11. HUB POSTMESSAGE LISTENER
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
    applyAssistPrefs();
    createAssistDialog();
    mountAssistEntryPoints();
    createLockMsg();
    createMobileBanner();
    createBrandBadge();
    if (IS_EMBED) {
      createClickOverlay();
      document.body.classList.add("cv-embedded");
    }

    watchCanvasInsertion();
    watchScreens();

    document.addEventListener("pointerlockchange", onPointerLockChange, false);
    document.addEventListener("pointerlockerror", onPointerLockError, false);
    document.addEventListener("keydown", onAssistKeydown, true);
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