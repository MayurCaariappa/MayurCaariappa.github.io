import {
  highlight,
  getBestSnippet,
  buildNoteData,
  createNoteEntry,
  escapeHtml,
  escapeRegExp,
} from "./utils.js";
import { journals, journalsUpdatedAt } from "./journal-data.js";

const NOTE_ITEM = "li[data-section]";

const HIDDEN_NOTE_PREVIEWS = {
  easter: "Easter egg unlocked!",
  journal: "Your journal shelf",
};

document.addEventListener("DOMContentLoaded", () => {
  const MOBILE_BREAKPOINT = 800;
  const MIN_WINDOW_WIDTH = 380;
  const MIN_WINDOW_HEIGHT = 440;
  const VIEWPORT_MARGIN = 12;
  const ARROW_SCROLL_STEP = 56;

  const windowEl = document.querySelector(".notes-window");
  const titleBar = document.querySelector(".title-bar");
  const titleActions = document.querySelector(".title-actions");
  const searchWrapper = document.querySelector(".search-wrapper");
  const mobileSearchSlot = document.querySelector(".mobile-search-slot");
  const backButton = document.querySelector(".back-button");
  const resizeHandle = document.querySelector(".resize-handle");
  const contentDiv = document.getElementById("note-content");
  const searchInput = document.getElementById("search-notes");
  const noResults = document.getElementById("no-results");
  const notesList = document.getElementById("notes-list");
  const notesCount = document.querySelector(".notes-count");
  const footer = document.getElementById("contact-footer");
  const mainContent = document.querySelector(".main-content");
  const sidebar = document.querySelector(".sidebar");
  const dock = document.querySelector(".dock");
  const dockButton = document.querySelector(".dock-item");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  const noteData = buildNoteData(notesList.querySelectorAll(NOTE_ITEM));

  let activeSection = "";
  // Last note opened; restored when a blank mobile list view widens to desktop.
  let lastSection = "about";
  // Last note the user picked (not one search auto-selected); restored when
  // the search is cleared.
  let chosenSection = "";
  let hiddenNotesRevealed = false;
  let hasCenteredWindow = false;
  let teardownJournal = null;
  // Incremented on every note load so a slow journal import can tell it is stale.
  let loadToken = 0;
  // Window position/size before "Zoom" filled the screen.
  let unzoomedGeometry = null;

  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;

  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;

  const initialSection = getSectionFromHash();
  if (window.location.hash && !initialSection) {
    history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}`,
    );
  }

  initSidebarA11y();
  bindEvents();
  // Always wire these up so a page first loaded at phone width can still be
  // dragged and resized after it is widened; the handlers ignore mobile.
  initWindowDragging();
  initWindowResizing();
  initWindowControls();
  updateList("");

  if (!isMobile()) centerWindow();

  activateSection(initialSection || "about", {
    updateHash: false,
    forceLoad: true,
  });
  syncResponsiveView();

  function bindEvents() {
    notesList.addEventListener("click", (event) => {
      const item = event.target.closest(NOTE_ITEM);
      if (!item || !isItemVisible(item)) return;
      activateSection(item.dataset.section);
    });

    notesList.addEventListener("keydown", (event) => {
      const item = event.target.closest(NOTE_ITEM);
      if (!item) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateSection(item.dataset.section);
      }
    });

    backButton.addEventListener("click", () => {
      if (!isMobile()) return;
      setMobileView("list");
      clearContent();
      // Clear the active key so tapping the same note again reloads its content.
      activeSection = "";
    });

    searchInput.addEventListener("input", (event) => {
      const { selectionStart, selectionEnd, value } = event.target;
      filterNotes(value);

      if (document.activeElement !== searchInput) {
        searchInput.focus({ preventScroll: true });
        if (selectionStart !== null && selectionEnd !== null) {
          searchInput.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    });

    contentDiv.addEventListener("click", handleCopyClick);
    document.addEventListener("keydown", handleGlobalShortcuts);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("resize", syncResponsiveView);
  }

  function initSidebarA11y() {
    notesList.querySelectorAll(NOTE_ITEM).forEach((item) => {
      if (!item.hasAttribute("tabindex")) item.tabIndex = -1;
      item.setAttribute(
        "aria-selected",
        item.classList.contains("active") ? "true" : "false",
      );
    });
  }

  /* ------------------------------------------------------------------ */
  /* Window position and size (desktop only)                            */
  /* ------------------------------------------------------------------ */

  function centerWindow() {
    const w = windowEl.offsetWidth;
    const h = windowEl.offsetHeight;
    const left = Math.max(20, (window.innerWidth - w) / 2);
    const top = Math.max(20, (window.innerHeight - h) / 2);

    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
    windowEl.style.margin = "0";
    hasCenteredWindow = true;
  }

  /* ------------------------------------------------------------------ */
  /* Traffic-light buttons and dock                                     */
  /* ------------------------------------------------------------------ */

  function initWindowControls() {
    titleBar
      .querySelector(".control.close")
      .addEventListener("click", () => hideWindow("close"));
    titleBar
      .querySelector(".control.minimize")
      .addEventListener("click", () => hideWindow("minimize"));
    titleBar
      .querySelector(".control.maximize")
      .addEventListener("click", toggleZoom);

    // Double-clicking the title bar zooms the window, as on macOS.
    titleBar.addEventListener("dblclick", (event) => {
      if (isMobile() || event.target.closest("button, a, input, .controls"))
        return;
      toggleZoom();
    });

    dockButton.addEventListener("click", showWindow);
  }

  function animateGeometry() {
    if (reducedMotion.matches) return;
    windowEl.classList.add("is-animating");
    window.setTimeout(() => windowEl.classList.remove("is-animating"), 320);
  }

  function toggleZoom() {
    if (isMobile()) return;
    animateGeometry();

    if (unzoomedGeometry) {
      Object.assign(windowEl.style, unzoomedGeometry);
      unzoomedGeometry = null;
      windowEl.classList.remove("is-zoomed");
      keepWindowInView();
      return;
    }

    const { left, top, width, height } = windowEl.style;
    unzoomedGeometry = { left, top, width, height };
    windowEl.classList.add("is-zoomed");
    fitZoomedWindow();
  }

  function fitZoomedWindow() {
    windowEl.style.left = `${VIEWPORT_MARGIN}px`;
    windowEl.style.top = `${VIEWPORT_MARGIN}px`;
    windowEl.style.width = `${window.innerWidth - VIEWPORT_MARGIN * 2}px`;
    windowEl.style.height = `${window.innerHeight - VIEWPORT_MARGIN * 2}px`;
  }

  function clearZoomState() {
    unzoomedGeometry = null;
    windowEl.classList.remove("is-zoomed");
  }

  /** Close and minimize both tuck the window into a dock icon. */
  function hideWindow(kind) {
    if (isMobile() || windowEl.classList.contains("is-hidden")) return;

    dock.hidden = false;
    const windowRect = windowEl.getBoundingClientRect();
    const dockRect = dockButton.getBoundingClientRect();
    const dx =
      kind === "minimize"
        ? dockRect.left + dockRect.width / 2 - (windowRect.left + windowRect.width / 2)
        : 0;
    const dy =
      kind === "minimize"
        ? dockRect.top + dockRect.height / 2 - (windowRect.top + windowRect.height / 2)
        : 0;

    windowEl.style.setProperty("--hide-x", `${dx}px`);
    windowEl.style.setProperty("--hide-y", `${dy}px`);
    windowEl.classList.toggle("is-closing", kind === "close");
    windowEl.classList.add("is-hidden");
    windowEl.setAttribute("aria-hidden", "true");
    windowEl.inert = true;
    dock.classList.add("is-visible");
    dockButton.focus({ preventScroll: true });
  }

  function showWindow() {
    windowEl.classList.remove("is-hidden", "is-closing");
    windowEl.removeAttribute("aria-hidden");
    windowEl.inert = false;
    dock.classList.remove("is-visible");
    window.setTimeout(
      () => {
        if (!windowEl.classList.contains("is-hidden")) dock.hidden = true;
      },
      reducedMotion.matches ? 0 : 320,
    );
    (findItem(activeSection) || searchInput).focus({ preventScroll: true });
  }

  /** Pulls the window back on screen after the browser window shrinks. */
  function keepWindowInView() {
    const rect = windowEl.getBoundingClientRect();
    const maxLeft = Math.max(
      VIEWPORT_MARGIN,
      window.innerWidth - rect.width - VIEWPORT_MARGIN,
    );
    const maxTop = Math.max(
      VIEWPORT_MARGIN,
      window.innerHeight - rect.height - VIEWPORT_MARGIN,
    );
    const left = Math.min(Math.max(rect.left, VIEWPORT_MARGIN), maxLeft);
    const top = Math.min(Math.max(rect.top, VIEWPORT_MARGIN), maxTop);

    if (left !== rect.left) windowEl.style.left = `${left}px`;
    if (top !== rect.top) windowEl.style.top = `${top}px`;
  }

  function initWindowDragging() {
    titleBar.addEventListener("pointerdown", startDrag);

    function startDrag(event) {
      if (
        event.target.closest(".controls, .title-actions, .back-button") ||
        isMobile()
      ) {
        return;
      }

      const rect = windowEl.getBoundingClientRect();
      clearZoomState();
      isDragging = true;
      dragStartX = event.clientX;
      dragStartY = event.clientY;
      dragStartLeft = rect.left;
      dragStartTop = rect.top;

      windowEl.classList.add("dragging");
      document.body.style.userSelect = "none";
      event.preventDefault();
    }

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!isDragging) return;

        const dx = event.clientX - dragStartX;
        const dy = event.clientY - dragStartY;
        const titleHeight = titleBar.offsetHeight;

        let nextLeft = dragStartLeft + dx;
        let nextTop = dragStartTop + dy;

        nextLeft = Math.max(
          -windowEl.offsetWidth + 120,
          Math.min(nextLeft, window.innerWidth - 120),
        );
        nextTop = Math.max(
          -titleHeight + 40,
          Math.min(nextTop, window.innerHeight - titleHeight - 20),
        );

        windowEl.style.left = `${nextLeft}px`;
        windowEl.style.top = `${nextTop}px`;
        event.preventDefault();
      },
      { passive: false },
    );

    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  function stopDrag() {
    if (!isDragging) return;
    isDragging = false;
    windowEl.classList.remove("dragging");
    document.body.style.userSelect = "";
  }

  function initWindowResizing() {
    if (!resizeHandle) return;

    resizeHandle.addEventListener("pointerdown", (event) => {
      if (isMobile()) return;

      clearZoomState();
      isResizing = true;
      resizeStartX = event.clientX;
      resizeStartY = event.clientY;
      resizeStartWidth = windowEl.offsetWidth;
      resizeStartHeight = windowEl.offsetHeight;

      windowEl.classList.add("dragging");
      document.body.style.userSelect = "none";
      event.preventDefault();
    });

    window.addEventListener(
      "pointermove",
      (event) => {
        if (!isResizing) return;

        const dx = event.clientX - resizeStartX;
        const dy = event.clientY - resizeStartY;

        windowEl.style.width = `${Math.max(MIN_WINDOW_WIDTH, resizeStartWidth + dx)}px`;
        windowEl.style.height = `${Math.max(MIN_WINDOW_HEIGHT, resizeStartHeight + dy)}px`;
        event.preventDefault();
      },
      { passive: false },
    );

    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  function stopResize() {
    if (!isResizing) return;
    isResizing = false;
    windowEl.classList.remove("dragging");
    document.body.style.userSelect = "";
  }

  /* ------------------------------------------------------------------ */
  /* Keyboard                                                           */
  /* ------------------------------------------------------------------ */

  function handleGlobalShortcuts(event) {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey)
      return;

    const target = event.target instanceof Element ? event.target : null;
    const isTyping = Boolean(
      target?.closest("input, textarea, select") || target?.isContentEditable,
    );

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (event.key === "Escape") {
      if (target === searchInput && searchInput.value) {
        searchInput.value = "";
        filterNotes("");
        return;
      }

      if (isMobile() && windowEl.dataset.view === "content") {
        backButton.click();
      }
      return;
    }

    if (isTyping) return;

    const inSidebar = Boolean(target && notesList.contains(target));
    const nothingFocused =
      !target || target === document.body || target === document.documentElement;

    if (event.key === "j" || event.key === "J") {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (event.key === "k" || event.key === "K") {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      const direction = event.key === "ArrowDown" ? 1 : -1;

      // In the list, arrows move between notes. Elsewhere they scroll the
      // note; the browser already does that when focus is inside it.
      if (inSidebar) {
        event.preventDefault();
        moveSelection(direction);
      } else if (nothingFocused) {
        event.preventDefault();
        mainContent.scrollBy({ top: direction * ARROW_SCROLL_STEP });
      }
      return;
    }

    // Enter on links, buttons and list items keeps its normal behaviour.
    if (event.key === "Enter" && nothingFocused) {
      const selected = getSelectedItem();
      if (selected && isItemVisible(selected)) {
        event.preventDefault();
        activateSection(selected.dataset.section);
      }
    }
  }

  function getSectionFromHash() {
    let key = "";
    try {
      key = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return "";
    }
    const item = key ? findItem(key) : null;
    return item && isItemVisible(item) ? key : "";
  }

  function handleHashChange() {
    const hashSection = getSectionFromHash();
    if (!hashSection || hashSection === activeSection) return;
    activateSection(hashSection, { updateHash: false, forceLoad: true });
  }

  /* ------------------------------------------------------------------ */
  /* Navigation                                                         */
  /* ------------------------------------------------------------------ */

  function moveSelection(direction) {
    const visibleItems = getVisibleItems();
    if (!visibleItems.length) return;

    const currentKey = activeSection || lastSection;
    const currentIndex = visibleItems.findIndex(
      (item) => item.dataset.section === currentKey,
    );
    const nextIndex =
      currentIndex === -1
        ? 0
        : Math.max(
            0,
            Math.min(visibleItems.length - 1, currentIndex + direction),
          );

    const target = visibleItems[nextIndex];
    if (!target) return;

    target.focus();
    activateSection(target.dataset.section);
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function activateSection(
    key,
    { updateHash = true, forceLoad = false, fromSearch = false } = {},
  ) {
    const item = findItem(key);
    if (!item || !isItemVisible(item)) return false;

    const changed = activeSection !== key;
    activeSection = key;
    lastSection = key;
    if (!fromSearch) chosenSection = key;

    notesList.querySelectorAll(NOTE_ITEM).forEach((entry) => {
      const isSelected = entry.dataset.section === key;
      entry.classList.toggle("active", isSelected);
      entry.setAttribute("aria-selected", isSelected ? "true" : "false");
      entry.tabIndex = isSelected ? 0 : -1;
    });

    if (changed || forceLoad) loadNote(key);

    if (updateHash) {
      history.replaceState(null, "", `#${encodeURIComponent(key)}`);
    }

    if (isMobile()) setMobileView("content");

    item.scrollIntoView({ block: "nearest" });
    return true;
  }

  function setMobileView(view) {
    if (!isMobile()) return;
    windowEl.dataset.view = view;
    titleBar.classList.toggle("content-view", view === "content");
  }

  function syncResponsiveView() {
    placeSearchField();

    if (isMobile()) {
      if (windowEl.classList.contains("is-hidden")) showWindow();
      setMobileView(windowEl.dataset.view === "content" ? "content" : "list");
      return;
    }

    windowEl.dataset.view = "desktop";
    titleBar.classList.remove("content-view");
    sidebar.style.display = "";

    if (unzoomedGeometry) {
      fitZoomedWindow();
    } else if (hasCenteredWindow) {
      keepWindowInView();
    } else {
      centerWindow();
    }

    // Desktop always shows a note; the mobile list view may have none open.
    if (!activeSection) {
      const lastItem = findItem(lastSection);
      const fallback =
        lastItem && isItemVisible(lastItem) ? lastItem : getVisibleItems()[0];
      if (fallback) {
        activateSection(fallback.dataset.section, {
          updateHash: false,
          forceLoad: true,
        });
      }
    }
  }

  /** iOS Notes puts search under the large title; macOS keeps it in the toolbar. */
  function placeSearchField() {
    const target = isMobile() ? mobileSearchSlot : titleActions;
    if (searchWrapper.parentElement === target) return;
    const hadFocus = document.activeElement === searchInput;
    target.append(searchWrapper);
    if (hadFocus) searchInput.focus({ preventScroll: true });
  }

  /* ------------------------------------------------------------------ */
  /* Search                                                             */
  /* ------------------------------------------------------------------ */

  /** Filters the sidebar and refreshes titles, previews, headers and count. */
  function updateList(rawTerm) {
    const term = rawTerm.trim();
    const lowerTerm = term.toLowerCase();
    const isEasterQuery = lowerTerm === "easter";
    let visibleCount = 0;

    // Once revealed, the hidden notes stay for the rest of the visit.
    if (isEasterQuery) revealHiddenNotes();

    notesList.querySelectorAll(NOTE_ITEM).forEach((item) => {
      const key = item.dataset.section;
      const data = noteData[key];
      if (!data) return;

      const titleEl = item.querySelector(".note-title");
      const previewEl = item.querySelector(".note-preview");

      if (isEasterQuery) {
        const preview = HIDDEN_NOTE_PREVIEWS[key] || "";
        item.style.display = preview ? "" : "none";
        titleEl.innerHTML = highlight(data.title, "");
        renderPreview(previewEl, data, escapeHtml(preview));
        if (preview) visibleCount++;
        return;
      }

      const matchTitle = data.lowerTitle.includes(lowerTerm);
      const matchContent = data.lowerContent.includes(lowerTerm);
      const matches = !term || matchTitle || matchContent;

      item.style.display = matches ? "" : "none";
      if (matches) visibleCount++;

      titleEl.innerHTML = highlight(data.title, matchTitle ? term : "");

      const previewHtml =
        term && matchContent
          ? highlight(
              getBestSnippet(data.plainContent, term, data.lowerContent),
              term,
            )
          : escapeHtml(data.excerpt);
      renderPreview(previewEl, data, previewHtml);
    });

    notesList.querySelectorAll("[data-group-header]").forEach((header) => {
      const group = header.dataset.groupHeader;
      const hasVisibleNotes = Array.from(
        notesList.querySelectorAll(`${NOTE_ITEM}[data-group="${group}"]`),
      ).some(isItemVisible);
      header.style.display = hasVisibleNotes ? "" : "none";
    });

    noResults.classList.toggle("hidden", visibleCount > 0 || !term);
    notesCount.textContent = `${visibleCount} ${visibleCount === 1 ? "Note" : "Notes"}`;
    return visibleCount;
  }

  function renderPreview(previewEl, data, html) {
    const date = data.date
      ? `<span class="note-date">${escapeHtml(data.date)}</span>`
      : "";
    previewEl.innerHTML = `${date}<span class="note-snippet">${html}</span>`;
  }

  function filterNotes(rawTerm) {
    const term = rawTerm.trim();
    const visibleCount = updateList(rawTerm);

    // On mobile the search box lives in the list view: filter the list and
    // let the user tap a result, rather than jumping into a note mid-typing.
    if (isMobile()) return;

    if (visibleCount === 0) {
      clearContent();
      return;
    }

    if (!term && chosenSection && chosenSection !== activeSection) {
      const chosenItem = findItem(chosenSection);
      if (chosenItem && isItemVisible(chosenItem)) {
        activateSection(chosenSection, { forceLoad: true, fromSearch: true });
        return;
      }
    }

    const activeItem = findItem(activeSection);
    if (!activeItem || !isItemVisible(activeItem)) {
      const firstVisible = getVisibleItems()[0];
      activateSection(firstVisible.dataset.section, {
        updateHash: true,
        forceLoad: true,
        fromSearch: true,
      });
      return;
    }

    const isEmpty = !contentDiv.hasChildNodes();
    if (activeSection === "journal") {
      if (isEmpty) loadNote("journal");
      return;
    }

    // Re-render the open note so its highlights follow the search term.
    if (isEmpty || contentDiv.dataset.term !== term) {
      loadNote(activeSection, { animate: isEmpty });
    }
  }

  /* ------------------------------------------------------------------ */
  /* Note content                                                       */
  /* ------------------------------------------------------------------ */

  function unmountJournal() {
    teardownJournal?.();
    teardownJournal = null;
  }

  function clearContent() {
    unmountJournal();
    contentDiv.replaceChildren();
    delete contentDiv.dataset.term;
    contentDiv.classList.remove("fade-in", "slide-in");
    footer.classList.remove("visible");
    mainContent.style.paddingBottom = "0";
  }

  function fadeInContent() {
    contentDiv.classList.remove("fade-in", "slide-in");
    // Flush styles so the transition starts from the hidden state.
    void contentDiv.offsetWidth;
    requestAnimationFrame(() => {
      contentDiv.classList.add("fade-in", "slide-in");
    });
  }

  function loadNote(key, { animate = true } = {}) {
    const token = ++loadToken;

    if (key === "journal") {
      clearContent();
      mainContent.scrollTop = 0;
      // The journal viewer is only downloaded the first time it is opened.
      import("./journal.js")
        .then(({ initJournalViewer }) => {
          if (token !== loadToken) return;
          teardownJournal = initJournalViewer(contentDiv);
          fadeInContent();
        })
        .catch(() => {
          if (token !== loadToken) return;
          contentDiv.textContent = "The journal couldn't be loaded. Please refresh and try again.";
          fadeInContent();
        });
      return;
    }

    const data = noteData[key];
    if (!data?.template) return;

    unmountJournal();
    const scrollTop = mainContent.scrollTop;
    const fragment = data.template.content.cloneNode(true);
    const term = searchInput.value.trim();
    const timestampEl = fragment.querySelector(".note-timestamp");

    if (timestampEl?.dataset.time) {
      timestampEl.textContent = timestampEl.dataset.time;
    }

    if (term) highlightFragment(fragment, term);

    contentDiv.replaceChildren(fragment);
    contentDiv.dataset.term = term;

    footer.classList.toggle("visible", key === "contact");
    mainContent.style.paddingBottom = key === "contact" ? "48px" : "0";

    if (key === "skills") {
      initChecklist();
    }

    if (animate) {
      mainContent.scrollTop = 0;
      fadeInContent();
    } else {
      mainContent.scrollTop = scrollTop;
    }
  }

  function highlightFragment(fragment, term) {
    const matcher = new RegExp(escapeRegExp(term), "i");
    const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    let node;

    while ((node = walker.nextNode())) {
      if (matcher.test(node.nodeValue)) textNodes.push(node);
    }

    textNodes.forEach((textNode) => {
      const template = document.createElement("template");
      template.innerHTML = highlight(textNode.nodeValue, term);
      textNode.replaceWith(template.content);
    });
  }

  /** Skills read as completed checklist items unless the visitor unticks them. */
  function initChecklist() {
    contentDiv.querySelectorAll("ul.checklist li").forEach((item) => {
      const skillId = item.dataset.skillId;
      if (!skillId) return;

      const storageKey = `skill-checked-${skillId}`;
      item.classList.toggle("checked", readStorage(storageKey) !== "false");
      item.setAttribute("role", "checkbox");
      item.tabIndex = 0;
      const syncAria = () =>
        item.setAttribute(
          "aria-checked",
          String(item.classList.contains("checked")),
        );
      syncAria();

      const toggle = () => {
        item.classList.toggle("checked");
        syncAria();
        writeStorage(storageKey, String(item.classList.contains("checked")));
      };

      item.onclick = (event) => {
        if (event.target.closest("a")) return;
        // Don't toggle when the visitor is selecting text to copy.
        if (String(window.getSelection?.() ?? "").length) return;
        toggle();
      };
      item.onkeydown = (event) => {
        if (event.key === " " || event.key === "Enter") {
          event.preventDefault();
          toggle();
        }
      };
    });
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // Storage can be unavailable (e.g. private mode); the tick still shows.
    }
  }

  async function handleCopyClick(event) {
    const button = event.target.closest("[data-copy]");
    if (!button) return;

    const original = button.textContent;
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.textContent = "Copied";
    } catch {
      button.textContent = "Press ⌘C";
      const link = button.parentElement.querySelector("a");
      if (link) window.getSelection()?.selectAllChildren(link);
    }
    window.setTimeout(() => {
      button.textContent = original;
    }, 1600);
  }

  /* ------------------------------------------------------------------ */
  /* Hidden notes (Fun Facts + Journal)                                 */
  /* ------------------------------------------------------------------ */

  function revealHiddenNotes() {
    if (hiddenNotesRevealed) return;

    const easterTemplate = document.getElementById("section-easter");
    if (!easterTemplate) return;
    hiddenNotesRevealed = true;

    notesList.append(
      createNoteItem("easter", "Fun Facts"),
      createNoteItem("journal", "Journal"),
    );

    noteData.easter = createNoteEntry(
      "Fun Facts",
      easterTemplate.content.cloneNode(true),
      {
        template: easterTemplate,
        timestamp:
          easterTemplate.content.querySelector(".note-timestamp")?.dataset
            .time ?? "",
      },
    );

    const journalText = [
      "A quiet place for notes, sketches, and moments worth keeping.",
      ...journals.flatMap((journal) => [
        journal?.title ?? "",
        journal?.description ?? "",
      ]),
    ].join(" ");
    noteData.journal = createNoteEntry("Journal", null, {
      text: journalText,
      timestamp: journalsUpdatedAt,
    });
  }

  function createNoteItem(section, title) {
    const item = document.createElement("li");
    item.dataset.section = section;
    item.dataset.group = "notes";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");
    item.tabIndex = -1;

    const titleEl = document.createElement("div");
    titleEl.className = "note-title";
    titleEl.textContent = title;
    const previewEl = document.createElement("div");
    previewEl.className = "note-preview";

    item.append(titleEl, previewEl);
    return item;
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */

  function findItem(key) {
    if (!key) return null;
    return notesList.querySelector(`li[data-section="${CSS.escape(key)}"]`);
  }

  function isItemVisible(item) {
    return item.style.display !== "none";
  }

  function getVisibleItems() {
    return Array.from(notesList.querySelectorAll(NOTE_ITEM)).filter(isItemVisible);
  }

  function getSelectedItem() {
    return (
      notesList.querySelector('li[aria-selected="true"]') ||
      notesList.querySelector("li.active")
    );
  }
});
