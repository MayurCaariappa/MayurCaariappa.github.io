/**
 * Static journal catalogue for the GitHub Pages portfolio.
 *
 * Add your own image files to images/journals/covers/ and
 * images/journals/pages/, then add a journal object below.
 * Paths are relative to index.html.
 *
 * Example:
 * {
 *   id: "travel-notes",
 *   title: "Travel Notes",
 *   description: "Places, memories, and little discoveries.",
 *   cover: "./images/journals/covers/travel-notes.webp",
 *   pages: [
 *     "./images/journals/pages/travel-notes-01.webp",
 *     "./images/journals/pages/travel-notes-02.webp",
 *     "./images/journals/pages/travel-notes-03.webp"
 *   ]
 * }
 *
 * Page images are displayed in the order listed. For a two-page spread,
 * pages 1–2 appear together, then pages 3–4, and so on.
 *
 * Optional fields:
 *   titleColor     – CSS colour of the title shown over the cover
 *                    (e.g. "#000000"). Defaults to white.
 *   showCoverTitle – set to false to hide that title, e.g. when the cover
 *                    image already has the title printed on it.
 *   pageRatio      – page width ÷ height. Pages fill the book edge to edge at
 *                    this ratio. Defaults to the first page image's ratio.
 */

/** Shown above the Journal heading, like the timestamps on other notes. */
export const journalsUpdatedAt = "21 October 2026 at 15:06";

export const journals = [
  {
    id: "zine-1",
    title: "Thousand Little Things",
    description: "The first zine",
    cover: "./images/journals/covers/thousand-little-things/1.png",
    titleColor: "#000000",
    showCoverTitle: false,
    pageRatio: 0.79,
    pages: [
      "./images/journals/pages/thousand-little-things/1.png",
      "./images/journals/pages/thousand-little-things/2.png",
      "./images/journals/pages/thousand-little-things/3.png",
      "./images/journals/pages/thousand-little-things/4.png",
      "./images/journals/pages/thousand-little-things/5.png",
      "./images/journals/pages/thousand-little-things/6.png",
    ],
  },
  {
    id: "zine-2",
    title: "You make Glasgow",
    description: "A record of my first time in your world",
    cover: "./images/journals/covers/you-make-glasgow/front.png",
    titleColor: "#ffffff",
    showCoverTitle: false,
    pageRatio: 0.708,
    pages: [
      "./images/journals/pages/you-make-glasgow/1.png",
      "./images/journals/pages/you-make-glasgow/2.png",
      "./images/journals/pages/you-make-glasgow/3.png",
      "./images/journals/pages/you-make-glasgow/4.png",
      "./images/journals/pages/you-make-glasgow/5.png",
      "./images/journals/pages/you-make-glasgow/6.png",
      "./images/journals/pages/you-make-glasgow/7.png",
      "./images/journals/pages/you-make-glasgow/8.png",
      "./images/journals/pages/you-make-glasgow/9.png",
      "./images/journals/pages/you-make-glasgow/10.png",
      "./images/journals/pages/you-make-glasgow/11.png",
      "./images/journals/pages/you-make-glasgow/12.png",
      "./images/journals/pages/you-make-glasgow/13.png",
      "./images/journals/pages/you-make-glasgow/14.png",
      "./images/journals/pages/you-make-glasgow/15.png",
      "./images/journals/pages/you-make-glasgow/16.png",
      "./images/journals/pages/you-make-glasgow/17.png",
      "./images/journals/pages/you-make-glasgow/18.png",
      "./images/journals/pages/you-make-glasgow/19.png",
      "./images/journals/pages/you-make-glasgow/20.png",
      "./images/journals/pages/you-make-glasgow/21.png",
      "./images/journals/pages/you-make-glasgow/22.png",
      "./images/journals/pages/you-make-glasgow/23.png",
      "./images/journals/pages/you-make-glasgow/24.png",
      "./images/journals/pages/you-make-glasgow/25.png",
      "./images/journals/pages/you-make-glasgow/26.png",
      "./images/journals/pages/you-make-glasgow/27.png",
      "./images/journals/pages/you-make-glasgow/28.png",
      "./images/journals/pages/you-make-glasgow/29.png",
      "./images/journals/pages/you-make-glasgow/30.png",
      "./images/journals/pages/you-make-glasgow/31.png",
      "./images/journals/pages/you-make-glasgow/32.png",
    ],
  },
];
