function parseWeekboxLink(value) {
  const directMatch = String(value || "")
    .trim()
    .match(/^weekbox:\/\/mod(?:\/|,)(\d+)\/?$/i);
  if (directMatch) return { type: "mod", id: Number(directMatch[1]) };
  try {
    const url = new URL(value);
    if (url.protocol !== "weekbox:") return null;
    const type = url.hostname.toLowerCase();
    const id = Number(url.pathname.replace(/^\//, ""));
    if (type !== "mod" || !Number.isInteger(id) || id <= 0) return null;
    return { type, id };
  } catch {
    return null;
  }
}

export { parseWeekboxLink };
