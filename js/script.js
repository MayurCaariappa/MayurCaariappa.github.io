import { highlight, getBestSnippet, buildNoteData } from "./utils.js";

/**
 * Initializes the portfolio app on DOM load.
 */
document.addEventListener("DOMContentLoaded", () => {
  // Cache DOM elements for performance
  const contentDiv = document.getElementById("note-content");
  const searchInput = document.getElementById("search-notes");
  const noResults = document.getElementById("no-results");
  const notesList = document.getElementById("notes-list");
  const sidebarItems = document.querySelectorAll("#notes-list li");
  const footer = document.getElementById("contact-footer");
  const mainContent = document.querySelector(".main-content");

  // Build note data once
  const noteData = buildNoteData(sidebarItems);

  // Restore and handle checklist toggles when skills note is loaded
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
      if (isChecked) {
        li.classList.add("checked");
      }

      // Make circle clickable
      li.addEventListener("click", (e) => {
        if (e.target.tagName === "A" || e.target.closest("a")) return;

        li.classList.toggle("checked");
        const nowChecked = li.classList.contains("checked");
        localStorage.setItem(`skill-checked-${skillId}`, nowChecked);

        li.style.transition = "background 0.2s";
        li.style.background = nowChecked
          ? "rgba(255, 204, 0, 0.08)"
          : "transparent";
        setTimeout(() => {
          li.style.background = "";
        }, 300);
      });
    });
  }

  // Hook into loadNote to initialize checklist when skills loads
  const originalLoadNote = loadNote;
  loadNote = function (key) {
    originalLoadNote.call(this, key); // Call original

    // Delay slightly for DOM to settle
    setTimeout(() => {
      if (key === "skills") {
        initChecklist();
      }
    }, 200);
  };

  // Also run on initial load if starting on skills
  if (
    document.querySelector("#notes-list li.active")?.dataset.section ===
    "skills"
  ) {
    setTimeout(initChecklist, 300);
  }

  // Flag for easter egg
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

    sidebarItems.forEach((item) => {
      const key = item.dataset.section;
      const data = noteData[key];
      if (!data) return;

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
    if (!term) {
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
      const firstVisible = Array.from(sidebarItems).find(
        (el) => el.style.display !== "none"
      );
      if (firstVisible) {
        sidebarItems.forEach((el) => el.classList.remove("active"));
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
    }, 180); // Matches transition duration
  }

  // Sidebar click handlers
  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.style.display === "none") return;
      sidebarItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      loadNote(item.dataset.section);
    });
  });

  // Search input handler
  searchInput.addEventListener("input", (e) => filterNotes(e.target.value));

  // Keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (document.activeElement === searchInput) return;
    if (!["ArrowUp", "ArrowDown", "Enter"].includes(e.key)) return;
    e.preventDefault();

    const visibleItems = Array.from(sidebarItems).filter(
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
      sidebarItems.forEach((i) => i.classList.remove("active"));
      const targetItem = visibleItems[nextIndex];
      targetItem.classList.add("active");
      targetItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      loadNote(targetItem.dataset.section);
    }
  });

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

    // Add to noteData
    const easterTemplate = document.getElementById("section-easter");
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

    // Bind click handler
    easterItem.addEventListener("click", () => {
      Array.from(sidebarItems).forEach((i) => i.classList.remove("active"));
      easterItem.classList.add("active");
      loadNote("easter");
    });

    // Force re-filter to show it immediately
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
        Array.from(sidebarItems).forEach((el) => el.classList.remove("active"));
        aboutItem.classList.add("active");
        loadNote("about");
      }
    }

    // Re-filter to update view
    filterNotes(searchInput.value);
  }

  // Initial load
  filterNotes("");
  document.querySelector('#notes-list li[data-section="about"]').click();
});
