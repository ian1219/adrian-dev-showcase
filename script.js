/**
 * Adrian Del Rosario — Portfolio
 *
 * Modules: dialog helper, theme toggle, scroll spy, image gallery,
 * experience modals, footer year.
 *
 * The initial theme read lives in a blocking inline script in <head> — it has
 * to run before first paint or dark-mode users get a white flash.
 */
(() => {
  "use strict";

  /* ======================= Accessible dialog helper ======================= */

  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

  /** The dialog currently open, or null. Only ever one at a time. */
  let activeDialog = null;
  /** Element focus returns to when the dialog closes. */
  let lastTrigger = null;
  /** Scroll position captured before the body was locked. */
  let lockedScrollY = 0;
  /** The page's own scroll-behavior, restored on unlock. */
  let priorScrollBehavior = "";

  /**
   * Freeze the page behind a dialog.
   *
   * `html` has `scroll-behavior: smooth`, and fixing the body collapses the
   * document height — so any scroll correction would otherwise ANIMATE, which
   * is what made the page visibly travel top-to-bottom on open and close.
   * Smooth scrolling is switched off for the duration.
   */
  function lockScroll() {
    lockedScrollY = window.scrollY;
    priorScrollBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = "auto";
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add("is-modal-open");
  }

  function unlockScroll() {
    document.body.classList.remove("is-modal-open");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
    document.documentElement.style.scrollBehavior = priorScrollBehavior;
  }

  function openDialog(dialog, trigger) {
    if (activeDialog) closeDialog();

    activeDialog = dialog;
    lastTrigger = trigger || document.activeElement;

    lockScroll();

    dialog.classList.add("active");
    // `inert` rather than aria-hidden: it removes the panel from BOTH the
    // accessibility tree and the tab order. Must come off before we focus.
    dialog.removeAttribute("inert");

    // preventScroll is essential: a plain focus() scrolls the element into
    // view, and that is a second source of the page jumping on open.
    const first = dialog.querySelector(FOCUSABLE);
    if (first) first.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!activeDialog) return;

    activeDialog.classList.remove("active");
    activeDialog.setAttribute("inert", "");
    // Reset the scroll position inside the panel so reopening starts at the top.
    activeDialog.querySelectorAll(".modal-body").forEach((el) => (el.scrollTop = 0));
    activeDialog = null;

    unlockScroll();

    // Same reason as above — returning focus must not re-scroll the page.
    if (lastTrigger && document.contains(lastTrigger)) {
      lastTrigger.focus({ preventScroll: true });
    }
    lastTrigger = null;
  }

  /** Keeps Tab cycling inside the open dialog instead of escaping to the page. */
  function trapFocus(event) {
    if (!activeDialog || event.key !== "Tab") return;

    const items = [...activeDialog.querySelectorAll(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null
    );
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

  // Backdrop click closes; clicks inside the panel do not bubble past it.
  document.querySelectorAll(".custom-modal, .modal").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
  });

  document.querySelectorAll(".modal-close, .modal-gallery-close").forEach((btn) => {
    btn.addEventListener("click", closeDialog);
  });

  /* ============================== Theme =================================== */

  const themeToggle = document.getElementById("theme-toggle");

  if (themeToggle) {
    themeToggle.checked =
      document.documentElement.dataset.theme === "dark";

    themeToggle.addEventListener("change", () => {
      const theme = themeToggle.checked ? "dark" : "light";
      document.documentElement.dataset.theme = theme;
      try {
        localStorage.setItem("theme", theme);
      } catch {
        /* private browsing — the toggle still works for this session */
      }
    });
  }

  /* ===================== Scroll spy + navbar state ======================== */

  const navLinks = [...document.querySelectorAll(".nav-link[href^='#']")];
  const navbar = document.querySelector(".custom-navbar");
  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length) {
    // Replaces a scroll listener that read offsetTop/clientHeight for every
    // section on every frame — a forced layout that made mobile scrolling janky.
    const visible = new Map();

    const spy = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visible.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });

        if (!bestId) return;

        navLinks.forEach((link) => {
          const isActive = link.getAttribute("href") === `#${bestId}`;
          link.classList.toggle("active", isActive);
          if (isActive) {
            link.setAttribute("aria-current", "true");
          } else {
            link.removeAttribute("aria-current");
          }
        });
      },
      { threshold: [0, 0.25, 0.5, 0.75, 1], rootMargin: "-80px 0px -40% 0px" }
    );

    sections.forEach((section) => spy.observe(section));
  }

  if (navbar) {
    // A zero-height sentinel at the top of the page: cheaper and smoother than
    // a scroll handler for toggling the navbar's solid state.
    const sentinel = document.createElement("div");
    sentinel.setAttribute("aria-hidden", "true");
    sentinel.style.cssText = "position:absolute;top:0;height:1px;width:1px;";
    document.body.prepend(sentinel);

    new IntersectionObserver(
      ([entry]) => navbar.classList.toggle("scrolled", !entry.isIntersecting),
      { threshold: 0 }
    ).observe(sentinel);
  }

  // Close the collapsed mobile menu after a nav link is tapped.
  const navCollapse = document.getElementById("navbarNav");
  if (navCollapse) {
    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        if (!navCollapse.classList.contains("show")) return;
        window.bootstrap?.Collapse.getOrCreateInstance(navCollapse).hide();
      });
    });
  }

  /* ========================== Image gallery =============================== */

  const galleryModal = document.getElementById("imageModal");
  const lightbox = galleryModal?.querySelector(".lightbox");
  const galleryImg = document.getElementById("slider-img");
  const galleryCounter = document.getElementById("slider-counter");
  const galleryTitle = document.getElementById("lightbox-title");
  const thumbRail = document.getElementById("lightbox-thumbs");
  const prevBtn = galleryModal?.querySelector(".prev");
  const nextBtn = galleryModal?.querySelector(".next");

  let images = [];
  let labels = "";
  let index = 0;
  let thumbs = [];

  /** Rebuilds the thumbnail rail for a newly opened gallery. */
  function buildThumbs() {
    thumbRail.textContent = "";
    thumbs = images.map((src, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "lightbox-thumb";
      btn.setAttribute("aria-label", `Show screenshot ${i + 1} of ${images.length}`);

      const img = document.createElement("img");
      img.src = src;
      img.alt = "";
      // setAttribute rather than the IDL property: the rail is horizontally
      // scrollable, so off-screen thumbs must genuinely defer their fetch.
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
      btn.append(img);

      btn.addEventListener("click", () => {
        index = i;
        render();
      });

      thumbRail.append(btn);
      return btn;
    });
  }

  /**
   * Scroll the rail so the active thumb is visible.
   *
   * Deliberately NOT scrollIntoView: that walks up and scrolls every ancestor
   * scroll container, including the document. Setting scrollLeft directly can
   * only ever move the rail.
   */
  function keepThumbVisible(btn) {
    const railStart = thumbRail.scrollLeft;
    const railEnd = railStart + thumbRail.clientWidth;
    const pad = 12;

    if (btn.offsetLeft < railStart) {
      thumbRail.scrollLeft = btn.offsetLeft - pad;
    } else if (btn.offsetLeft + btn.offsetWidth > railEnd) {
      thumbRail.scrollLeft = btn.offsetLeft + btn.offsetWidth - thumbRail.clientWidth + pad;
    }
  }

  function render() {
    galleryImg.src = images[index];
    galleryImg.alt = `${labels} — screenshot ${index + 1} of ${images.length}`;
    galleryCounter.textContent = `${index + 1} / ${images.length}`;
    galleryTitle.textContent = labels;

    thumbs.forEach((btn, i) => {
      if (i === index) {
        btn.setAttribute("aria-current", "true");
        keepThumbVisible(btn);
      } else {
        btn.removeAttribute("aria-current");
      }
    });

    // Warm the neighbours so arrow/swipe navigation feels instant.
    [index + 1, index - 1].forEach((i) => {
      const src = images[(i + images.length) % images.length];
      if (src) new Image().src = src;
    });
  }

  function step(delta) {
    if (images.length < 2) return;
    index = (index + delta + images.length) % images.length;
    render();
  }

  document.querySelectorAll(".tech-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      images = tab.dataset.images
        .split(",")
        .map((src) => src.trim())
        .filter(Boolean);
      if (!images.length) return;

      labels = tab.dataset.galleryLabel || tab.textContent.trim();
      index = 0;
      lightbox.classList.toggle("is-single", images.length < 2);
      buildThumbs();
      render();

      galleryModal.setAttribute("aria-label", `${labels} screenshots`);
      openDialog(galleryModal, tab);
    });
  });

  prevBtn?.addEventListener("click", () => step(-1));
  nextBtn?.addEventListener("click", () => step(1));

  /* ---- Swipe: phone users reach for this before they look for arrows ---- */
  if (galleryModal) {
    const SWIPE_THRESHOLD = 45; // px — below this it is a tap, not a swipe
    let startX = null;
    let startY = null;

    galleryModal.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "mouse") return;
      startX = event.clientX;
      startY = event.clientY;
    });

    galleryModal.addEventListener("pointerup", (event) => {
      if (startX === null) return;

      const dx = event.clientX - startX;
      const dy = event.clientY - startY;
      startX = null;
      startY = null;

      // Only act on a clearly horizontal gesture, so vertical scrolls pass through.
      if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
        step(dx < 0 ? 1 : -1);
      }
    });

    galleryModal.addEventListener("pointercancel", () => {
      startX = null;
      startY = null;
    });
  }

  /* ================= Content modals (experience + case studies) =========== */

  // Bound by attribute rather than class, so any button that names a dialog
  // works — timeline "Full details" and client-card "Case study" alike.
  document.querySelectorAll("[data-modal]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const dialog = document.getElementById(btn.dataset.modal);
      if (dialog) openDialog(dialog, btn);
    });
  });

  /* ========================= Global shortcuts ============================= */

  document.addEventListener("keydown", (event) => {
    if (!activeDialog) return;

    if (event.key === "Escape") {
      closeDialog();
      return;
    }

    trapFocus(event);

    if (activeDialog === galleryModal) {
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }
  });

  /* =========================== Scroll reveal ============================== */

  const revealables = [...document.querySelectorAll("[data-reveal], [data-reveal-stagger]")];

  if (revealables.length) {
    // If the browser can't observe, everything must still be visible — the
    // CSS hides these by default, so failing open is the only safe fallback.
    if (!("IntersectionObserver" in window)) {
      revealables.forEach((el) => el.classList.add("is-revealed"));
    } else {
      const reveal = new IntersectionObserver(
        (entries, observer) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add("is-revealed");
            observer.unobserve(entry.target); // reveal once, then stop watching
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
      );

      revealables.forEach((el) => reveal.observe(el));
    }
  }

  /* ============================ Footer year =============================== */

  const year = document.getElementById("footer-year");
  if (year) year.textContent = new Date().getFullYear();
})();
