/**
 * Adrian Del Rosario — portfolio behaviour.
 *
 * Modules: theme, mobile menu, sticky header, scroll spy, dialogs, lightbox,
 * copy-email, scroll reveal. No framework, no dependencies.
 *
 * The initial theme read lives in a blocking inline script in <head>; it has
 * to run before first paint or the wrong theme flashes on load.
 */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ============================ Theme ============================ */

  const themeSwitch = $("#theme-switch");

  if (themeSwitch) {
    const sync = () => {
      const dark = document.documentElement.dataset.theme === "dark";
      themeSwitch.checked = dark;
      themeSwitch.setAttribute(
        "aria-label",
        dark ? "Switch to light theme" : "Switch to dark theme"
      );
    };
    sync();

    themeSwitch.addEventListener("change", () => {
      const theme = themeSwitch.checked ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {
        /* private browsing — the toggle still works for this session */
      }
      sync();
    });
  }

  /* ========================= Mobile menu ========================= */

  const menuBtn = $("#menu-btn");
  const nav = $("#nav");

  const menuOpen = () => nav?.classList.contains("is-open");

  function setMenu(open) {
    if (!nav || !menuBtn) return;
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", () => setMenu(!menuOpen()));

    // Close on link tap.
    nav.addEventListener("click", (e) => {
      if (e.target.closest("a")) setMenu(false);
    });

    // Close on a tap outside the panel or the button.
    document.addEventListener("pointerdown", (e) => {
      if (!menuOpen()) return;
      if (nav.contains(e.target) || menuBtn.contains(e.target)) return;
      setMenu(false);
    });

    // Close when the viewport grows past the mobile breakpoint.
    matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
      if (e.matches) setMenu(false);
    });
  }

  /* ====================== Header stuck state ===================== */

  const header = $("#site-header");

  if (header) {
    // A zero-height sentinel beats a scroll handler: no work on most frames.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => header.classList.toggle("is-stuck", !entry.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  }

  /* ========================== Scroll spy ========================= */

  const navLinks = $$('.nav a[href^="#"]');
  const sections = navLinks
    .map((a) => $(a.getAttribute("href")))
    .filter(Boolean);

  if (sections.length && "IntersectionObserver" in window) {
    const ratios = new Map();

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) =>
          ratios.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0)
        );

        let best = null;
        let bestRatio = 0;
        ratios.forEach((r, id) => {
          if (r > bestRatio) {
            bestRatio = r;
            best = id;
          }
        });
        if (!best) return;

        navLinks.forEach((a) => {
          const on = a.getAttribute("href") === `#${best}`;
          if (on) a.setAttribute("aria-current", "true");
          else a.removeAttribute("aria-current");
        });
      },
      { threshold: [0, 0.2, 0.5, 0.8], rootMargin: "-80px 0px -45% 0px" }
    );

    sections.forEach((s) => spy.observe(s));
  }

  /* =========================== Dialogs =========================== */

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  let activeDialog = null;
  let lastTrigger = null;
  let lockedY = 0;
  let priorScrollBehavior = "";

  /**
   * Freeze the page behind a dialog.
   *
   * `html` has `scroll-behavior: smooth` and fixing the body collapses the
   * document height, so the browser's scroll correction would ANIMATE —
   * which reads as the page travelling top-to-bottom. Smooth scrolling is
   * suspended for the duration.
   */
  function lockScroll() {
    lockedY = window.scrollY;
    priorScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.top = `-${lockedY}px`;
    document.body.classList.add("is-locked");
  }

  function unlockScroll() {
    document.body.classList.remove("is-locked");
    document.body.style.top = "";
    window.scrollTo(0, lockedY);
    document.documentElement.style.scrollBehavior = priorScrollBehavior;
  }

  function openDialog(dialog, trigger) {
    if (activeDialog) closeDialog();
    setMenu(false);

    activeDialog = dialog;
    lastTrigger = trigger || document.activeElement;

    lockScroll();
    dialog.classList.add("is-active");
    // `inert` removes the panel from both the a11y tree and the tab order.
    dialog.removeAttribute("inert");

    // preventScroll matters: a plain focus() scrolls the element into view.
    const first = dialog.querySelector(FOCUSABLE);
    if (first) first.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!activeDialog) return;

    activeDialog.classList.remove("is-active");
    activeDialog.setAttribute("inert", "");
    // Reset inner scroll so reopening starts at the top.
    $$(".dialog-body", activeDialog).forEach((el) => (el.scrollTop = 0));
    activeDialog = null;

    unlockScroll();

    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  }

  /** Keeps Tab cycling inside the open dialog. */
  function trapFocus(event) {
    if (!activeDialog || event.key !== "Tab") return;
    const items = $$(FOCUSABLE, activeDialog).filter((el) => el.offsetParent !== null);
    if (!items.length) return;

    const first = items[0];
    const last = items[items.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  // Any button naming a dialog opens it.
  $$("[data-dialog]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.dialog);
      if (dialog) openDialog(dialog, btn);
    });
  });

  $$(".dialog-close").forEach((btn) => btn.addEventListener("click", closeDialog));

  // Backdrop click closes; clicks inside the panel do not reach here.
  $$(".dialog").forEach((d) => {
    d.addEventListener("click", (e) => {
      if (e.target === d) closeDialog();
    });
  });

  /* ========================== Lightbox =========================== */

  const lb = $("#lightbox");
  const lbFrame = $(".lb", lb);
  const lbImg = $("#lb-img");
  const lbTitle = $("#lb-title");
  const lbCount = $("#lb-count");
  const lbThumbs = $("#lb-thumbs");

  let shots = [];
  let label = "";
  let index = 0;
  let thumbs = [];

  /**
   * Scroll the rail so the active thumb is visible.
   * Deliberately not scrollIntoView — that walks up and scrolls every
   * ancestor scroll container, including the document.
   */
  function revealThumb(btn) {
    const start = lbThumbs.scrollLeft;
    const end = start + lbThumbs.clientWidth;
    const pad = 12;
    if (btn.offsetLeft < start) {
      lbThumbs.scrollLeft = btn.offsetLeft - pad;
    } else if (btn.offsetLeft + btn.offsetWidth > end) {
      lbThumbs.scrollLeft = btn.offsetLeft + btn.offsetWidth - lbThumbs.clientWidth + pad;
    }
  }

  function buildThumbs() {
    lbThumbs.textContent = "";
    thumbs = shots.map((src, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lb-thumb";
      btn.setAttribute("aria-label", `Show screenshot ${i + 1} of ${shots.length}`);

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
      btn.append(img);

      btn.addEventListener("click", () => {
        index = i;
        renderShot();
      });

      lbThumbs.append(btn);
      return btn;
    });
  }

  function renderShot() {
    lbImg.src = shots[index];
    lbImg.alt = `${label} — screenshot ${index + 1} of ${shots.length}`;
    lbCount.textContent = `${index + 1} / ${shots.length}`;
    lbTitle.textContent = label;

    thumbs.forEach((btn, i) => {
      if (i === index) {
        btn.setAttribute("aria-current", "true");
        revealThumb(btn);
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    // Warm the neighbours so navigation feels instant.
    [index + 1, index - 1].forEach((i) => {
      const src = shots[(i + shots.length) % shots.length];
      if (src) new Image().src = src;
    });
  }

  function step(delta) {
    if (shots.length < 2) return;
    index = (index + delta + shots.length) % shots.length;
    renderShot();
  }

  $$("[data-gallery]").forEach((btn) => {
    btn.addEventListener("click", () => {
      shots = (btn.dataset.images || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (!shots.length) return;

      label = btn.dataset.gallery;
      index = 0;
      lbFrame.classList.toggle("is-single", shots.length < 2);
      buildThumbs();
      renderShot();
      lb.setAttribute("aria-label", `${label} screenshots`);
      openDialog(lb, btn);
    });
  });

  $(".lb-prev")?.addEventListener("click", () => step(-1));
  $(".lb-next")?.addEventListener("click", () => step(1));

  // Swipe — phone users reach for this before they look for arrows.
  if (lb) {
    const THRESHOLD = 45;
    let x0 = null;
    let y0 = null;

    lb.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "mouse") return;
      x0 = e.clientX;
      y0 = e.clientY;
    });

    lb.addEventListener("pointerup", (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      const dy = e.clientY - y0;
      x0 = null;
      y0 = null;
      // Only a clearly horizontal gesture, so vertical scrolls pass through.
      if (Math.abs(dx) > THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
    });

    lb.addEventListener("pointercancel", () => {
      x0 = null;
      y0 = null;
    });
  }

  /* ====================== Keyboard shortcuts ===================== */

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && menuOpen()) {
      setMenu(false);
      menuBtn?.focus();
      return;
    }

    if (!activeDialog) return;

    if (e.key === "Escape") {
      closeDialog();
      return;
    }

    trapFocus(e);

    if (activeDialog === lb) {
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    }
  });

  /* ========================= Copy email ========================== */

  const copyBtn = $("#copy-email");

  if (copyBtn) {
    const labelEl = copyBtn.querySelector("span");
    const original = labelEl.textContent;

    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(copyBtn.dataset.email);
        labelEl.textContent = "Copied";
      } catch (e) {
        // Clipboard API needs a secure context; fall back to selection.
        const ta = document.createElement("textarea");
        ta.value = copyBtn.dataset.email;
        ta.setAttribute("readonly", "");
        ta.style.cssText = "position:fixed;opacity:0";
        document.body.append(ta);
        ta.select();
        try {
          document.execCommand("copy");
          labelEl.textContent = "Copied";
        } catch (err) {
          labelEl.textContent = "Press Ctrl+C";
        }
        ta.remove();
      }
      setTimeout(() => (labelEl.textContent = original), 2000);
    });
  }

  /* ======================== Scroll reveal ======================== */

  const reveals = $$("[data-reveal]");

  if (reveals.length) {
    // Failing open matters: the CSS hides these, so if the browser cannot
    // observe, everything must still be visible.
    if (!("IntersectionObserver" in window)) {
      reveals.forEach((el) => el.classList.add("is-in"));
    } else {
      const io = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            e.target.classList.add("is-in");
            obs.unobserve(e.target);
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
      );
      reveals.forEach((el) => io.observe(el));
    }
  }

  /* ========================== Footer year ======================== */

  const year = $("#year");
  if (year) year.textContent = new Date().getFullYear();
})();
