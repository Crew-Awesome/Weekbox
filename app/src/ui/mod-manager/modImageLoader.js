import { FS } from "../../utils/filesystem.js";

const modCoverCache = new Map();

export function primeModCover(modId, coverUrl) {
  if (coverUrl) modCoverCache.set(String(modId), coverUrl);
}

export async function getModCover(modId, fetchDetails) {
  const cacheKey = String(modId);
  if (modCoverCache.has(cacheKey)) return modCoverCache.get(cacheKey);

  const localCover = await FS.ensureModCover(modId, async () => {
    const details = await fetchDetails(modId, {
      includeRequirements: false,
    });
    const imageUrl = details?.images?.[0];
    return imageUrl === "assets/icons/launcher-icon.png" ? null : imageUrl;
  });
  primeModCover(modId, localCover);
  return localCover;
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
