import { highlight, getBestSnippet, buildNoteData } from "./utils.js";

/**
 * Initializes the portfolio app on DOM load.
 */
document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const windowEl = document.querySelector(".notes-window");
  const titleBar = document.querySelector(".title-bar");
  const backButton = document.querySelector(".back-button");
  const controls = document.querySelector(".controls");
  const title = document.querySelector(".title");
  const searchWrapper = document.querySelector(".search-wrapper");
  const resizeHandle = document.querySelector(".resize-handle");
  const contentDiv = document.getElementById("note-content");
  const searchInput = document.getElementById("search-notes");
  const noResults = document.getElementById("no-results");
  const notesList = document.getElementById("notes-list");
  const footer = document.getElementById("contact-footer");
  const mainContent = document.querySelector(".main-content");
  const sidebar = document.querySelector(".sidebar");

  // Mobile detection
  const isMobile = () => window.innerWidth <= 800;

  // Proper initial centering for desktop
  // Center window once on load (desktop only)
  if (!isMobile()) {
    function centerWindow() {
      const w = windowEl.offsetWidth;
      const h = windowEl.offsetHeight;

      // Use viewport size
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      let left = Math.max(20, (vw - w) / 2);
      let top = Math.max(20, (vh - h) / 2);

      windowEl.style.left = `${left}px`;
      windowEl.style.top = `${top}px`;
      windowEl.style.margin = "0";
      windowEl.style.transform = "none";
    }

    centerWindow();
    window.addEventListener("load", centerWindow);
    window.addEventListener("resize", centerWindow);
  }

  // Dragging state
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let dragStartLeft = 0;
  let dragStartTop = 0;

  // Resizing state
  let isResizing = false;
  let resizeStartX = 0;
  let resizeStartY = 0;
  let resizeStartWidth = 0;
  let resizeStartHeight = 0;

  // Initialize dragging and resizing (desktop only)
  if (!isMobile()) {
    initWindowDragging();
    initWindowResizing();
  }

  function initWindowDragging() {
    titleBar.addEventListener("pointerdown", startDrag);

    function startDrag(e) {
      // Skip if clicking on controls, search, or back button
      if (e.target.closest(".controls, .search-wrapper, .back-button")) return;

      // Very important: capture current position **in viewport coordinates**
      const rect = windowEl.getBoundingClientRect();

      isDragging = true;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      dragStartLeft = rect.left;
      dragStartTop = rect.top;

      windowEl.classList.add("dragging");
      document.body.style.userSelect = "none";
      e.preventDefault();
    }

    function onDragMove(e) {
      if (!isDragging) return;
      e.preventDefault();

      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;

      let newLeft = dragStartLeft + dx;
      let newTop = dragStartTop + dy;

      // Keep some margin so title bar doesn't go completely off-screen
      const titleH = titleBar.offsetHeight;
      newLeft = Math.max(
        -windowEl.offsetWidth + 120,
        Math.min(newLeft, window.innerWidth - 120)
      );
      newTop = Math.max(
        -titleH + 40,
        Math.min(newTop, window.innerHeight - titleH - 20)
      );

      windowEl.style.left = `${newLeft}px`;
      windowEl.style.top = `${newTop}px`;
    }

    function stopDrag() {
      if (!isDragging) return;
      isDragging = false;
      windowEl.classList.remove("dragging");
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onDragMove, { passive: false });
    window.addEventListener("pointerup", stopDrag);
    window.addEventListener("pointercancel", stopDrag);
  }

  function initWindowResizing() {
    if (!resizeHandle) return;

    resizeHandle.addEventListener("pointerdown", startResize);

    function startResize(e) {
      isResizing = true;
      resizeStartX = e.clientX;
      resizeStartY = e.clientY;
      resizeStartWidth = windowEl.offsetWidth;
      resizeStartHeight = windowEl.offsetHeight;

      windowEl.classList.add("dragging");
      document.body.style.userSelect = "none";
      e.preventDefault();
    }

    function onResizeMove(e) {
      if (!isResizing) return;
      e.preventDefault();

      const dx = e.clientX - resizeStartX;
      const dy = e.clientY - resizeStartY;

      const newWidth = Math.max(360, resizeStartWidth + dx);
      const newHeight = Math.max(420, resizeStartHeight + dy);

      windowEl.style.width = `${newWidth}px`;
      windowEl.style.height = `${newHeight}px`;
    }

    function stopResize() {
      if (!isResizing) return;
      isResizing = false;
      windowEl.classList.remove("dragging");
      document.body.style.userSelect = "";
    }

    window.addEventListener("pointermove", onResizeMove, { passive: false });
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  }

  // Prepare note data
  const noteData = buildNoteData(document.querySelectorAll("#notes-list li"));

  // Checklist persistence (skills section)
  function initChecklist() {
    const checklistItems = document.querySelectorAll(
      "#note-content ul.checklist li"
    );

    checklistItems.forEach((li) => {
      const skillId = li.dataset.skillId;
      if (!skillId) return;

      // Restore saved state
      const isChecked =
        localStorage.getItem(`skill-checked-${skillId}`) === "true";
      if (isChecked) li.classList.add("checked");

      // Make circle clickable
      li.addEventListener("click", (e) => {
        if (e.target.closest("a")) return;
        li.classList.toggle("checked");
        const nowChecked = li.classList.contains("checked");
        localStorage.setItem(`skill-checked-${skillId}`, nowChecked);

        li.style.background = nowChecked
          ? "rgba(255, 204, 0, 0.08)"
          : "transparent";
        setTimeout(() => (li.style.background = ""), 300);
      });
    });
  }

  // Hook into loadNote to initialize checklist when skills loads
  const originalLoadNote = loadNote;
  loadNote = function (key) {
    originalLoadNote.call(this, key);

    // Delay slightly for DOM to settle
    setTimeout(() => {
      if (key === "skills") initChecklist();
    }, 200);
  };

  // Also run on initial load if starting on skills
  if (
    document.querySelector("#notes-list li.active")?.dataset.section ===
    "skills"
  ) {
    setTimeout(initChecklist, 300);
  }

  // Easter egg state
  let easterRevealed = false;
  let easterItemElement = null;

  /**
   * Filters sidebar notes based on search term.
   * @param {string} rawTerm - The raw search input.
   */
  function filterNotes(rawTerm) {
    const term = rawTerm.trim();
    const lowerTerm = term.toLowerCase();
    let visibleCount = 0;

    // Easter egg logic: reveal only once, remove when term doesn't match
    const shouldShowEaster = lowerTerm === "easter";
    if (shouldShowEaster && !easterRevealed) {
      revealEasterEgg();
      easterRevealed = true;
    } else if (!shouldShowEaster && easterRevealed) {
      removeEasterEgg();
      easterRevealed = false;
    }

    document.querySelectorAll("#notes-list li").forEach((item) => {
      const key = item.dataset.section;
      const data = noteData[key];
      if (!data) return;

      if (key === "easter") {
        const shouldBeVisible = lowerTerm === "easter";
        item.style.display = shouldBeVisible ? "" : "none";
        if (!shouldBeVisible) {
          visibleCount++;
        }

        const previewEl = item.querySelector(".note-preview");
        previewEl.innerHTML = shouldBeVisible ? "Easter egg unlocked!" : "";
        previewEl.style.display = shouldBeVisible ? "block" : "none";
        if (shouldBeVisible) visibleCount++;
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

      let previewText = "";
      if (matchContent) {
        previewText = getBestSnippet(
          data.plainContent,
          term,
          data.lowerContent
        );
      }

      previewEl.innerHTML = highlight(previewText, term);
      previewEl.style.display = previewText ? "block" : "none";
    });

    noResults.classList.toggle("hidden", visibleCount > 0 || !term);

    // Refresh current note if search cleared
    if (!term && !isMobile()) {
      const active = notesList.querySelector("li.active");
      if (active) loadNote(active.dataset.section);
    }

    // Clear content if no results
    if (visibleCount === 0 && term) {
      contentDiv.innerHTML = "";
      contentDiv.classList.remove("fade-in", "slide-in");
    }

    // Auto-select first visible if active hidden
    const active = notesList.querySelector("li.active");
    if (active?.style.display === "none" && visibleCount > 0) {
      const firstVisible = Array.from(notesList.querySelectorAll("li")).find(
        (el) => el.style.display !== "none"
      );
      if (firstVisible) {
        document
          .querySelectorAll("#notes-list li")
          .forEach((el) => el.classList.remove("active"));
        firstVisible.classList.add("active");
        loadNote(firstVisible.dataset.section);
      }
    }
  }

  /**
   * Loads and renders a note section.
   * @param {string} key - The section key.
   */
  function loadNote(key) {
    contentDiv.classList.remove("fade-in", "slide-in");
    void contentDiv.offsetWidth; // reflow

    // Toggle footer for contact
    if (footer) {
      footer.classList.toggle("visible", key === "contact");
      mainContent.style.paddingBottom = key === "contact" ? "48px" : "0";
    }

    setTimeout(() => {
      const data = noteData[key];
      if (!data) return;

      const fragment = data.template.content.cloneNode(true);
      const term = searchInput.value.trim();

      if (term) {
        // Highlight matches in content
        const walker = document.createTreeWalker(
          fragment,
          NodeFilter.SHOW_TEXT
        );
        let node;
        while ((node = walker.nextNode())) {
          const text = node.nodeValue;
          if (!text.trim()) continue;
          const html = highlight(text, term);
          if (html === text) continue;
          const span = document.createElement("span");
          span.innerHTML = html;
          node.parentNode.replaceChild(span, node);
        }
      }

      contentDiv.innerHTML = "";
      contentDiv.appendChild(fragment);

      // Trigger reflow for animation
      void contentDiv.offsetWidth;
      contentDiv.classList.add("fade-in", "slide-in");
    }, 30);
  }

  // Event delegation for sidebar clicks (fixes desktop & handles dynamic easter egg)
  notesList.addEventListener("click", (e) => {
    const item = e.target.closest("li");
    if (!item || item.style.display === "none") return;

    document
      .querySelectorAll("#notes-list li")
      .forEach((i) => i.classList.remove("active"));
    item.classList.add("active");

    const key = item.dataset.section;
    const noteTitle = item.querySelector(".note-title").textContent;

    loadNote(key);

    if (isMobile()) {
      mainContent.style.display = "block";
      sidebar.style.display = "none";
      titleBar.classList.add("content-view");

      backButton.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e2a727" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right: -4px;">
            <path d="m15 18-6-6 6-6"></path>
        </svg>
        <span style="color: #e2a727; font-size: 17px;">Notes</span>
      `;
      backButton.style.display = "flex";
      backButton.style.alignItems = "center";
      backButton.style.gap = "8px";

      title.style.display = "none";
      searchWrapper.style.display = "none";
      controls.style.display = "none";
    }
  });

  // Back button
  backButton.addEventListener("click", () => {
    if (!isMobile()) return;

    mainContent.style.display = "none";
    sidebar.style.display = "block";
    titleBar.classList.remove("content-view");
    backButton.style.display = "none";
    title.style.display = "block";
    searchWrapper.style.display = "block";
    controls.style.display = "flex";

    contentDiv.innerHTML = "";
    contentDiv.classList.remove("fade-in", "slide-in");
    footer.classList.remove("visible");
    mainContent.style.paddingBottom = "0";
  });

  // Search
  searchInput.addEventListener("input", (e) => filterNotes(e.target.value));

  // Keyboard nav (desktop only)
  if (!isMobile()) {
    document.addEventListener("keydown", (e) => {
      if (document.activeElement === searchInput) return;
      if (!["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
      e.preventDefault();

      const visibleItems = Array.from(notesList.querySelectorAll("li")).filter(
        (item) => item.style.display !== "none"
      );
      if (!visibleItems.length) return;

      let currentIndex = visibleItems.findIndex((item) =>
        item.classList.contains("active")
      );
      if (currentIndex === -1) currentIndex = 0;

      let nextIndex = currentIndex;
      if (e.key === "ArrowUp") nextIndex = Math.max(0, currentIndex - 1);
      if (e.key === "ArrowDown")
        nextIndex = Math.min(visibleItems.length - 1, currentIndex + 1);
      if (e.key === "Enter") nextIndex = currentIndex;

      if (nextIndex !== currentIndex || e.key === "Enter") {
        document
          .querySelectorAll("#notes-list li")
          .forEach((i) => i.classList.remove("active"));
        const target = visibleItems[nextIndex];
        target.classList.add("active");
        target.scrollIntoView({ block: "nearest", behavior: "smooth" });
        loadNote(target.dataset.section);
      }
    });
  }

  /**
   * Reveals easter egg note in sidebar.
   */
  function revealEasterEgg() {
    if (easterItemElement) return; // safety check

    const easterItem = document.createElement("li");
    easterItem.dataset.section = "easter";
    easterItem.innerHTML = `<div class="note-title">Fun Facts</div><div class="note-preview"></div>`;
    notesList.appendChild(easterItem);
    easterItemElement = easterItem; // keep reference

    const easterTemplate = document.getElementById("section-easter"); // assume you have this in HTML
    const plain = easterTemplate.content.textContent
      .trim()
      .replace(/\s+/g, " ");

    noteData["easter"] = {
      title: "Fun Facts",
      lowerTitle: "fun facts",
      plainContent: plain,
      lowerContent: plain.toLowerCase(),
      template: easterTemplate,
    };

    filterNotes(searchInput.value);
  }

  /**
   * Removes the easter egg from sidebar and data when no longer needed.
   */
  function removeEasterEgg() {
    if (!easterItemElement) return;

    easterItemElement.remove();
    easterItemElement = null;

    // Clean up noteData
    delete noteData["easter"];

    // If currently viewing easter, switch to About (or first visible)
    const active = notesList.querySelector("li.active");
    if (active?.dataset.section === "easter") {
      const aboutItem = notesList.querySelector('li[data-section="about"]');
      if (aboutItem) {
        document
          .querySelectorAll("#notes-list li")
          .forEach((el) => el.classList.remove("active"));
        aboutItem.classList.add("active");
        loadNote("about");
      }
    }

    // Re-filter to update view
    filterNotes(searchInput.value);
  }

  // Initial load
  filterNotes("");
  if (isMobile()) {
    mainContent.style.display = "none";
    sidebar.style.display = "block";
    controls.style.display = "flex";
  } else {
    const aboutItem = document.querySelector(
      '#notes-list li[data-section="about"]'
    );
    if (aboutItem) aboutItem.click();
  }
});
