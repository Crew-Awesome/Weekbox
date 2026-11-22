function getArtwork(details, preferred = "") {
  const image = details?.images?.find(
    (item) => item && !item.includes("placeholder-mini"),
  );
  return image || details?.image || details?.thumbnail || preferred || null;
}

export function resolveCoverSource(modId, sourceType) {
  const value = String(modId);
  if (value.startsWith("gamejolt:")) {
    return { provider: "gamejolt", id: value.slice("gamejolt:".length) };
  }
  if (value.startsWith("backstage:")) {
    return { provider: "backstage", id: value.slice("backstage:".length) };
  }
  const source = value.match(/^(mod|tool):(\d+)$/);
  return {
    provider: "gamebanana",
    type: sourceType === "tool" || source?.[1] === "tool" ? "tool" : "mod",
    id: source?.[2] || modId,
  };
}

export function fetchCoverSourceDetails(source, providers) {
  if (source.provider === "gamejolt") {
    return providers.gamejolt.getGameDetails(source.id);
  }
  if (source.provider === "backstage") {
    return providers.backstage.getModDetails(source.id);
  }
  return source.type === "tool"
    ? providers.gamebanana.getToolDetails(source.id)
    : providers.gamebanana.getModDetails(source.id, {
        includeRequirements: false,
      });
}

export function selectCoverUrl(source, details, fallbackCoverUrl) {
  if (source.provider === "gamejolt") {
    return details?.image || fallbackCoverUrl || getArtwork(details);
  }
  if (source.provider === "backstage") {
    return (
      details?.image ||
      details?.thumbnail ||
      fallbackCoverUrl ||
      getArtwork(details)
    );
  }
  return source.type === "tool"
    ? details?.thumbnail || fallbackCoverUrl
    : getArtwork(details, fallbackCoverUrl);
}
