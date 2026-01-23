import { highlight, getBestSnippet, buildNoteData } from "./utils.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM references
  const contentDiv = document.getElementById("note-content");
  const searchInput = document.getElementById("search-notes");
  const noResults = document.getElementById("no-results");
  const sidebarItems = document.querySelectorAll("#notes-list li");

  // Prepare data once
  const noteData = buildNoteData(sidebarItems);

  function filterNotes(rawTerm) {
    const term = rawTerm.trim();
    const lowerTerm = term.toLowerCase();
    let visibleCount = 0;

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

    // If search is cleared → refresh current note without highlights
    if (!term && searchInput.value === "") {
      const active = document.querySelector("#notes-list li.active");
      if (active) {
        loadNote(active.dataset.section);
      }
    }

    // If zero results now → clear main content (remove stale highlighted note)
    if (visibleCount === 0 && term) {
      contentDiv.innerHTML = "";
      contentDiv.classList.remove("fade-in");
    }

    // Auto-select first visible if active one is filtered out
    const active = document.querySelector("#notes-list li.active");
    if (active?.style.display === "none" && visibleCount > 0) {
      const firstVisible = [...sidebarItems].find(
        (el) => el.style.display !== "none"
      );
      if (firstVisible) {
        sidebarItems.forEach((el) => el.classList.remove("active"));
        firstVisible.classList.add("active");
        loadNote(firstVisible.dataset.section);
      }
    }
  }

  function loadNote(key) {
    contentDiv.classList.remove("fade-in");

    const footer = document.getElementById("contact-footer");
  if (footer) {
    footer.classList.remove("visible");
    document.querySelector(".main-content").style.paddingBottom = "0";
  }

    setTimeout(() => {
      const data = noteData[key];
      if (!data) return;

      const fragment = data.template.content.cloneNode(true);
      const term = searchInput.value.trim();

      if (term) {
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

      void contentDiv.offsetWidth; // trigger reflow
      contentDiv.classList.add("fade-in");

      if (key === "contact" && footer) {
      footer.classList.add("visible");
      document.querySelector(".main-content").style.paddingBottom = "48px";
    }
    }, 180);
  }

  sidebarItems.forEach((item) => {
    item.addEventListener("click", () => {
      if (item.style.display === "none") return;
      sidebarItems.forEach((i) => i.classList.remove("active"));
      item.classList.add("active");
      loadNote(item.dataset.section);
    });
  });

  searchInput.addEventListener("input", (e) => filterNotes(e.target.value));

  // Initial state
  filterNotes("");
  document.querySelector('#notes-list li[data-section="about"]').click();

  /* Keyboard navigation */
  document.addEventListener("keydown", (e) => {
    // Skip if user is typing in search field
    if (document.activeElement === searchInput) return;

    // Only handle ArrowUp / ArrowDown (and optionally Enter)
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Enter")
      return;

    e.preventDefault(); // prevent page scroll

    // Get currently visible items (in DOM order)
    const visibleItems = [...sidebarItems].filter(
      (item) => item.style.display !== "none"
    );

    if (visibleItems.length === 0) return;

    // Find current active (or default to first if none)
    let currentIndex = visibleItems.findIndex((item) =>
      item.classList.contains("active")
    );
    if (currentIndex === -1) currentIndex = 0;

    let nextIndex = currentIndex;

    if (e.key === "ArrowUp") {
      nextIndex = currentIndex - 1;
      if (nextIndex < 0) nextIndex = 0; // or visibleItems.length - 1 for wrap-around
    } else if (e.key === "ArrowDown") {
      nextIndex = currentIndex + 1;
      if (nextIndex >= visibleItems.length) nextIndex = visibleItems.length - 1; // or 0 for wrap
    }

    // If Enter → just load current (no move)
    if (e.key === "Enter") {
      nextIndex = currentIndex;
    }

    if (nextIndex !== currentIndex || e.key === "Enter") {
      // Remove active from all
      sidebarItems.forEach((i) => i.classList.remove("active"));
      // Add to new one
      const targetItem = visibleItems[nextIndex];
      targetItem.classList.add("active");
      // Scroll the sidebar item into view (nice UX)
      targetItem.scrollIntoView({ block: "nearest", behavior: "smooth" });
      // Load the note
      loadNote(targetItem.dataset.section);
    }
  });
});
