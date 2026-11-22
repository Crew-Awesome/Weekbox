import { FS } from "../../../backend/services/filesystem/index.js";
import { createBoundedTaskQueue } from "../../../backend/utils/async-concurrency.util.mjs";
import { hasCachedDominantColor } from "../../utils/media/extract-color.util.js";

const MAX_MOD_COVER_CACHE = 200;
const modCoverCache = new Map();
const pendingCoverLoads = new Map();
const cardCoverQueue = createBoundedTaskQueue(4);
const cardImageLoads = new WeakMap();
const PLACEHOLDER_IMAGE = "assets/img/placeholder-mini.jpg";

const cardImageObserver =
  typeof IntersectionObserver === "function"
    ? new IntersectionObserver(
        (entries, observer) => {
          for (const entry of entries) {
            if (!entry.target.isConnected) {
              observer.unobserve(entry.target);
              cardImageLoads.delete(entry.target);
              continue;
            }
            if (!entry.isIntersecting) continue;
            observer.unobserve(entry.target);
            const load = cardImageLoads.get(entry.target);
            cardImageLoads.delete(entry.target);
            if (load) cardCoverQueue.enqueue(entry.target, load);
          }
        },
        { rootMargin: "480px 0px" },
      )
    : null;

export function primeModCover(modId, coverUrl) {
  if (!coverUrl) return;
  const key = String(modId);
  if (modCoverCache.has(key)) modCoverCache.delete(key);
  while (modCoverCache.size >= MAX_MOD_COVER_CACHE) {
    modCoverCache.delete(modCoverCache.keys().next().value);
  }
  modCoverCache.set(key, coverUrl);
}

async function resolveModCover(mod, fetchDetails) {
  const modId = String(mod.id);
  const localCover = await FS.getModCover(modId);
  if (localCover) return localCover;

  const cachedCover = modCoverCache.get(modId);
  if (cachedCover) return cachedCover;

  let imageUrl = mod.image || null;
  if (!imageUrl || imageUrl === PLACEHOLDER_IMAGE) {
    try {
      const details = await fetchDetails(modId, { includeRequirements: false });
      imageUrl =
        details?.source === "backstage"
          ? details.image || details.thumbnail || details.images?.[0]
          : details?.images?.find(
              (image) => image && image !== PLACEHOLDER_IMAGE,
            );
    } catch {
      imageUrl = null;
    }
  }

  if (
    !imageUrl ||
    imageUrl === "assets/icons/launcher-icon.png" ||
    imageUrl === PLACEHOLDER_IMAGE
  ) {
    return PLACEHOLDER_IMAGE;
  }

  try {
    const cover = await FS.ensureModCover(modId, async () => imageUrl);
    return cover || imageUrl;
  } catch {
    // The webview can display some remote images even when it cannot cache them.
    return imageUrl;
  }
}

export function getModCover(mod, fetchDetails) {
  const modId = String(mod.id);
  if (pendingCoverLoads.has(modId)) return pendingCoverLoads.get(modId);

  const request = resolveModCover(mod, fetchDetails)
    .then((cover) => {
      primeModCover(modId, cover);
      return cover;
    })
    .finally(() => pendingCoverLoads.delete(modId));
  pendingCoverLoads.set(modId, request);
  return request;
}

export function loadModCardImage({
  mod,
  card,
  fetchDetails,
  applyDominantColor,
}) {
  const image = card.querySelector(".mod-manager-cover");
  const load = async () => {
    if (!card.isConnected || !image) return;
    try {
      const coverUrl = await getModCover(mod, fetchDetails);
      if (!card.isConnected || !coverUrl) return;

      if (hasCachedDominantColor(coverUrl)) {
        image.src = coverUrl;
        image.hidden = false;
        applyDominantColor(image, card);
        card.classList.remove("is-cover-loading");
        card.classList.add("has-cover");
        return;
      }

      const preload = new Image();
      preload.addEventListener(
        "load",
        () => {
          if (!card.isConnected) return;
          image.src = coverUrl;
          image.hidden = false;
          image.onerror = () => {
            image.hidden = true;
            image.removeAttribute("src");
            card.classList.remove("is-cover-loading");
            card.classList.add("has-no-cover");
          };
          applyDominantColor(image, card);
          requestAnimationFrame(() => {
            card.classList.remove("is-cover-loading");
            card.classList.add("has-cover");
          });
        },
        { once: true },
      );
      preload.addEventListener(
        "error",
        () => {
          if (!card.isConnected) return;
          card.classList.remove("is-cover-loading");
          card.classList.add("has-no-cover");
        },
        { once: true },
      );
      preload.src = coverUrl;
    } catch {
      if (!card.isConnected) return;
      card.classList.remove("is-cover-loading");
      card.classList.add("has-no-cover");
    }
  };

  if (!cardImageObserver) {
    cardImageLoads.set(card, load);
    cardCoverQueue.enqueue(card, load);
    return;
  }
  cardImageLoads.set(card, load);
  cardImageObserver.observe(card);
}

export function releaseModCardImage(card) {
  cardImageObserver?.unobserve(card);
  cardImageLoads.delete(card);
  cardCoverQueue.cancel(card);
}
