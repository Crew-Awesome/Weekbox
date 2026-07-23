import { FS } from "../../../utils/filesystem.js";

const modCoverCache = new Map();

export function primeModCover(modId, coverUrl) {
  if (coverUrl) modCoverCache.set(String(modId), coverUrl);
}

export async function getModCover(modId, fetchDetails) {
  const cacheKey = String(modId);
  // Always reflect the current locally stored cover. The settings modal reads
  // the same source, so this keeps the card in sync after a cover is edited or
  // reassigned (imported mods in particular get their cover changed later).
  const localCover = await FS.getModCover(modId);
  if (localCover) {
    primeModCover(modId, localCover);
    return localCover;
  }
  if (modCoverCache.has(cacheKey)) return modCoverCache.get(cacheKey);

  const cover = await FS.ensureModCover(modId, async () => {
    const details = await fetchDetails(modId, {
      includeRequirements: false,
    });
    const imageUrl = details?.images?.[0];
    return imageUrl === "assets/icons/launcher-icon.png" ? null : imageUrl;
  });
  primeModCover(modId, cover);
  return cover;
}

export function loadModCardImage({
  mod,
  card,
  fetchDetails,
  applyDominantColor,
}) {
  const image = card.querySelector(".mod-manager-cover");
  const finishLoading = (hasCover) => {
    if (!card.isConnected) return;
    card.classList.remove("is-cover-loading");
    card.classList.toggle("has-cover", hasCover);
    card.classList.toggle("has-no-cover", !hasCover);
  };
  Promise.resolve()
    .then(() => getModCover(mod.id, fetchDetails))
    .then((localCover) => {
      if (!localCover || !image) {
        finishLoading(false);
        return;
      }
      const preload = new Image();
      preload.addEventListener("load", () => {
        if (!card.isConnected) return;
        image.src = localCover;
        image.hidden = false;
        applyDominantColor(image, card);
        requestAnimationFrame(() => finishLoading(true));
      });
      preload.addEventListener("error", () => finishLoading(false));
      preload.src = localCover;
    })
    .catch(() => finishLoading(false));
}
