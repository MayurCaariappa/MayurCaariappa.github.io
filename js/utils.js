/**
 * Escapes HTML special characters.
 * @param {string} str - Input string.
 * @returns {string} Escaped string.
 */
export function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Highlights search term in text.
 * @param {string} text - Original text.
 * @param {string} term - Search term.
 * @returns {string} Highlighted HTML.
 */
export function highlight(text, term) {
  if (!term?.trim()) return escapeHtml(text);
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`(${safeTerm})`, "gi");
  return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

/**
 * Extracts best snippet around match.
 * @param {string} plainText - Full text.
 * @param {string} term - Search term.
 * @param {string} lowerPlain - Lowercased text.
 * @returns {string} Snippet or empty.
 */
export function getBestSnippet(plainText, term, lowerPlain) {
  if (!term?.trim()) return "";
  const lowerTerm = term.toLowerCase();
  const idx = lowerPlain.indexOf(lowerTerm);
  if (idx === -1) return "";
  let start = Math.max(0, lowerPlain.lastIndexOf(" ", idx - 40));
  const end = idx + term.length + 100;
  let snippet = plainText.slice(start, end).trim();
  if (start > 0) snippet = "…" + snippet;
  if (end < plainText.length) snippet += "…";
  return snippet;
}

/**
 * Builds note data from templates.
 * @param {NodeList} sidebarItems - Sidebar list items.
 * @returns {Object} Note data map.
 */
export function buildNoteData(sidebarItems) {
  const noteData = {};
  sidebarItems.forEach((item) => {
    const key = item.dataset.section;
    const template = document.getElementById(`section-${key}`);
    if (!template) return;
    const clone = template.content.cloneNode(true);
    const plain = clone.textContent.trim().replace(/\s+/g, " ");
    noteData[key] = {
      title: item.querySelector(".note-title").textContent,
      lowerTitle: item.querySelector(".note-title").textContent.toLowerCase(),
      plainContent: plain,
      lowerContent: plain.toLowerCase(),
      template,
    };
  });
  return noteData;
}
