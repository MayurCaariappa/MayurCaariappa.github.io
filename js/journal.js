import { journals, journalsUpdatedAt } from "./journal-data.js";

// The turning sheet is split into vertical strips so it can bend like paper.
const STRIP_COUNT = 18;
const FLIP_DURATION = 1150;
// How far (degrees) the free edge of a page leads the spine mid-turn.
const MAX_CURL = 40;
const DEFAULT_PAGE_RATIO = 0.75;
const MIN_PAGE_HEIGHT = 150;
const DRAG_THRESHOLD = 6;

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const decodeCache = new Map();
// The open journal and spread, so remounting the viewer resumes reading.
const savedView = { journalId: null, spread: 0 };

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const easeInOutSine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const toRadians = (deg) => (deg * Math.PI) / 180;

function preload(src) {
  if (!src) return Promise.resolve(false);
  if (!decodeCache.has(src)) {
    const image = new Image();
    image.decoding = "async";
    image.src = src;
    decodeCache.set(
      src,
      image.decode().then(
        () => true,
        () => false,
      ),
    );
  }
  return decodeCache.get(src);
}

function whenDecoded(sources, timeout = 500) {
  return Promise.race([
    Promise.all(sources.map(preload)),
    new Promise((resolve) => window.setTimeout(resolve, timeout)),
  ]);
}

