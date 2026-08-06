import { FS } from "../../../backend/services/filesystem.js";
import { hasCachedDominantColor } from "../../utils/media/extract-color.util.js";

const MAX_MOD_COVER_CACHE = 200;
const modCoverCache = new Map();
const PLACEHOLDER_IMAGE = "assets/img/placeholder-mini.jpg";

export function primeModCover(modId, coverUrl) {
  if (coverUrl) {
    if (modCoverCache.size >= MAX_MOD_COVER_CACHE) {
      const oldestKey = modCoverCache.keys().next().value;
      if (oldestKey !== undefined) modCoverCache.delete(oldestKey);
    }
    modCoverCache.set(String(modId), coverUrl);
  }
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
    if (
      !imageUrl ||
      imageUrl === "assets/icons/launcher-icon.png" ||
      imageUrl === PLACEHOLDER_IMAGE
    ) {
      return PLACEHOLDER_IMAGE;
    }
    return imageUrl;
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
      if (hasCachedDominantColor(localCover)) {
        image.src = localCover;
        image.hidden = false;
        applyDominantColor(image, card);
        finishLoading(true);
        return;
      }
      const preload = new Image();
      const onLoad = () => {
        preload.removeEventListener("load", onLoad);
        preload.removeEventListener("error", onError);
        if (!card.isConnected) return;
        image.src = localCover;
        image.hidden = false;
        image.onerror = () => {
          image.hidden = true;
          image.removeAttribute("src");
          finishLoading(false);
        };
        applyDominantColor(image, card);
        requestAnimationFrame(() => finishLoading(true));
      };
      const onError = () => {
        preload.removeEventListener("load", onLoad);
        preload.removeEventListener("error", onError);
        finishLoading(false);
      };
      preload.addEventListener("load", onLoad);
      preload.addEventListener("error", onError);
      preload.src = localCover;
    })
    .catch(() => finishLoading(false));
}

