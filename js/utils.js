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
 * Escapes a string for literal use inside a regular expression.
 * @param {string} str - Input string.
 * @returns {string} Escaped string.
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Highlights search term in text. Matching runs on the raw text and each
 * piece is escaped afterwards, so entities like &amp; are never split.
 * @param {string} text - Original text.
 * @param {string} term - Search term.
 * @returns {string} Highlighted HTML.
 */
export function highlight(text, term) {
  const needle = term?.trim();
  if (!needle) return escapeHtml(text);
  const regex = new RegExp(`(${escapeRegExp(needle)})`, "gi");
  return text
    .split(regex)
    .map((part, index) =>
      index % 2 === 1
        ? `<span class="highlight">${escapeHtml(part)}</span>`
        : escapeHtml(part),
    )
    .join("");
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

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Formats a note timestamp like "25 January 2026 at 13:30" as "25/01/2026",
 * the way Apple Notes shows dates in its note list.
 * @param {string} timestamp - Long-form timestamp.
 * @returns {string} Short date, or "" if it can't be parsed.
 */
export function formatShortDate(timestamp) {
  const match = /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/.exec(timestamp || "");
  if (!match) return "";
  const month = MONTHS.indexOf(match[2].toLowerCase()) + 1;
  if (!month) return "";
  return `${match[1].padStart(2, "0")}/${String(month).padStart(2, "0")}/${match[3]}`;
}

/**
 * Builds a search/preview entry for a note.
 * @param {string} title - Note title.
 * @param {DocumentFragment|null} fragment - Note body, if any.
 * @param {object} extra - Extra fields (template, timestamp, text).
 * @returns {Object} Note data entry.
 */
export function createNoteEntry(
  title,
  fragment,
  { template = null, timestamp = "", text = "" } = {},
) {
  const collapse = (value) => value.trim().replace(/\s+/g, " ");
  const plain = collapse(fragment ? fragment.textContent : text);

  // The sidebar preview skips the heading and anything marked as not part of
  // the note's opening line (e.g. a download link).
  let excerpt = plain;
  if (fragment) {
    const previewSource = fragment.cloneNode(true);
    previewSource
      .querySelectorAll("h1, .note-timestamp, [data-preview-skip]")
      .forEach((node) => node.remove());
    excerpt = collapse(previewSource.textContent);
  }

  return {
    title,
    lowerTitle: title.toLowerCase(),
    plainContent: plain,
    lowerContent: plain.toLowerCase(),
    excerpt,
    date: formatShortDate(timestamp),
    template,
  };
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
    const fragment = template.content.cloneNode(true);
    const title = item.querySelector(".note-title").textContent.trim();
    const timestamp =
      fragment.querySelector(".note-timestamp")?.dataset.time ?? "";
    noteData[key] = createNoteEntry(title, fragment, { template, timestamp });
  });
  return noteData;
}
