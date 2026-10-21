import { journals } from "./journal-data.js";

const FALLBACK_COVER = "";

/** Mounts the read-only journal library and two-page reader into a container. */
export function initJournalViewer(container) {
  const root = document.createElement("section");
  root.className = "journal-app";
  root.setAttribute("aria-label", "Journal library");
  container.replaceChildren(root);

  const state = {
    journal: null,
    spreadIndex: 0,
    view: "library",
    isTurning: false,
    pendingFlip: null,
  };

  document.addEventListener("keydown", (event) => {
    if (state.view !== "reader" || state.isTurning) return;

    // Ignore keys while typing, but allow arrows when a button has focus.
    if (
      event.target.closest("input, textarea, select") ||
      event.target.isContentEditable
    ) {
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      requestTurn(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      requestTurn(-1);
    }
  });

  function requestTurn(direction) {
    const pages = state.journal?.pages ?? [];
    const total = pages.length;
    const currentIndex = state.spreadIndex;
    const nextIndex = currentIndex + direction * 2;
    if (state.isTurning || nextIndex < 0 || nextIndex >= total) return;

    // Capture the sheet that physically turns and the image on its reverse side.
    // Forward: the current right page turns over to reveal the next left page.
    // Backward: the current left page turns back to reveal the previous right page.
    const frontIndex = direction > 0 ? currentIndex + 1 : currentIndex;
    const backIndex = direction > 0 ? nextIndex : nextIndex + 1;
    state.pendingFlip = {
      direction,
      frontSrc: pages[frontIndex] || null,
      frontNumber: frontIndex < total ? frontIndex + 1 : null,
      backSrc: pages[backIndex] || null,
      backNumber: backIndex < total ? backIndex + 1 : null,
    };
    state.isTurning = true;
    state.spreadIndex = nextIndex;
    render();
  }

  function finishTurn(sheet) {
    if (!state.isTurning) return;
    state.isTurning = false;
    state.pendingFlip = null;
    sheet?.remove();

    const total = state.journal?.pages?.length ?? 0;
    const previous = root.querySelector('[data-journal-action="previous"]');
    const next = root.querySelector('[data-journal-action="next"]');
    if (previous) previous.disabled = state.spreadIndex === 0;
    if (next) next.disabled = state.spreadIndex + 2 >= total;
  }

  render();

  function render() {
    root.replaceChildren();
    if (state.view === "reader" && state.journal) {
      renderReader();
    } else {
      renderLibrary();
    }
  }

  function renderLibrary() {
    const header = document.createElement("header");
    header.className = "journal-library-header";

    const eyebrow = document.createElement("p");
    eyebrow.className = "journal-eyebrow";
    eyebrow.textContent = "A collection of pages";

    const title = document.createElement("h1");
    title.textContent = "Journal";

    const description = document.createElement("p");
    description.className = "journal-intro";
    description.textContent =
      "A quiet place for notes, sketches, and moments worth keeping.";

    header.append(eyebrow, title, description);
    root.append(header);

    if (!Array.isArray(journals) || journals.length === 0) {
      const empty = document.createElement("div");
      empty.className = "journal-empty-state";
      empty.innerHTML = `
        <div class="journal-empty-icon" aria-hidden="true">✳</div>
        <h2>Your shelf is waiting</h2>
        <p>Add your journal page images to <code>images/journals/</code>, then list them in <code>js/journal-data.js</code>.</p>
        <p class="journal-empty-note">This viewer is read-only. Your images are part of the website, so they remain available after refresh and deployment.</p>
      `;
      root.append(empty);
      return;
    }

    const grid = document.createElement("div");
    grid.className = "journal-shelf";

    journals.forEach((journal) => {
      if (
        !journal ||
        !journal.id ||
        !journal.title ||
        !Array.isArray(journal.pages)
      )
        return;
      const card = document.createElement("button");
      card.type = "button";
      card.className = "journal-card";
      card.setAttribute("aria-label", `Open ${journal.title}`);

      const cover = document.createElement("span");
      cover.className = "journal-cover";
      if (journal.cover || FALLBACK_COVER) {
        cover.style.backgroundImage = `url("${journal.cover || FALLBACK_COVER}")`;
        cover.classList.add("has-cover-image");
      } else {
        cover.classList.add("journal-cover-placeholder");
        const mark = document.createElement("span");
        mark.className = "journal-cover-mark";
        mark.setAttribute("aria-hidden", "true");
        mark.textContent = journal.coverMark || "✳";
        cover.append(mark);
      }

      const coverTitle = document.createElement("span");
      coverTitle.className = "journal-cover-title";
      coverTitle.textContent = journal.title;
      cover.append(coverTitle);

      const meta = document.createElement("span");
      meta.className = "journal-card-meta";
      meta.textContent = `${journal.pages.length} ${journal.pages.length === 1 ? "page" : "pages"}`;

      card.append(cover, meta);
      if (journal.description) {
        const detail = document.createElement("span");
        detail.className = "journal-card-description";
        detail.textContent = journal.description;
        card.append(detail);
      }
      card.addEventListener("click", () => {
        state.journal = journal;
        state.spreadIndex = 0;
        state.view = "reader";
        render();
      });
      grid.append(card);
    });

    root.append(grid);
  }

  function renderReader() {
    const journal = state.journal;
    const pages = journal.pages;
    const total = pages.length;
    const leftIndex = state.spreadIndex;
    const rightIndex = leftIndex + 1;
    const hasLeft = leftIndex < total;
    const hasRight = rightIndex < total;

    const topbar = document.createElement("div");
    topbar.className = "journal-reader-topbar";

    const back = makeButton("‹  All journals", "journal-back-button");

    back.addEventListener("click", () => {
      state.view = "library";
      state.isTurning = false;
      state.journal = null;
      state.spreadIndex = 0;
      state.pendingFlip = null;
      render();
    });

    const name = document.createElement("div");
    name.className = "journal-reader-name";
    name.textContent = journal.title;

    topbar.append(back, name);
    root.append(topbar);

    if (!total) {
      const empty = document.createElement("div");
      empty.className = "journal-empty-state journal-no-pages";
      empty.innerHTML =
        "<h2>No pages yet</h2><p>Add page image paths to this journal in <code>js/journal-data.js</code>.</p>";
      root.append(empty);
      return;
    }

    const stage = document.createElement("div");
    stage.className = "journal-book-stage";

    const book = document.createElement("div");
    book.className = "journal-book";
    book.setAttribute(
      "aria-label",
      `Pages ${leftIndex + 1}–${Math.min(rightIndex + 1, total)} of ${total}`,
    );

    book.append(
      makePage(
        hasLeft ? pages[leftIndex] : null,
        hasLeft ? leftIndex + 1 : null,
        "left",
      ),
    );
    book.append(
      makePage(
        hasRight ? pages[rightIndex] : null,
        hasRight ? rightIndex + 1 : null,
        "right",
      ),
    );

    if (state.pendingFlip) {
      const sheet = document.createElement("div");
      sheet.className = `journal-flip-sheet ${state.pendingFlip.direction > 0 ? "flip-forward" : "flip-backward"}`;
      sheet.setAttribute("aria-hidden", "true");
      sheet.append(
        makeFlipFace(
          state.pendingFlip.frontSrc,
          state.pendingFlip.frontNumber,
          "front",
        ),
        makeFlipFace(
          state.pendingFlip.backSrc,
          state.pendingFlip.backNumber,
          "back",
        ),
      );
      book.append(sheet);
      // Start after layout so the browser can animate from the flat, unturned sheet.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => sheet.classList.add("is-turning"));
      });
      sheet.addEventListener(
        "animationend",
        (event) => {
          if (event.target === sheet) finishTurn(sheet);
        },
        { once: true },
      );
      // Fallback for reduced-motion settings or browsers that skip animationend.
      window.setTimeout(() => {
        if (sheet.isConnected) finishTurn(sheet);
      }, 1200);
    }
    stage.append(book);
    root.append(stage);

    const controls = document.createElement("div");
    controls.className = "journal-page-controls";

    const previous = makeButton("← Previous", "journal-page-button");
    previous.disabled = leftIndex === 0 || state.isTurning;
    previous.dataset.journalAction = "previous";
    previous.addEventListener("click", () => requestTurn(-1));

    const counter = document.createElement("span");
    counter.className = "journal-page-counter";
    counter.textContent = `${leftIndex + 1}${hasRight ? `–${rightIndex + 1}` : ""} / ${total}`;
    counter.setAttribute("aria-live", "polite");

    const next = makeButton("Next →", "journal-page-button");
    next.disabled = leftIndex + 2 >= total || state.isTurning;
    next.dataset.journalAction = "next";
    next.addEventListener("click", () => requestTurn(1));

    controls.append(previous, counter, next);
    root.append(controls);

    const keyboardHint = document.createElement("p");
    keyboardHint.className = "journal-keyboard-hint";
    root.append(keyboardHint);

    // Touch swipe support for phones/tablets. Buttons remain available as an alternative.
    let touchStartX = null;
    book.addEventListener(
      "touchstart",
      (event) => {
        touchStartX = event.changedTouches[0]?.clientX ?? null;
      },
      { passive: true },
    );
    book.addEventListener(
      "touchend",
      (event) => {
        if (touchStartX === null) return;
        const delta = event.changedTouches[0].clientX - touchStartX;
        if (Math.abs(delta) > 45) requestTurn(delta < 0 ? 1 : -1);
        touchStartX = null;
      },
      { passive: true },
    );
  }

  function makeFlipFace(src, pageNumber, face) {
    const element = document.createElement("div");
    element.className = `journal-flip-face journal-flip-${face}`;
    if (src) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.draggable = false;
      image.loading = "eager";
      image.decoding = "async";
      element.append(image);
    }
    if (pageNumber) {
      const number = document.createElement("span");
      number.className = "journal-page-number";
      number.textContent = String(pageNumber);
      element.append(number);
    }
    return element;
  }

  function makePage(src, pageNumber, side) {
    const page = document.createElement("div");
    page.className = `journal-page journal-page-${side}`;
    if (src) {
      const image = document.createElement("img");
      image.src = src;
      image.alt = `${state.journal.title}, page ${pageNumber}`;
      image.loading = "eager";
      image.decoding = "async";
      image.addEventListener(
        "error",
        () => {
          page.classList.add("journal-page-missing");
          page.replaceChildren();
          const message = document.createElement("p");
          message.textContent = `Page image not found: ${src}`;
          page.append(message);
        },
        { once: true },
      );
      page.append(image);
      const number = document.createElement("span");
      number.className = "journal-page-number";
      number.textContent = String(pageNumber);
      page.append(number);
    } else {
      page.classList.add("journal-page-blank");
      page.setAttribute("aria-hidden", "true");
    }
    return page;
  }

  function makeButton(label, className) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    return button;
  }
}
