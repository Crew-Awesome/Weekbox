const NON_GAMEBANANA_SOURCES = new Set(["peo", "backstage", "gamejolt"]);

export function toBookmarkCardModel(bookmark) {
  const source = NON_GAMEBANANA_SOURCES.has(bookmark.source)
    ? bookmark.source
    : "gamebanana";
  return {
    ...bookmark,
    id: source === "gamebanana" ? Number(bookmark.id) : bookmark.id,
    source,
    image: bookmark.image || "assets/img/placeholder-mini.jpg",
    followers: Number(bookmark.followers) || 0,
    author: bookmark.author || "",
    timeAgo: bookmark.timeAgo || "",
  };
}
