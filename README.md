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
- `j` / `k` move to the next / previous note
- `ArrowDown` / `ArrowUp` move between notes when the notes list is focused; otherwise they scroll the open note
- `Enter` opens the selected note (links and buttons keep their normal `Enter` behaviour)
- In the Journal reader, `←` and `→` turn the page; you can also drag a page across the spine or tap the left/right page

## Notes

- Each note has a shareable link, e.g. `/#projects`. Without a valid hash the portfolio opens the `About` note. (The Experience note keeps the `#resume` link.)
- The sidebar mirrors Apple Notes: a **Pinned** group (About, Experience) above the other notes, each with its date and first line. Dates come from each template's `data-time` timestamp, so update it when you edit a note.
- Searching filters notes by title and content and highlights matches in the open note. On mobile, search only filters the list; tap a result to open it.
- The window buttons work on desktop: green (or double-clicking the title bar) zooms to fill the screen, yellow minimizes and red closes the window into a dock icon that reopens it.
- The theme follows the visitor's system light/dark setting.
- The résumé PDF is linked from the toolbar, the top of Experience, About and Contact. Keep `docs/MayurCaariappa_Resume.pdf` in sync with the Experience note.
- Skills are shown ticked by default; visitors can untick them (remembered in `localStorage`).
- Links that open in a new tab get a small ↗ marker (`#note-content a[target="_blank"]::after` in `css/style.css`).
- Typing `easter` in search reveals the hidden Fun Facts note and the Journal tab. Once revealed, they stay in the list (and in search results) until the page is reloaded. About hints at this.
- The Journal is a read-only image viewer. Journal pages are static images committed to this repository; there is no backend, database, or journal editor. The viewer's code (`js/journal.js`) is only downloaded when the Journal is opened.
- Add cover images to `images/journals/covers/` and page images to `images/journals/pages/`. Keep them web-sized: JPEG or WebP, around 1400px on the long side for pages and 800px for covers (`sips -s format jpeg -s formatOptions 82 -Z 1400 page.png --out page.jpg` on macOS).
- Register journals and their page image paths in `js/journal-data.js`. Image paths are relative to `index.html`.
- Optional journal fields: `titleColor` (colour of the title over the cover), `showCoverTitle: false` (hide it when the cover already shows the title) and `pageRatio` (page width ÷ height; defaults to the first page's ratio). Pages fill the book edge to edge at that ratio.

## Sharing and search engines

- Link previews (LinkedIn, X, Slack, WhatsApp) use `images/og-card.png` (1200×630). Regenerate it if your headline numbers change.
- `index.html` sets the page title, description, canonical URL (`https://mayurcaariappa.github.io/`) and a JSON-LD `Person` profile with links to LinkedIn, GitHub and X.
- Icons: `images/favicon-32.png` and `images/apple-touch-icon.png` (180×180, used when saved to an iPhone home screen).
- Google Analytics is loaded once the page is idle, so it doesn't delay the first paint.
