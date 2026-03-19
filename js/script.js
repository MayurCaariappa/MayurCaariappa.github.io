import { highlight, getBestSnippet, buildNoteData } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  const MOBILE_BREAKPOINT = 800;
  const windowEl = document.querySelector(".notes-window");
  const titleBar = document.querySelector(".title-bar");
  const backButton = document.querySelector(".back-button");
  const resizeHandle = document.querySelector(".resize-handle");
  const contentDiv = document.getElementById("note-content");
  const searchInput = document.getElementById("search-notes");
  const noResults = document.getElementById("no-results");
  const notesList = document.getElementById("notes-list");
  const footer = document.getElementById("contact-footer");
  const mainContent = document.querySelector(".main-content");
  const sidebar = document.querySelector(".sidebar");

  const isMobile = () => window.innerWidth <= MOBILE_BREAKPOINT;
  const noteData = buildNoteData(document.querySelectorAll("#notes-list li"));

  let activeSection =
    window.location.hash.replace("#", "") || getSelectedItem()?.dataset.section;
  let easterRevealed = false;
  let easterItemElement = null;
  let hasCenteredWindow = false;

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

  if (!isMobile()) {
    centerWindow();
    window.addEventListener("load", centerWindow, { once: true });
    initWindowDragging();
    initWindowResizing();
  }

  initSidebarA11y();
  bindEvents();
  filterNotes("");

  if (!activateSection(activeSection, { updateHash: false, forceLoad: true })) {
    activateSection("about", { updateHash: false, forceLoad: true });
  }

  syncResponsiveView();

  function bindEvents() {
    notesList.addEventListener("click", (event) => {
      const item = event.target.closest("li");
      if (!item || item.style.display === "none") return;
      activateSection(item.dataset.section);
    });

    notesList.addEventListener("keydown", (event) => {
      const item = event.target.closest("li");
      if (!item) return;

      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        activateSection(item.dataset.section);
      }
    });

    backButton.addEventListener("click", () => {
      if (!isMobile()) return;
      setMobileView("list");
      contentDiv.innerHTML = "";
      contentDiv.classList.remove("fade-in", "slide-in");
      footer.classList.remove("visible");
      mainContent.style.paddingBottom = "0";
    });

    searchInput.addEventListener("input", (event) => {
      filterNotes(event.target.value);
    });

    document.addEventListener("keydown", handleGlobalShortcuts);
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("resize", syncResponsiveView);
  }

  function initSidebarA11y() {
    notesList.querySelectorAll("li").forEach((item) => {
      if (!item.hasAttribute("tabindex")) item.tabIndex = -1;
      item.setAttribute(
        "aria-selected",
        item.classList.contains("active") ? "true" : "false"
      );
    });
  }

  function centerWindow() {
    if (hasCenteredWindow) return;
    const w = windowEl.offsetWidth;
    const h = windowEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const left = Math.max(20, (vw - w) / 2);
    const top = Math.max(20, (vh - h) / 2);

    windowEl.style.left = `${left}px`;
    windowEl.style.top = `${top}px`;
    windowEl.style.margin = "0";
    windowEl.style.transform = "none";
    hasCenteredWindow = true;
  }

  function initWindowDragging() {
    titleBar.addEventListener("pointerdown", startDrag);

    function startDrag(event) {
      if (
        event.target.closest(".controls, .search-wrapper, .back-button") ||
        isMobile()
      ) {
        return;
      }

      const rect = windowEl.getBoundingClientRect();
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
          Math.min(nextLeft, window.innerWidth - 120)
        );
        nextTop = Math.max(
          -titleHeight + 40,
          Math.min(nextTop, window.innerHeight - titleHeight - 20)
        );

        windowEl.style.left = `${nextLeft}px`;
        windowEl.style.top = `${nextTop}px`;
        event.preventDefault();
      },
      { passive: false }
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

        windowEl.style.width = `${Math.max(360, resizeStartWidth + dx)}px`;
        windowEl.style.height = `${Math.max(420, resizeStartHeight + dy)}px`;
        event.preventDefault();
      },
      { passive: false }
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

  function handleGlobalShortcuts(event) {
    const isTyping =
      document.activeElement === searchInput ||
      document.activeElement?.matches("input, textarea");

    if (event.key === "/" && !isTyping) {
      event.preventDefault();
      searchInput.focus();
      searchInput.select();
      return;
    }

    if (event.key === "Escape") {
      if (document.activeElement === searchInput && searchInput.value) {
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

    const nextKeyMap = ["ArrowDown", "j", "J"];
    const previousKeyMap = ["ArrowUp", "k", "K"];

    if (nextKeyMap.includes(event.key)) {
      event.preventDefault();
      moveSelection(1);
      return;
    }

    if (previousKeyMap.includes(event.key)) {
      event.preventDefault();
      moveSelection(-1);
      return;
    }

    if (event.key === "Enter") {
      const selected = getSelectedItem();
      if (selected) {
        event.preventDefault();
        activateSection(selected.dataset.section);
      }
    }
  }

  function handleHashChange() {
    const hashSection = window.location.hash.replace("#", "");
    if (!hashSection || hashSection === activeSection) return;
    activateSection(hashSection, { updateHash: false, forceLoad: true });
  }

  function moveSelection(direction) {
    const visibleItems = getVisibleItems();
    if (!visibleItems.length) return;

    const currentIndex = Math.max(
      0,
      visibleItems.findIndex((item) => item.dataset.section === activeSection)
    );
    const nextIndex = Math.max(
      0,
      Math.min(visibleItems.length - 1, currentIndex + direction)
    );

    const target = visibleItems[nextIndex];
    if (!target) return;

    target.focus();
    activateSection(target.dataset.section);
    target.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  function activateSection(
    key,
    { updateHash = true, forceLoad = false } = {}
  ) {
    const item = notesList.querySelector(`li[data-section="${key}"]`);
    if (!item || item.style.display === "none") return false;

    const changed = activeSection !== key;
    activeSection = key;

    notesList.querySelectorAll("li").forEach((entry) => {
      const isSelected = entry.dataset.section === key;
      entry.classList.toggle("active", isSelected);
      entry.setAttribute("aria-selected", isSelected ? "true" : "false");
      entry.tabIndex = isSelected ? 0 : -1;
    });

    if (changed || forceLoad) loadNote(key);

    if (updateHash) {
      history.replaceState(null, "", `#${key}`);
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
    if (isMobile()) {
      setMobileView(windowEl.dataset.view === "content" ? "content" : "list");
      return;
    }

    windowEl.dataset.view = "desktop";
    titleBar.classList.remove("content-view");
    sidebar.style.display = "";
  }

  function filterNotes(rawTerm) {
    const term = rawTerm.trim();
    const lowerTerm = term.toLowerCase();
    let visibleCount = 0;

    const shouldShowEaster = lowerTerm === "easter";
    if (shouldShowEaster && !easterRevealed) {
      revealEasterEgg();
      easterRevealed = true;
    } else if (!shouldShowEaster && easterRevealed) {
      removeEasterEgg();
      easterRevealed = false;
    }

    notesList.querySelectorAll("li").forEach((item) => {
      const key = item.dataset.section;
      const data = noteData[key];
      if (!data) return;

      if (key === "easter") {
        const isVisible = lowerTerm === "easter";
        const previewEl = item.querySelector(".note-preview");
        item.style.display = isVisible ? "" : "none";
        previewEl.textContent = isVisible ? "Easter egg unlocked!" : "";
        previewEl.style.display = isVisible ? "block" : "none";
        if (isVisible) visibleCount++;
        return;
      }

      const matchTitle = data.lowerTitle.includes(lowerTerm);
      const matchContent = data.lowerContent.includes(lowerTerm);
      const matches = !term || matchTitle || matchContent;

      item.style.display = matches ? "" : "none";
      if (matches) visibleCount++;

      const titleEl = item.querySelector(".note-title");
      const previewEl = item.querySelector(".note-preview");
      titleEl.innerHTML = highlight(data.title, matchTitle ? term : "");

      const previewText = matchContent
        ? getBestSnippet(data.plainContent, term, data.lowerContent)
        : "";

      previewEl.innerHTML = highlight(previewText, term);
      previewEl.style.display = previewText ? "block" : "none";
    });

    noResults.classList.toggle("hidden", visibleCount > 0 || !term);

    if (visibleCount === 0 && term) {
      contentDiv.innerHTML = "";
      contentDiv.classList.remove("fade-in", "slide-in");
      return;
    }

    const activeItem = notesList.querySelector(`li[data-section="${activeSection}"]`);
    if (!activeItem || activeItem.style.display === "none") {
      const firstVisible = getVisibleItems()[0];
      if (firstVisible) {
        activateSection(firstVisible.dataset.section, {
          updateHash: true,
          forceLoad: true,
        });
      }
      return;
    }

    if (!term) loadNote(activeSection);
  }

  function loadNote(key) {
    const data = noteData[key];
    if (!data) return;

    contentDiv.classList.remove("fade-in", "slide-in");
    void contentDiv.offsetWidth;

    const fragment = data.template.content.cloneNode(true);
    const term = searchInput.value.trim();
    const timestampEl = fragment.querySelector(".note-timestamp");

    if (timestampEl?.dataset.time) {
      timestampEl.textContent = timestampEl.dataset.time;
    }

    if (term) {
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
      const textNodes = [];
      let node;

      while ((node = walker.nextNode())) {
        if (node.nodeValue.trim()) textNodes.push(node);
      }

      textNodes.forEach((textNode) => {
        const html = highlight(textNode.nodeValue, term);
        if (html === textNode.nodeValue) return;
        const span = document.createElement("span");
        span.innerHTML = html;
        textNode.parentNode.replaceChild(span, textNode);
      });
    }

    contentDiv.innerHTML = "";
    contentDiv.appendChild(fragment);

    footer.classList.toggle("visible", key === "contact");
    mainContent.style.paddingBottom = key === "contact" ? "48px" : "0";

    if (key === "skills") {
      initChecklist();
    }

    requestAnimationFrame(() => {
      contentDiv.classList.add("fade-in", "slide-in");
      contentDiv.focus({ preventScroll: true });
    });
  }

  function initChecklist() {
    contentDiv.querySelectorAll("ul.checklist li").forEach((item) => {
      const skillId = item.dataset.skillId;
      if (!skillId) return;

      const isChecked =
        localStorage.getItem(`skill-checked-${skillId}`) === "true";
      item.classList.toggle("checked", isChecked);

      item.onclick = (event) => {
        if (event.target.closest("a")) return;
        item.classList.toggle("checked");
        localStorage.setItem(
          `skill-checked-${skillId}`,
          String(item.classList.contains("checked"))
        );
      };
    });
  }

  function revealEasterEgg() {
    if (easterItemElement) return;

    const easterTemplate = document.getElementById("section-easter");
    if (!easterTemplate) return;

    const easterItem = document.createElement("li");
    easterItem.dataset.section = "easter";
    easterItem.setAttribute("role", "option");
    easterItem.setAttribute("aria-selected", "false");
    easterItem.tabIndex = -1;
    easterItem.innerHTML =
      '<div class="note-title">Fun Facts</div><div class="note-preview"></div>';

    notesList.appendChild(easterItem);
    easterItemElement = easterItem;

    const plain = easterTemplate.content.textContent.trim().replace(/\s+/g, " ");
    noteData.easter = {
      title: "Fun Facts",
      lowerTitle: "fun facts",
      plainContent: plain,
      lowerContent: plain.toLowerCase(),
      template: easterTemplate,
    };
  }

  function removeEasterEgg() {
    if (!easterItemElement) return;

    const wasActive = activeSection === "easter";
    easterItemElement.remove();
    easterItemElement = null;
    delete noteData.easter;

    if (wasActive) {
      activateSection("about", { updateHash: true, forceLoad: true });
    }
  }

  function getVisibleItems() {
    return Array.from(notesList.querySelectorAll("li")).filter(
      (item) => item.style.display !== "none"
    );
  }

  function getSelectedItem() {
    return notesList.querySelector('li[aria-selected="true"]') ||
      notesList.querySelector("li.active");
  }
});
