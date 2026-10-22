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
- `Esc` clears search when the search field is active, and closes the gallery view
- `j` / `k` move to the next / previous note
- `ArrowDown` / `ArrowUp` move between notes when the notes list is focused; otherwise they scroll the open note
- `Enter` opens the selected note (links and buttons keep their normal `Enter` behaviour)
- In the Journal reader, `←` and `→` turn the page; you can also drag a page across the spine or tap the left/right page

## Notes

- Each note has a shareable link, e.g. `/#projects`. Without a valid hash the portfolio opens the `About` note. (The Experience note keeps the `#resume` link.)
- The sidebar mirrors Apple Notes: **Pinned** (About, Skills, Experience), **Case Studies** and **Notes** groups, each note with its date and first line. Dates come from each template's `data-time` timestamp, so update it when you edit a note; the list shows them like Notes does (time for today, "Yesterday", the weekday this week, then the date).
- Folders and tags: in wide windows a folders column shows **All Notes**, **Case Studies**, **Recently Deleted** and tags; narrower windows and phones show the same options as chips above the list. A note's folder and tags come from `data-folder` and `data-tags` on its sidebar `<li>`; its tags also appear as clickable `#tag` pills at the bottom of the note.
- Searching filters notes by title and content across every folder and highlights matches in the open note. On mobile, search only filters the list; tap a result to open it.
- The toolbar's grid button switches to a gallery of note cards (desktop only). The share button copies a link to the open note (phones get the native share sheet).
- **Case studies** (`section-case-*` templates) expand the strongest résumé bullets.
- **Kind Words** holds LinkedIn recommendations, copied in as text (LinkedIn has no public API for recommendations). Keep the wording exact and link to the originals.
- **Now** is a [/now page](https://nownownow.com/about): update it when your focus changes. Its public GitHub activity graph is loaded on demand from `github-contributions-api.jogruber.de` (`js/github-activity.js`) and falls back to a plain link.
- **Private** is a locked note (password: `easter`, hinted after a wrong attempt). Unlocking it reveals Fun Facts and the Journal. It's a playful easter egg, not security: everything in this repository is public.
- **Recently Deleted** holds a few joke notes (`section-deleted-*`).
- About is written directly into `#note-content` in `index.html` (not a `<template>`) so search engines and visitors without JavaScript can read it; the script turns it into a template at start-up.
- Printing (⌘P) prints only the open note, with a contact header, so Experience prints as a one-page résumé.
- The window buttons work on desktop: green (or double-clicking the title bar) zooms to fill the screen, yellow minimizes and red closes the window into a dock icon that reopens it.
- The theme follows the visitor's system light/dark setting.
- The résumé PDF is linked from the toolbar, the top of Experience, About and Contact. Keep `docs/MayurCaariappa_Resume.pdf` in sync with the Experience note.
- Skills are shown ticked by default; visitors can untick them (remembered in `localStorage`).
- Links that open in a new tab get a small ↗ marker (`#note-content a[target="_blank"]::after` in `css/style.css`).
- Typing `easter` in search (or unlocking **Private**) reveals the hidden Fun Facts note and the Journal tab. Once revealed, they stay in the list (and in search results) until the page is reloaded. About hints at the locked note.
- The Journal is a read-only image viewer. Journal pages are static images committed to this repository; there is no backend, database, or journal editor. The viewer's code (`js/journal.js`) is only downloaded when the Journal is opened.
- Add cover images to `images/journals/covers/` and page images to `images/journals/pages/`. Keep them web-sized: JPEG or WebP, around 1400px on the long side for pages and 800px for covers (`sips -s format jpeg -s formatOptions 82 -Z 1400 page.png --out page.jpg` on macOS).
- Register journals and their page image paths in `js/journal-data.js`. Image paths are relative to `index.html`.
- Optional journal fields: `titleColor` (colour of the title over the cover), `showCoverTitle: false` (hide it when the cover already shows the title) and `pageRatio` (page width ÷ height; defaults to the first page's ratio). Pages fill the book edge to edge at that ratio.

## Sharing and search engines

- Link previews (LinkedIn, X, Slack, WhatsApp) use `images/og-card.png` (1200×630). Regenerate it if your headline numbers change.
- `index.html` sets the page title, description, canonical URL (`https://mayurcaariappa.github.io/`) and a JSON-LD `Person` profile with links to LinkedIn, GitHub and X.
- Icons: `images/favicon-32.png` and `images/apple-touch-icon.png` (180×180, used when saved to an iPhone home screen).
- Google Analytics is loaded once the page is idle, so it doesn't delay the first paint. Custom events: `view_note`, `resume_download`, `email_click`, `copy_email`, `outbound_click`, `share_note`, `filter_notes`, `gallery_view` and `unlock_attempt`.
- Project link cards use local images in `images/projects/`.
