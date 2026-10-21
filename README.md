# Mayur's Portfolio

A static portfolio inspired by the Apple Notes app on macOS and iPhone.

## Stack

- HTML
- CSS
- Vanilla JavaScript (ES modules)
- GitHub Pages hosting; no backend or database

## Local Usage

Open `index.html` in a browser, or serve the folder with any simple static server. Because the site uses JavaScript modules, a local static server is recommended for consistent browser behavior.

## Keyboard Shortcuts

- `/` focuses the search field
- `Esc` clears search when the search field is active
- `ArrowDown` or `j` moves to the next note
- `ArrowUp` or `k` moves to the previous note
- `Enter` opens the currently selected note
- In the Journal reader, `←` and `→` turn the page; you can also drag a page across the spine or tap the left/right page

## Notes

- The portfolio defaults to the `About` note on page reload.
- Searching filters notes by title and content.
- Typing `easter` in search reveals the hidden Fun Facts note and the Journal tab.
- The Journal is a read-only image viewer. Journal pages are static images committed to this repository; there is no backend, database, or journal editor.
- Add cover images to `images/journals/covers/` and page images to `images/journals/pages/`.
- Register journals and their page image paths in `js/journal-data.js`. Image paths are relative to `index.html`.
- Optional journal fields: `titleColor` (colour of the title over the cover), `showCoverTitle: false` (hide it when the cover already shows the title) and `pageRatio` (page width ÷ height; defaults to the first page's ratio). Pages fill the book edge to edge at that ratio.
