export function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;');
}

export function highlight(text, term) {
  if (!term?.trim()) return escapeHtml(text);
  
  const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${safeTerm})`, 'gi');
  
  return escapeHtml(text).replace(regex, '<span class="highlight">$1</span>');
}

export function getBestSnippet(plainText, term, lowerPlain) {
  if (!term?.trim()) return '';
  
  const lowerTerm = term.toLowerCase();
  const idx = lowerPlain.indexOf(lowerTerm);
  if (idx === -1) return '';

  // Start snippet ~30–50 chars before match if possible (word-aware-ish)
  let start = Math.max(0, lowerPlain.lastIndexOf(' ', idx - 40));
  const end = idx + term.length + 100; // generous context after

  let snippet = plainText.slice(start, end).trim();

  if (start > 0) snippet = '…' + snippet;
  if (end < plainText.length) snippet += '…';

  return snippet;
}

export function buildNoteData(sidebarItems) {
  const noteData = {};

  sidebarItems.forEach(item => {
    const key = item.dataset.section;
    const template = document.getElementById(`section-${key}`);
    if (!template) return;

    const clone = template.content.cloneNode(true);
    const plain = clone.textContent.trim().replace(/\s+/g, ' ');

    noteData[key] = {
      title:        item.querySelector('.note-title').textContent,
      lowerTitle:   item.querySelector('.note-title').textContent.toLowerCase(),
      plainContent: plain,
      lowerContent: plain.toLowerCase(),
      template
    };
  });

  return noteData;
}
