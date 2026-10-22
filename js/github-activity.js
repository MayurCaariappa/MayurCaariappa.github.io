// Public contribution data, via a free CORS-enabled proxy of GitHub's graph.
const API = "https://github-contributions-api.jogruber.de/v4/";
const CACHE_PREFIX = "github-activity-";

function readCache(user) {
  try {
    return JSON.parse(sessionStorage.getItem(CACHE_PREFIX + user));
  } catch {
    return null;
  }
}

function writeCache(user, data) {
  try {
    sessionStorage.setItem(CACHE_PREFIX + user, JSON.stringify(data));
  } catch {
    // Session storage can be unavailable; the graph still renders.
  }
}

function formatDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Replaces the fallback link in `container` with a contribution graph.
 * `isCurrent` lets the caller abandon the render if the note was closed.
 */
export async function renderGithubActivity(container, isCurrent = () => true) {
  const user = container.dataset.githubUser;
  if (!user) return;

  let data = readCache(user);
  if (!data) {
    const response = await fetch(`${API}${encodeURIComponent(user)}?y=last`);
    if (!response.ok) throw new Error(`GitHub activity: ${response.status}`);
    data = await response.json();
    writeCache(user, data);
  }
  if (!isCurrent() || !Array.isArray(data.contributions)) return;

  const days = [...data.contributions].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  const total = data.total?.lastYear ?? days.reduce((sum, d) => sum + d.count, 0);

  const grid = document.createElement("div");
  grid.className = "gh-grid";
  grid.setAttribute("role", "img");
  grid.setAttribute(
    "aria-label",
    `${total} public contributions on GitHub in the last year`,
  );

  // Columns are weeks starting on Sunday, like GitHub's own graph.
  const leadingBlanks = days.length
    ? new Date(`${days[0].date}T00:00:00`).getDay()
    : 0;
  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement("span");
    blank.className = "gh-day is-blank";
    grid.append(blank);
  }
  days.forEach((day) => {
    const cell = document.createElement("span");
    cell.className = "gh-day";
    cell.dataset.level = String(Math.min(4, Math.max(0, day.level ?? 0)));
    const label = `${day.count} contribution${day.count === 1 ? "" : "s"} on ${formatDay(day.date)}`;
    cell.title = label;
    grid.append(cell);
  });

  const scroller = document.createElement("div");
  scroller.className = "gh-scroller";
  scroller.append(grid);

  const footer = document.createElement("div");
  footer.className = "gh-footer";
  const summary = document.createElement("span");
  summary.textContent = `${total} contributions in the last year`;
  const legend = document.createElement("span");
  legend.className = "gh-legend";
  legend.setAttribute("aria-hidden", "true");
  legend.append("Less");
  for (let level = 0; level <= 4; level++) {
    const swatch = document.createElement("span");
    swatch.className = "gh-day";
    swatch.dataset.level = String(level);
    legend.append(swatch);
  }
  legend.append("More");
  footer.append(summary, legend);

  const link = container.querySelector("a");
  container.replaceChildren(scroller, footer);
  if (link) {
    const linkRow = document.createElement("p");
    linkRow.className = "gh-link";
    linkRow.append(link);
    container.append(linkRow);
  }
  // Show the most recent weeks first on narrow screens.
  scroller.scrollLeft = scroller.scrollWidth;
}
