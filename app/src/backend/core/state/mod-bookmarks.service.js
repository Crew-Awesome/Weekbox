import { appSettings } from "../system/settings.service.js";
import { FS } from "../../services/filesystem.js";

const BOOKMARKS_SETTING = "modBookmarks";
const BOOKMARKS_FILE_NAME = "bookmarks.json";
let bookmarks = [];
let initialized = false;
let writeQueue = Promise.resolve();

function parseBookmarks(value) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeBookmarks(value) {
  const parsed = Array.isArray(value) ? value : parseBookmarks(value);
  return parsed.filter(
    (bookmark) =>
      bookmark &&
      (typeof bookmark.id === "string" || typeof bookmark.id === "number") &&
      typeof bookmark.source === "string" &&
      typeof bookmark.title === "string",
  );
}

function getBookmarksPath() {
  return FS.dataPath ? `${FS.dataPath}/${BOOKMARKS_FILE_NAME}` : "";
}

async function writeBookmarks() {
  const path = getBookmarksPath();
  if (!path) throw new Error("WeekBox data path is not initialized");
  const next = writeQueue
    .catch(() => {})
    .then(() => FS.api.write(path, `${JSON.stringify(bookmarks, null, 2)}\n`));
  writeQueue = next.catch(() => {});
  await next;
}

async function init() {
  if (initialized) return;
  const path = getBookmarksPath();
  let loaded = [];
  try {
    loaded = normalizeBookmarks(await FS.api.read(path));
  } catch {
    loaded = normalizeBookmarks(appSettings.get(BOOKMARKS_SETTING));
    bookmarks = loaded;
    try {
      await writeBookmarks();
    } catch (error) {
      console.warn("WeekBox bookmarks: could not create bookmarks.json", error);
    }
  }
  bookmarks = loaded;
  initialized = true;
}

function readBookmarks() {
  return bookmarks;
}

function getBookmarkKey(bookmark) {
  return `${bookmark.source}:${bookmark.id}`;
}

function toBookmark(mod) {
  const source = mod.source || "gamebanana";
  if (mod.id === undefined || mod.id === null || !mod.title) return null;
  return {
    id: String(mod.id),
    source,
    title: String(mod.title),
    author: mod.author || "",
    image: mod.image || mod.images?.[0] || null,
    engineId: mod.engineId || null,
    likes: Number(mod.likes) || 0,
    views: Number(mod.views) || 0,
    downloads: Number(mod.downloads) || 0,
    timeAgo: mod.timeAgo || "",
    sourceUrl: mod.sourceUrl || mod.gameBananaUrl || null,
  };
}

async function save(nextBookmarks) {
  const previousBookmarks = bookmarks;
  nextBookmarks = normalizeBookmarks(nextBookmarks);
  bookmarks = nextBookmarks;
  try {
    await writeBookmarks();
  } catch (error) {
    bookmarks = previousBookmarks;
    console.warn("WeekBox bookmarks: could not persist bookmarks", error);
    return false;
  }
  document.dispatchEvent(new CustomEvent("mod-bookmarks-updated"));
  return true;
}

const modBookmarks = {
  init,
  getAll() {
    return [...readBookmarks()];
  },
  has(mod) {
    const bookmark = toBookmark(mod);
    return bookmark
      ? readBookmarks().some(
          (saved) => getBookmarkKey(saved) === getBookmarkKey(bookmark),
        )
      : false;
  },
  async toggle(mod) {
    const bookmark = toBookmark(mod);
    if (!bookmark) return false;
    const nextBookmarks = [...readBookmarks()];
    const key = getBookmarkKey(bookmark);
    const index = nextBookmarks.findIndex(
      (saved) => getBookmarkKey(saved) === key,
    );
    if (index >= 0) nextBookmarks.splice(index, 1);
    else nextBookmarks.unshift(bookmark);
    return (await save(nextBookmarks)) ? index < 0 : index >= 0;
  },
};

export { modBookmarks };
