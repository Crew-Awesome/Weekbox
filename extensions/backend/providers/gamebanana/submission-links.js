export function parseGameBananaSubmission(url) {
  const match = String(url || "").match(
    /^https?:\/\/(?:www\.)?gamebanana\.com\/(mods|tools)\/(\d+)(?:\/|$|\?)/i,
  );
  if (!match) return null;
  return {
    type: match[1].toLowerCase() === "tools" ? "tool" : "mod",
    id: Number(match[2]),
    url: `https://gamebanana.com/${match[1].toLowerCase()}/${match[2]}`,
  };
}

export function isDependencySubmission(url, excludedSubmissionIds) {
  const match = String(url || "").match(
    /^https?:\/\/(?:www\.)?gamebanana\.com\/(mods|tools|wips)\/(\d+)(?:\/|$|\?)/i,
  );
  return (
    !match ||
    !excludedSubmissionIds.has(`${match[1].toLowerCase()}:${match[2]}`)
  );
}