function measureRatio(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () =>
      resolve(
        image.naturalWidth && image.naturalHeight
          ? image.naturalWidth / image.naturalHeight
          : null,
      );
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

function el(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function makeButton(className, label) {
  const button = el("button", className, label);
  button.type = "button";
  return button;
}

function isValidJournal(journal) {
  return Boolean(
    journal && journal.id && journal.title && Array.isArray(journal.pages),
  );
}

/** Gives dark cover titles a light halo and light titles a dark one. */
function applyTitleContrast(titleEl) {
  const channels = getComputedStyle(titleEl).color.match(/[\d.]+/g);
  if (!channels || channels.length < 3) return;
  const [r, g, b] = channels.map(Number);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  titleEl.classList.toggle("is-dark", luminance < 0.5);
}

/**
 * Mounts the read-only journal library and two-page reader into a container.
 * Returns a cleanup function that removes global listeners and observers.
 */
export function initJournalViewer(container) {
  const root = el("section", "journal-app");
  root.setAttribute("aria-label", "Journal");
  container.replaceChildren(root);

  const scrollParent = container.closest(".main-content") || container;
  const state = { journal: null, spread: 0, flip: null };
  let reader = null;
  let drag = null;

  const resizeObserver = new ResizeObserver(() => layoutBook());
  resizeObserver.observe(scrollParent);
  document.addEventListener("keydown", onKeyDown);

  const resumeJournal = Array.isArray(journals)
    ? journals.find(
        (journal) =>
          isValidJournal(journal) && journal.id === savedView.journalId,
      )
    : null;
  if (resumeJournal) {
    openJournal(resumeJournal, savedView.spread);
  } else {
    renderLibrary();
  }

  return function destroy() {
    document.removeEventListener("keydown", onKeyDown);
    resizeObserver.disconnect();
    stopFlip();
    reader = null;
    drag = null;
  };

  function onKeyDown(event) {
    if (!reader || event.defaultPrevented) return;
    if (
      event.target.closest?.("input, textarea, select") ||
      event.target.isContentEditable
    ) {
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      turn(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      turn(-1);
    }
  }

  function stopFlip() {
    if (state.flip) cancelAnimationFrame(state.flip.raf);
    state.flip = null;
  }

  /* ------------------------------------------------------------------ */
  /* Library                                                            */
  /* ------------------------------------------------------------------ */

  function renderLibrary() {
    stopFlip();
    reader = null;
    drag = null;
    state.journal = null;
    savedView.journalId = null;
    root.replaceChildren();

    if (journalsUpdatedAt) {
      root.append(el("div", "note-timestamp", journalsUpdatedAt));
    }
    root.append(
      el("h1", null, "Journal"),
      el(
        "p",
        null,
        "A quiet place for notes, sketches, and moments worth keeping.",
      ),
    );

    const validJournals = Array.isArray(journals)
      ? journals.filter(isValidJournal)
      : [];

    if (!validJournals.length) {
      const empty = el("p", "journal-empty");
      empty.innerHTML =
        "No journals yet. Add page images to <code>images/journals/</code> and list them in <code>js/journal-data.js</code>.";
      root.append(empty);
      return;
    }

    const shelf = el("div", "journal-shelf");
    validJournals.forEach((journal) => shelf.append(makeCard(journal)));
    root.append(shelf);
    shelf.querySelectorAll(".journal-cover-title").forEach(applyTitleContrast);
  }

  function makeCard(journal) {
    const card = makeButton("journal-card");
    card.setAttribute("aria-label", `Open ${journal.title}`);

    const cover = el("span", "journal-cover");
    if (journal.cover) {
      cover.style.backgroundImage = `url(${JSON.stringify(journal.cover)})`;
    } else {
      cover.classList.add("journal-cover-placeholder");
      const mark = el("span", "journal-cover-mark", journal.coverMark || "✳");
      mark.setAttribute("aria-hidden", "true");
      cover.append(mark);
    }

    if (journal.showCoverTitle !== false) {
      const coverTitle = el("span", "journal-cover-title", journal.title);
      if (journal.titleColor) coverTitle.style.color = journal.titleColor;
      cover.append(coverTitle);
    }

    card.append(cover);
    if (journal.description) {
      card.append(el("span", "journal-card-description", journal.description));
    }
    const count = journal.pages.length;
    card.append(
      el(
        "span",
        "journal-card-meta",
        `${count} ${count === 1 ? "page" : "pages"}`,
      ),
    );

    card.addEventListener("click", () => openJournal(journal));
    return card;
  }

  /* ------------------------------------------------------------------ */
  /* Reader                                                             */
  /* ------------------------------------------------------------------ */

  function openJournal(journal, startSpread = 0) {
    stopFlip();
    state.journal = journal;
    state.spread = 0;
    root.replaceChildren();

    const back = makeButton("journal-back-button");
    const chevron = el("span", "journal-back-chevron", "‹");
    chevron.setAttribute("aria-hidden", "true");
    back.append(chevron, el("span", null, "Journals"));
    back.addEventListener("click", () => {
      renderLibrary();
      scrollParent.scrollTop = 0;
    });

    const title = el("h1", "journal-reader-title", journal.title);
    root.append(back, title);

    if (!journal.pages.length) {
      root.append(el("p", "journal-empty", "This journal has no pages yet."));
      return;
    }

    const stage = el("div", "journal-book-stage");
    const book = el("div", "journal-book");
    book.setAttribute("role", "group");
    const left = makePage("left");
    const right = makePage("right");
    const spine = el("div", "journal-spine");
    spine.setAttribute("aria-hidden", "true");
    book.append(left.el, right.el, spine);
    stage.append(book);

    const controls = el("div", "journal-page-controls");
    const previous = makeButton("journal-page-button", "‹ Previous");
    const counter = el("span", "journal-page-counter");
    counter.setAttribute("aria-live", "polite");
    const next = makeButton("journal-page-button", "Next ›");
    previous.addEventListener("click", () => turn(-1));
    next.addEventListener("click", () => turn(1));
    controls.append(previous, counter, next);

    const hint = el("div", "journal-hint");

    root.append(stage, controls, hint);
    scrollParent.scrollTop = 0;

    reader = {
      book,
      stage,
      left,
      right,
      previous,
      next,
      counter,
      ratio: Number(journal.pageRatio) || null,
    };

    book.addEventListener("pointerdown", onPointerDown);
    book.addEventListener("pointermove", onPointerMove);
    book.addEventListener("pointerup", onPointerUp);
    book.addEventListener("pointercancel", onPointerCancel);
    book.addEventListener("dragstart", (event) => event.preventDefault());

    // Spreads start on even page indexes; clamp a resumed spread into range.
    const lastIndex = Math.max(0, journal.pages.length - 1);
    const maxSpread = lastIndex - (lastIndex % 2);
    const spread = Math.min(
      Math.max(0, startSpread - (startSpread % 2)),
      maxSpread,
    );
    showSpread(spread);
    layoutBook();

    if (!reader.ratio) {
      const current = reader;
      measureRatio(journal.pages[0]).then((ratio) => {
        if (reader !== current || !ratio) return;
        reader.ratio = ratio;
        layoutBook();
      });
    }
  }

  function makePage(side) {
    const page = el("div", `journal-page journal-page-${side}`);
    const image = el("img");
    image.alt = "";
    image.draggable = false;
    image.decoding = "async";
    const missing = el("div", "journal-page-missing-text");
    const shade = el("div", "journal-page-shade");
    shade.setAttribute("aria-hidden", "true");
    page.append(image, missing, shade);

    image.addEventListener("error", () => {
      const src = image.getAttribute("src");
      if (!src) return;
      page.classList.add("is-missing");
      missing.textContent = `Page image not found: ${src}`;
    });

    return { el: page, image, shade };
  }

  /** Points a static page at a page index and resolves once it can paint. */
  function setPage(ref, index) {
    const src = state.journal?.pages[index];
    ref.el.classList.remove("is-missing");

    if (!src) {
      ref.el.classList.add("is-blank");
      ref.image.removeAttribute("src");
      ref.image.alt = "";
      return Promise.resolve();
    }

    ref.el.classList.remove("is-blank");
    if (ref.image.getAttribute("src") !== src) ref.image.src = src;
    ref.image.alt = `${state.journal.title}, page ${index + 1}`;
    return ref.image.decode().catch(() => {});
  }

  function showSpread(index) {
    state.spread = index;
    setPage(reader.left, index);
    setPage(reader.right, index + 1);
    updateControls();
    preloadAround(index);
  }

  function preloadAround(index) {
    const pages = state.journal?.pages ?? [];
    for (let i = index - 2; i <= index + 5; i++) {
      if (i >= 0 && i < pages.length) preload(pages[i]);
    }
  }

  function canTurn(direction) {
    const total = state.journal?.pages.length ?? 0;
    const target = state.spread + direction * 2;
    return target >= 0 && target < total;
  }

  function updateControls() {
    if (!reader) return;
    savedView.journalId = state.journal.id;
    savedView.spread = state.spread;
    const total = state.journal.pages.length;
    const first = state.spread + 1;
    const last = Math.min(state.spread + 2, total);
    const label = first === last ? `${first}` : `${first}–${last}`;

    reader.previous.disabled = !canTurn(-1);
    reader.next.disabled = !canTurn(1);
    reader.counter.textContent = `${label} of ${total}`;
    reader.book.setAttribute(
      "aria-label",
      `${state.journal.title}, page ${label} of ${total}`,
    );
    reader.left.el.classList.toggle("can-turn", canTurn(-1));
    reader.right.el.classList.toggle("can-turn", canTurn(1));
  }

  /** Sizes the book to the page image ratio so pages fill edge to edge. */
  function layoutBook() {
    if (!reader) return;
    const { book, stage } = reader;
    const ratio = reader.ratio || DEFAULT_PAGE_RATIO;
    const styles = getComputedStyle(scrollParent);
    const paddingY =
      parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const chromeHeight = root.offsetHeight - stage.offsetHeight;
    const availableHeight = Math.max(
      MIN_PAGE_HEIGHT,
      scrollParent.clientHeight - paddingY - chromeHeight - 4,
    );
    const availableWidth = stage.clientWidth;
    if (!availableWidth) return;

    const pageWidth = Math.floor(
      Math.min(availableWidth / 2, availableHeight * ratio),
    );
    const pageHeight = Math.round(pageWidth / ratio);

    book.style.width = `${pageWidth * 2}px`;
    book.style.height = `${pageHeight}px`;
    book.style.setProperty("--journal-page-w", `${pageWidth}px`);
  }

  /* ------------------------------------------------------------------ */
  /* Page turning                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Forward: the right page lifts at the spine and lands on the left, its
   * back showing the next left page; the next right page is revealed under it.
   * Backward mirrors this. The page it lands on is only swapped once covered.
   */
  function beginFlip(direction) {
    if (state.flip || !reader || !canTurn(direction)) return null;

    const pages = state.journal.pages;
    const from = state.spread;
    const target = from + direction * 2;
    const forward = direction > 0;

    const flip = {
      direction,
      target,
      progress: 0,
      raf: 0,
      settling: false,
      frontSrc: pages[forward ? from + 1 : from],
      backSrc: pages[forward ? target : target + 1],
      underRef: forward ? reader.right : reader.left,
      underIndex: forward ? target + 1 : target,
      underRestoreIndex: forward ? from + 1 : from,
      landRef: forward ? reader.left : reader.right,
      landIndex: forward ? target : target + 1,
    };
    flip.sheet = buildSheet(flip);
    reader.book.append(flip.sheet.el);
    reader.book.classList.add("is-turning");
    setPage(flip.underRef, flip.underIndex);

    state.flip = flip;
    renderFlip(flip);
    return flip;
  }

  function buildSheet(flip) {
    const forward = flip.direction > 0;
    const sheet = el(
      "div",
      `journal-flip-sheet ${forward ? "is-forward" : "is-backward"}`,
    );
    sheet.setAttribute("aria-hidden", "true");

    const strips = [];
    let parent = sheet;
    for (let i = 0; i < STRIP_COUNT; i++) {
      const strip = el("div", "journal-flip-strip");
      strip.style.width = i === 0 ? `${100 / STRIP_COUNT}%` : "100%";

      // Slice offsets (fractions of a page width) for each side of the strip.
      const nearSpine = i / STRIP_COUNT;
      const farSpine = 1 - (i + 1) / STRIP_COUNT;
      const isEdge = i === STRIP_COUNT - 1;
      const front = makeFace(
        flip.frontSrc,
        forward ? nearSpine : farSpine,
        forward ? 0 : 1,
        isEdge,
        "front",
      );
      const back = makeFace(
        flip.backSrc,
        forward ? farSpine : nearSpine,
        forward ? 1 : 0,
        isEdge,
        "back",
      );
      strip.append(front.el, back.el);
      parent.append(strip);
      parent = strip;
      strips.push({
        el: strip,
        frontShade: front.shade,
        backShade: back.shade,
      });
    }
    return { el: sheet, strips };
  }

  function makeFace(src, slice, nudge, isEdge, side) {
    const face = el("div", `journal-flip-face journal-flip-${side}`);
    if (isEdge) face.classList.add("is-edge");
    if (src) {
      const image = el("img");
      image.src = src;
      image.alt = "";
      image.draggable = false;
      image.style.setProperty("--slice", slice.toFixed(5));
      // Faces overlap by 1px to hide seams; shift the image to compensate.
      if (!isEdge && nudge) image.style.setProperty("--nudge", "1px");
      face.append(image);
    }
    const shade = el("div", "journal-flip-shade");
    face.append(shade);
    return { el: face, shade };
  }

  function renderFlip(flip) {
    const p = clamp(flip.progress, 0, 1);
    const sign = flip.direction > 0 ? -1 : 1;
    const hinge = 180 * p;
    const lead = clamp(MAX_CURL * Math.sin(Math.PI * p), 0, 180 - hinge);
    const bend = lead / (STRIP_COUNT - 1);

    let angle = hinge;
    flip.sheet.strips.forEach((strip, index) => {
      const local = index === 0 ? hinge : bend;
      if (index > 0) angle += bend;
      strip.el.style.transform = `rotateY(${(sign * local).toFixed(3)}deg)`;

      // Paper darkens as it turns away from the viewer's light.
      const facing = Math.abs(Math.cos(toRadians(angle)));
      strip.frontShade.style.opacity = ((1 - facing) * 0.5).toFixed(3);
      strip.backShade.style.opacity = (0.04 + (1 - facing) * 0.45).toFixed(3);
    });

    const edgeCos = Math.cos(toRadians(hinge + lead));
    const spineOnRight = flip.direction < 0;
    castShadow(
      flip.underRef,
      !spineOnRight,
      0.38 * (1 - p),
      (Math.max(0, edgeCos) + 0.35) * 100,
    );
    castShadow(
      flip.landRef,
      spineOnRight,
      0.32 * clamp((p - 0.3) / 0.7, 0, 1),
      (Math.max(0, -edgeCos) + 0.3) * 100,
    );
  }

  function castShadow(ref, fromLeft, strength, reach) {
    if (strength < 0.005) {
      ref.shade.style.background = "";
      return;
    }
    const direction = fromLeft ? "to right" : "to left";
    ref.shade.style.background = `linear-gradient(${direction}, rgba(20, 14, 6, ${strength.toFixed(3)}) 0%, rgba(20, 14, 6, ${(strength * 0.45).toFixed(3)}) ${(reach * 0.5).toFixed(1)}%, rgba(20, 14, 6, 0) ${reach.toFixed(1)}%)`;
  }

  function animateProgress(flip, to, duration, ease) {
    const from = flip.progress;
    const start = performance.now();
    return new Promise((resolve) => {
      const tick = (now) => {
        if (state.flip !== flip) {
          resolve(false);
          return;
        }
        const t = duration > 0 ? clamp((now - start) / duration, 0, 1) : 1;
        flip.progress = from + (to - from) * ease(t);
        renderFlip(flip);
        if (t < 1) {
          flip.raf = requestAnimationFrame(tick);
        } else {
          resolve(true);
        }
      };
      flip.raf = requestAnimationFrame(tick);
    });
  }

  async function settleFlip(flip, complete, duration, ease) {
    if (flip.settling) return;
    flip.settling = true;

    const finished = await animateProgress(
      flip,
      complete ? 1 : 0,
      duration,
      ease,
    );
    if (!finished || state.flip !== flip) return;

    // Swap the page beneath the sheet while it is still fully covered.
    if (complete) {
      state.spread = flip.target;
      await setPage(flip.landRef, flip.landIndex);
    } else {
      await setPage(flip.underRef, flip.underRestoreIndex);
    }
    if (state.flip !== flip) return;

    flip.sheet.el.remove();
    castShadow(flip.underRef, true, 0, 0);
    castShadow(flip.landRef, true, 0, 0);
    reader.book.classList.remove("is-turning");
    state.flip = null;
    updateControls();
    preloadAround(state.spread);
  }

  async function turn(direction) {
    if (state.flip || !reader || !canTurn(direction)) return;

    if (reducedMotion.matches) {
      showSpread(state.spread + direction * 2);
      return;
    }

    const flip = beginFlip(direction);
    if (!flip) return;
    await whenDecoded([
      flip.frontSrc,
      flip.backSrc,
      state.journal.pages[flip.underIndex],
    ]);
    if (state.flip !== flip) return;
    settleFlip(flip, true, FLIP_DURATION, easeInOutSine);
  }

  /* ------------------------------------------------------------------ */
  /* Drag / tap                                                         */
  /* ------------------------------------------------------------------ */

  function onPointerDown(event) {
    if (!reader || state.flip || drag) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const rect = reader.book.getBoundingClientRect();
    const spineX = rect.left + rect.width / 2;
    const direction = event.clientX >= spineX ? 1 : -1;
    if (!canTurn(direction)) return;

    drag = {
      pointerId: event.pointerId,
      direction,
      spineX,
      pageWidth: rect.width / 2,
      startX: event.clientX,
      startY: event.clientY,
      startTime: performance.now(),
      lastX: event.clientX,
      lastTime: performance.now(),
      velocity: 0,
      flip: null,
    };
    reader.book.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;

    const now = performance.now();
    const dx = event.clientX - drag.startX;
    const elapsed = now - drag.lastTime;
    if (elapsed > 0) {
      const instant = (event.clientX - drag.lastX) / elapsed;
      drag.velocity = drag.velocity * 0.6 + instant * 0.4;
    }
    drag.lastX = event.clientX;
    drag.lastTime = now;

    if (!drag.flip) {
      const towardSpine = -drag.direction * dx;
      if (towardSpine < DRAG_THRESHOLD || reducedMotion.matches) return;
      drag.flip = beginFlip(drag.direction);
      if (!drag.flip) {
        drag = null;
        return;
      }
    }

    // The grabbed point follows the pointer: x = spine + reach * cos(angle).
    const grabOffset = Math.abs(drag.startX - drag.spineX);
    const reach = clamp(grabOffset, drag.pageWidth * 0.45, drag.pageWidth);
    const travel = -drag.direction * dx;
    const cosine = clamp(1 - travel / reach, -1, 1);
    drag.flip.progress = Math.acos(cosine) / Math.PI;
    renderFlip(drag.flip);
  }

  function onPointerUp(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    drag = null;

    if (!current.flip) {
      const dx = event.clientX - current.startX;
      const dy = event.clientY - current.startY;
      const isTap =
        Math.hypot(dx, dy) < DRAG_THRESHOLD &&
        performance.now() - current.startTime < 500;
      const isSwipe = reducedMotion.matches && -current.direction * dx > 40;
      if (isTap || isSwipe) turn(current.direction);
      return;
    }

    // A pause before releasing means no flick, regardless of earlier speed.
    const idle = performance.now() - current.lastTime;
    const velocity = idle > 80 ? 0 : current.velocity;
    const towardVelocity = -current.direction * velocity;
    const complete =
      current.flip.progress > 0.5
        ? towardVelocity > -0.25
        : towardVelocity > 0.3;
    const remaining = complete
      ? 1 - current.flip.progress
      : current.flip.progress;
    settleFlip(
      current.flip,
      complete,
      Math.max(200, FLIP_DURATION * 0.75 * remaining),
      easeOutCubic,
    );
  }

  function onPointerCancel(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const { flip } = drag;
    drag = null;
    if (flip) {
      settleFlip(flip, false, Math.max(200, 600 * flip.progress), easeOutCubic);
    }
  }
}
