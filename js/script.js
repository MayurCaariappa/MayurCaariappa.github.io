import {
  highlight,
  getBestSnippet,
  buildNoteData,
  createNoteEntry,
  escapeHtml,
  escapeRegExp,
  formatListDate,
} from "./utils.js";
import { journals, journalsUpdatedAt } from "./journal-data.js";

const NOTE_ITEM = "li[data-section]";

const HIDDEN_NOTE_PREVIEWS = {
  easter: "Easter egg unlocked!",
  journal: "Your journal shelf",
};

const FOLDERS = [
  { id: "all", label: "All Notes", icon: "folder" },
  { id: "case-studies", label: "Case Studies", icon: "folder" },
  { id: "deleted", label: "Recently Deleted", icon: "trash" },
];

const FOLDER_ICONS = {
  folder:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4.2l1.8 2H19a1.5 1.5 0 0 1 1.5 1.5v8A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5Z"/></svg>',
  trash:
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12"/></svg>',
  lock: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>',
};

// A playful easter egg, not a secret: the same word also works in search.
const LOCK_ANSWER = "easter";
const LOCKED_PREVIEW = "Locked";

document.addEventListener("DOMContentLoaded", () => {
  const MOBILE_BREAKPOINT = 800;
  const MIN_WINDOW_WIDTH = 380;
  const MIN_WINDOW_HEIGHT = 440;
  const VIEWPORT_MARGIN = 12;
  const ARROW_SCROLL_STEP = 56;
  // The folders column appears once the window is wide enough for three panes.
  const FOLDERS_PANE_MIN_WIDTH = 1020;

  const windowEl = document.querySelector(".notes-window");
  const titleBar = document.querySelector(".title-bar");
  const titleActions = document.querySelector(".title-actions");
  const searchWrapper = document.querySelector(".search-wrapper");
  const mobileSearchSlot = document.querySelector(".mobile-search-slot");
  const mobileTitle = document.querySelector(".mobile-title");
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
  const sidebarHeader = document.querySelector(".sidebar-header");
  const folderList = document.querySelector(".folder-list");
  const tagList = document.querySelector(".tag-list");
  const scopeBar = document.querySelector(".scope-bar");
  const galleryView = document.querySelector(".gallery-view");
  const galleryButton = document.querySelector(".gallery-toggle");
  const shareButton = document.querySelector(".share-button");
  const toast = document.querySelector(".toast");
  const dock = document.querySelector(".dock");
  const dockButton = document.querySelector(".dock-item");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  adoptPrerenderedNotes();
  const noteData = buildNoteData(notesList.querySelectorAll(NOTE_ITEM));
  const allTags = collectTags();
  // The locked note's text stays out of previews and search until unlocked.
  const lockedEntry = noteData.private;
  if (lockedEntry) {
    noteData.private = {
      ...lockedEntry,
      plainContent: "",
      lowerContent: "",
      excerpt: LOCKED_PREVIEW,
    };
  }

  let activeSection = "";
  // Last note opened; restored when a blank mobile list view widens to desktop.
  let lastSection = "about";
  // Last note the user picked (not one search auto-selected); restored when
  // the search is cleared.
  let chosenSection = "";
  let hiddenNotesRevealed = false;
  let privateUnlocked = false;
  let activeFolder = "all";
  let activeTag = "";
  let galleryMode = false;
  let toastTimer = 0;
  let hasCenteredWindow = false;
  let teardownJournal = null;
  // Incremented on every note load so slow lazy imports can tell they are stale.
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
  initFoldersPane();
  updateList("");

  if (!isMobile()) centerWindow();

  openNote(initialSection || "about", {
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
    contentDiv.addEventListener("click", handleTagClick);
    folderList.addEventListener("click", handleScopeClick);
    tagList.addEventListener("click", handleScopeClick);
    scopeBar.addEventListener("click", handleScopeClick);
    galleryView.addEventListener("click", handleGalleryClick);
    galleryButton.addEventListener("click", () => setGalleryMode(!galleryMode));
    shareButton.addEventListener("click", shareCurrentNote);
    document.addEventListener("click", trackLinkClick);
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
        ? dockRect.left +
          dockRect.width / 2 -
          (windowRect.left + windowRect.width / 2)
        : 0;
    const dy =
      kind === "minimize"
        ? dockRect.top +
          dockRect.height / 2 -
          (windowRect.top + windowRect.height / 2)
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
        event.target.closest(
          ".controls, .title-actions, .back-button, .gallery-toggle",
        ) || isMobile()
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
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    )
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

      if (galleryMode) {
        setGalleryMode(false);
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
      !target ||
      target === document.body ||
      target === document.documentElement;

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
    // Any existing note can be linked to; openNote() widens the scope if needed.
    return key && findItem(key) ? key : "";
  }

  function handleHashChange() {
    const hashSection = getSectionFromHash();
    if (!hashSection || hashSection === activeSection) return;
    if (galleryMode) setGalleryMode(false);
    openNote(hashSection, { updateHash: false, forceLoad: true });
  }

  /** Opens a note, clearing search or switching folder if it's filtered out. */
  function openNote(key, options) {
    const item = findItem(key);
    if (!item) return false;

    if (!isItemVisible(item)) {
      const folder = item.dataset.folder || "notes";
      searchInput.value = "";
      activeTag = "";
      activeFolder =
        folder === "deleted" ||
        (folder === "case-studies" && activeFolder === "case-studies")
          ? folder
          : "all";
      updateList("");
    }
    return activateSection(key, options);
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
    if (changed) track("view_note", { note: key });

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
      if (galleryMode) setGalleryMode(false);
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

      // Search looks across every folder, like Notes; otherwise the current
      // folder or tag decides what's listed.
      const matchTitle = Boolean(term) && data.lowerTitle.includes(lowerTerm);
      const matchContent =
        Boolean(term) && data.lowerContent.includes(lowerTerm);
      const matches = term ? matchTitle || matchContent : isInScope(item);

      item.style.display = matches ? "" : "none";
      if (matches) visibleCount++;

      titleEl.innerHTML = highlight(data.title, matchTitle ? term : "");

      const previewHtml = matchContent
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

    const heading = term
      ? "Search"
      : activeTag
        ? `#${activeTag}`
        : FOLDERS.find((folder) => folder.id === activeFolder).label;
    sidebarHeader.textContent = heading;
    mobileTitle.textContent =
      term || (activeFolder === "all" && !activeTag) ? "Notes" : heading;

    renderScopeControls();
    if (galleryMode) renderGallery();
    return visibleCount;
  }

  function isInScope(item) {
    const folder = item.dataset.folder || "notes";
    if (activeTag) {
      return folder !== "deleted" && getTags(item).includes(activeTag);
    }
    if (activeFolder === "all") return folder !== "deleted";
    return folder === activeFolder;
  }

  function renderPreview(previewEl, data, html) {
    const label = formatListDate(data.dateValue);
    const date = label
      ? `<span class="note-date">${escapeHtml(label)}</span>`
      : "";
    previewEl.innerHTML = `${date}<span class="note-snippet">${html}</span>`;
  }

  function filterNotes(rawTerm) {
    const term = rawTerm.trim();
    const visibleCount = updateList(rawTerm);

    // On mobile the search box lives in the list view: filter the list and
    // let the user tap a result, rather than jumping into a note mid-typing.
    // The gallery shows results itself.
    if (isMobile() || galleryMode) return;

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
          contentDiv.textContent =
            "The journal couldn't be loaded. Please refresh and try again.";
          fadeInContent();
        });
      return;
    }

    const data = noteData[key];
    if (!data?.template) return;

    unmountJournal();

    if (key === "private" && !privateUnlocked) {
      renderLockScreen();
      return;
    }

    const scrollTop = mainContent.scrollTop;
    const fragment = data.template.content.cloneNode(true);
    const term = searchInput.value.trim();
    const timestampEl = fragment.querySelector(".note-timestamp");

    if (timestampEl?.dataset.time) {
      timestampEl.textContent = timestampEl.dataset.time;
    }

    const tags = getTags(findItem(key));
    if (tags.length) fragment.append(createTagRow(tags));

    if (term) highlightFragment(fragment, term);

    contentDiv.replaceChildren(fragment);
    contentDiv.dataset.term = term;

    footer.classList.toggle("visible", key === "contact");
    mainContent.style.paddingBottom = key === "contact" ? "48px" : "0";

    if (key === "skills") {
      initChecklist();
    }

    const activity = contentDiv.querySelector(".github-activity");
    if (activity) {
      // Loaded on demand; the plain link stays if the request fails.
      import("./github-activity.js")
        .then(({ renderGithubActivity }) =>
          renderGithubActivity(activity, () => token === loadToken),
        )
        .catch(() => {});
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
    track("copy_email", { note: activeSection });
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

    // Revealed notes join the regular "Notes" group, above Recently Deleted.
    const deletedHeader = notesList.querySelector(
      '[data-group-header="deleted"]',
    );
    deletedHeader.before(
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
    item.dataset.folder = "notes";
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

  /**
   * About ships as real HTML (for search engines and no-JS visitors); turn it
   * into a template like the other notes so it renders the same way.
   */
  function adoptPrerenderedNotes() {
    contentDiv.querySelectorAll("[data-prerendered]").forEach((article) => {
      const template = document.createElement("template");
      template.id = `section-${article.dataset.prerendered}`;
      template.innerHTML = article.innerHTML;
      document.body.append(template);
    });
  }

  function getTags(item) {
    return (item?.dataset.tags || "").split(/\s+/).filter(Boolean);
  }

  function collectTags() {
    const tags = new Set();
    notesList
      .querySelectorAll(`${NOTE_ITEM}[data-tags]`)
      .forEach((item) => getTags(item).forEach((tag) => tags.add(tag)));
    return [...tags].sort();
  }

  function createTagRow(tags) {
    const row = document.createElement("p");
    row.className = "note-tags";
    row.dataset.previewSkip = "";
    tags.forEach((tag) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tag-pill";
      button.dataset.tag = tag;
      button.textContent = `#${tag}`;
      button.title = `Show notes tagged #${tag}`;
      row.append(button);
    });
    return row;
  }

  /* ------------------------------------------------------------------ */
  /* Folders and tags                                                   */
  /* ------------------------------------------------------------------ */

  function initFoldersPane() {
    const update = () => {
      const wide =
        !isMobile() && windowEl.offsetWidth >= FOLDERS_PANE_MIN_WIDTH;
      windowEl.classList.toggle("has-folders", wide);
    };
    new ResizeObserver(update).observe(windowEl);
    update();
  }

  function countInFolder(folderId) {
    return Array.from(notesList.querySelectorAll(NOTE_ITEM)).filter((item) => {
      const folder = item.dataset.folder || "notes";
      return folderId === "all" ? folder !== "deleted" : folder === folderId;
    }).length;
  }

  /** Renders the folders column and the compact chip bar from one source. */
  function renderScopeControls() {
    const searching = Boolean(searchInput.value.trim());
    const folderButtons = FOLDERS.map((folder) => {
      const isActive = !searching && !activeTag && activeFolder === folder.id;
      return `<li><button type="button" class="folder-item${isActive ? " is-active" : ""}" data-folder="${folder.id}" aria-pressed="${isActive}">${FOLDER_ICONS[folder.icon]}<span class="folder-label">${escapeHtml(folder.label)}</span><span class="folder-count">${countInFolder(folder.id)}</span></button></li>`;
    }).join("");
    const tagButtons = allTags
      .map((tag) => {
        const isActive = !searching && activeTag === tag;
        return `<button type="button" class="tag-pill${isActive ? " is-active" : ""}" data-tag="${escapeHtml(tag)}" aria-pressed="${isActive}">#${escapeHtml(tag)}</button>`;
      })
      .join("");

    folderList.innerHTML = folderButtons;
    tagList.innerHTML = tagButtons;

    const chips = FOLDERS.map((folder) => {
      const isActive = !searching && !activeTag && activeFolder === folder.id;
      return `<button type="button" class="scope-chip${isActive ? " is-active" : ""}" data-folder="${folder.id}" aria-pressed="${isActive}">${escapeHtml(folder.id === "all" ? "All" : folder.label)}</button>`;
    }).join("");
    scopeBar.innerHTML = chips + tagButtons.replaceAll("tag-pill", "scope-chip tag-chip");
  }

  function handleScopeClick(event) {
    const button = event.target.closest("[data-folder], [data-tag]");
    if (!button) return;
    if (button.dataset.tag !== undefined) {
      const tag = button.dataset.tag;
      setScope("all", activeTag === tag ? "" : tag);
    } else {
      setScope(button.dataset.folder, "");
    }
  }

  function handleTagClick(event) {
    const button = event.target.closest(".note-tags [data-tag]");
    if (!button) return;
    setScope("all", button.dataset.tag);
    if (isMobile()) {
      setMobileView("list");
      sidebar.scrollTop = 0;
    }
  }

  function setScope(folder, tag) {
    activeFolder = folder;
    activeTag = tag;
    searchInput.value = "";
    updateList("");
    track("filter_notes", { folder, tag });

    if (isMobile() || galleryMode) return;
    const activeItem = findItem(activeSection);
    if (!activeItem || !isItemVisible(activeItem)) {
      const first = getVisibleItems()[0];
      if (first) {
        activateSection(first.dataset.section, { forceLoad: true });
      } else {
        clearContent();
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Gallery view                                                       */
  /* ------------------------------------------------------------------ */

  function setGalleryMode(on) {
    if (on && isMobile()) return;
    galleryMode = on;
    windowEl.classList.toggle("is-gallery", on);
    galleryView.hidden = !on;
    galleryButton.setAttribute("aria-pressed", String(on));
    galleryButton.setAttribute(
      "aria-label",
      on ? "Show notes as list" : "Show notes as gallery",
    );
    if (on) {
      renderGallery();
      track("gallery_view");
    } else if (!activeSection || !contentDiv.hasChildNodes()) {
      const first = getVisibleItems()[0];
      if (first) activateSection(first.dataset.section, { forceLoad: true });
    }
  }

  function renderGallery() {
    const cards = getVisibleItems().map((item) => {
      const key = item.dataset.section;
      const data = noteData[key];
      const isLocked = key === "private" && !privateUnlocked;
      const preview = isLocked
        ? `<span class="gallery-lock">${FOLDER_ICONS.lock}</span>`
        : `<span class="gallery-thumb-title">${escapeHtml(data.title)}</span><span class="gallery-thumb-text">${escapeHtml(data.excerpt)}</span>`;
      const date = formatListDate(data.dateValue);
      return `<button type="button" class="gallery-card${key === activeSection ? " is-active" : ""}" data-section="${escapeHtml(key)}"><span class="gallery-thumb">${preview}</span><span class="gallery-title">${escapeHtml(data.title)}</span><span class="gallery-date">${escapeHtml(date)}</span></button>`;
    });
    galleryView.innerHTML = cards.length
      ? `<div class="gallery-grid">${cards.join("")}</div>`
      : '<p class="gallery-empty">No notes</p>';
  }

  function handleGalleryClick(event) {
    const card = event.target.closest(".gallery-card");
    if (!card) return;
    setGalleryMode(false);
    openNote(card.dataset.section, { forceLoad: true });
  }

  /* ------------------------------------------------------------------ */
  /* Locked note                                                        */
  /* ------------------------------------------------------------------ */

  function renderLockScreen() {
    contentDiv.dataset.term = "";
    footer.classList.remove("visible");
    mainContent.style.paddingBottom = "0";
    contentDiv.innerHTML = `
      <div class="lock-screen">
        <span class="lock-icon">${FOLDER_ICONS.lock}</span>
        <h2>This note is locked.</h2>
        <p>Enter the note's password to view it.</p>
        <form class="lock-form">
          <input type="password" class="lock-input" placeholder="Password" aria-label="Note password" autocomplete="off" required />
          <button type="submit" class="lock-submit">OK</button>
        </form>
        <p class="lock-hint" hidden>Hint: 🥚 What do you hunt for in spring?</p>
      </div>`;

    const form = contentDiv.querySelector(".lock-form");
    const input = contentDiv.querySelector(".lock-input");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (input.value.trim().toLowerCase() === LOCK_ANSWER) {
        unlockPrivateNote();
        return;
      }
      input.value = "";
      contentDiv.querySelector(".lock-hint").hidden = false;
      form.classList.remove("is-wrong");
      void form.offsetWidth;
      form.classList.add("is-wrong");
      track("unlock_attempt", { success: false });
    });

    mainContent.scrollTop = 0;
    fadeInContent();
    if (!isMobile()) input.focus({ preventScroll: true });
  }

  function unlockPrivateNote() {
    privateUnlocked = true;
    if (lockedEntry) noteData.private = lockedEntry;
    findItem("private")?.removeAttribute("data-locked");
    revealHiddenNotes();
    updateList(searchInput.value);
    loadNote("private");
    track("unlock_attempt", { success: true });
  }

  /* ------------------------------------------------------------------ */
  /* Share, toast and analytics                                         */
  /* ------------------------------------------------------------------ */

  async function shareCurrentNote() {
    const key = activeSection || lastSection || "about";
    const title = noteData[key]?.title ?? "Portfolio";
    const url = `${window.location.origin}${window.location.pathname}#${encodeURIComponent(key)}`;
    track("share_note", { note: key });

    // Phones get the native share sheet, like the Notes share button.
    if (navigator.share && isMobile()) {
      try {
        await navigator.share({ title: `${title} · Mayur Caariappa`, url });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      showToast(`Link to “${title}” copied`);
    } catch {
      showToast(url);
    }
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(
      () => toast.classList.remove("is-visible"),
      2200,
    );
  }

  /** Sends a Google Analytics event if analytics has loaded. */
  function track(name, params = {}) {
    if (typeof window.gtag === "function") window.gtag("event", name, params);
  }

  function trackLinkClick(event) {
    const link = event.target.closest("a[href]");
    if (!link) return;
    const href = link.getAttribute("href");
    const note = activeSection || "none";
    if (href.endsWith(".pdf")) {
      track("resume_download", { note });
    } else if (href.startsWith("mailto:")) {
      track("email_click", { note });
    } else if (link.target === "_blank") {
      track("outbound_click", { note, url: link.href });
    }
  }

  function findItem(key) {
    if (!key) return null;
    return notesList.querySelector(`li[data-section="${CSS.escape(key)}"]`);
  }

  function isItemVisible(item) {
    return item.style.display !== "none";
  }

  function getVisibleItems() {
    return Array.from(notesList.querySelectorAll(NOTE_ITEM)).filter(
      isItemVisible,
    );
  }

  function getSelectedItem() {
    return (
      notesList.querySelector('li[aria-selected="true"]') ||
      notesList.querySelector("li.active")
    );
  }
});
