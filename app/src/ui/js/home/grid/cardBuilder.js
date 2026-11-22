import { modModal } from "../modal/index.js";
import { FS } from "../../../../backend/services/filesystem/index.js";
import {
  applyDominantColor,
  hasCachedDominantColor,
} from "../../../utils/media/extract-color.util.js";
import { t } from "../../i18n/index.js";

const engineLabelKeys = {
  vslice: "home.baseGame",
  psych: "home.psychEngine",
  pslice: "home.pSlice",
  fpsplus: "home.fpsPlus",
  psychonline: "home.psychOnline",
  codename: "home.codenameEngine",
  executable: "home.executables",
};

function getModCountStat(mod) {
  if (mod.source === "gamejolt") {
    return [
      "fa-solid fa-user-group",
      Number(mod.followers || 0).toLocaleString(),
    ];
  }
  const showDownloads = mod.source === "peo" || mod.source === "backstage";
  return [
    showDownloads ? "fa-solid fa-download" : "fa-solid fa-eye",
    Number(
      showDownloads ? mod.downloads || 0 : mod.views || 0,
    ).toLocaleString(),
  ];
}

function appendEngineIcon(indicator, mod, engine) {
  let source = engine?.icon ? FS.getEngineIconSource(mod.engineId) : "";
  if (mod.source === "backstage" && mod.engineName === "Kade Engine") {
    source = "assets/icons/kade.png";
  } else if (!source && mod.source === "backstage") {
    source = mod.icon || "";
  }
  if (source) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "";
    image.onerror = () => {
      image.remove();
      const fallback = document.createElement("i");
      fallback.className = "fa-solid fa-question-circle";
      fallback.setAttribute("aria-hidden", "true");
      indicator.appendChild(fallback);
    };
    indicator.appendChild(image);
    return;
  }
  const defaultIcon = document.createElement("i");
  defaultIcon.className = "fa-solid fa-question-circle";
  defaultIcon.setAttribute("aria-hidden", "true");
  indicator.appendChild(defaultIcon);
}

function createEngineIndicator(mod) {
  if (mod.source === "gamejolt") return null;
  const engine = FS.getEngineDetails(mod.engineId);
  const indicator = document.createElement("span");
  indicator.className = "grid-engine-indicator";
  const labelKey = engine
    ? engineLabelKeys[mod.engineId]
    : mod.source === "backstage" && mod.engineName
      ? ""
      : "home.noEngine";
  const engineName = labelKey
    ? t(labelKey)
    : mod.engineName || engine?.name || t("home.noEngine");
  indicator.dataset.labelKey = labelKey || "";
  indicator.dataset.label = engineName;
  indicator.setAttribute("role", "img");
  indicator.setAttribute("aria-label", engineName);
  appendEngineIcon(indicator, mod, engine);
  return indicator;
}

export function createCard(mod, index) {
  const isPeo = mod.source === "peo";
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-card";
  if (mod.source === "gamejolt") card.classList.add("mod-card--gamejolt");
  card.dataset.modId = String(mod.id);
  card.style.setProperty(
    "--card-index",
    String(Math.min(Number(index) || 0, 7)),
  );
  if (isPeo) card.classList.add("mod-card--no-author");

  const cardBg = document.createElement("div");
  cardBg.className = "mod-card-bg";
  card.appendChild(cardBg);

  const imageContainer = document.createElement("div");
  imageContainer.className = "mod-image-container";

  const image = document.createElement("img");
  image.className = "mod-image";
  const targetImgSrc = mod.image || "assets/img/placeholder-mini.jpg";
  const imageSources = [targetImgSrc, ...(mod.imageFallbacks || [])].filter(
    (src, index, sources) => src && sources.indexOf(src) === index,
  );
  let imageSourceIndex = 0;
  image.src = targetImgSrc;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.onerror = () => {
    imageSourceIndex += 1;
    if (imageSourceIndex < imageSources.length) {
      image.src = imageSources[imageSourceIndex];
      return;
    }
    image.onerror = null;
    image.src = "assets/img/placeholder-mini.jpg";
  };
  imageContainer.appendChild(image);

  const wipProgress = Number(mod.wip?.progress);
  const isWip =
    mod.source === "backstage" && (mod.categoryId === "wips" || mod.wip);
  if (isWip) {
    const badge = document.createElement("span");
    badge.className = "mod-wip-badge mod-wip-badge--card";
    badge.textContent = `WIP${Number.isFinite(wipProgress) ? ` ${wipProgress}%` : ""}`;
    badge.setAttribute(
      "aria-label",
      Number.isFinite(wipProgress)
        ? `Work in progress, ${wipProgress}% complete`
        : "Work in progress",
    );
    imageContainer.appendChild(badge);
  }

  const engineIndicator = createEngineIndicator(mod);

  // Use color cache if available, or lightweight CORS color probe if not yet cached
  if (hasCachedDominantColor(targetImgSrc)) {
    applyDominantColor({ src: targetImgSrc }, card, {
      alpha: 0.5,
      fallback: "rgba(255, 255, 255, 0.08)",
    });
  } else {
    let sameOriginImage = false;
    try {
      sameOriginImage =
        new URL(targetImgSrc, window.location.href).origin ===
        window.location.origin;
    } catch {}
    if (sameOriginImage) {
      const colorProbe = new Image();
      colorProbe.src = targetImgSrc;
      applyDominantColor(colorProbe, card, {
        alpha: 0.5,
        fallback: "rgba(255, 255, 255, 0.08)",
      });
    } else {
      card.style.setProperty("--card-color", "rgba(255, 255, 255, 0.08)");
    }
  }

  const info = document.createElement("div");
  info.className = "mod-info";
  const details = document.createElement("div");
  details.className = "home-card-details";

  const title = document.createElement("h3");
  title.className = "mod-title";
  title.textContent = mod.title;

  const author = document.createElement("p");
  author.className = "mod-author";
  author.dataset.i18n = "home.byAuthor";
  author.dataset.i18nVars = JSON.stringify({ author: mod.author });
  author.textContent = t("home.byAuthor", { author: mod.author });
  details.appendChild(title);
  if (!isPeo) details.appendChild(author);

  const stats = document.createElement("div");
  stats.className = "mod-stats";

  const cardStats = [["fa-regular fa-clock", mod.timeAgo]];
  if (mod.source === "gamejolt") {
    cardStats.push([
      "fa-solid fa-user-group",
      Number(mod.followers || 0).toLocaleString(),
    ]);
  } else {
    cardStats.push([
      "fa-solid fa-heart",
      Number(mod.likes || 0).toLocaleString(),
    ]);
    cardStats.push(getModCountStat(mod));
  }
  cardStats.forEach(([icon, value]) => {
    const stat = document.createElement("span");
    const iconElement = document.createElement("i");
    iconElement.className = icon;
    iconElement.setAttribute("aria-hidden", "true");
    stat.append(iconElement, document.createTextNode(` ${value}`));
    stats.appendChild(stat);
  });

  info.append(details, stats);
  card.append(imageContainer, info);
  if (engineIndicator) card.insertBefore(engineIndicator, info);
  card.addEventListener("click", () => modModal.open(mod.id));

  return card;
}

export function createMemberCard(member, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "member-card";
  card.style.setProperty(
    "--card-index",
    String(Math.min(Number(index) || 0, 7)),
  );

  const avatar = document.createElement("img");
  avatar.className = "member-card-avatar";
  const fallbackAvatar =
    !member.avatar ||
    /(?:static\/img\/defaults\/avatar\.gif|(?:assets\/)?img\/placeholder-mini\.jpg)/i.test(
      member.avatar,
    );
  if (fallbackAvatar) avatar.classList.add("is-weekbox-avatar");
  avatar.src = fallbackAvatar
    ? "assets/icons/launcher-icon.png"
    : member.avatar;
  avatar.alt = "";
  avatar.loading = "lazy";
  avatar.onerror = () => {
    avatar.onerror = null;
    avatar.classList.add("is-weekbox-avatar");
    avatar.src = "assets/icons/launcher-icon.png";
  };

  const details = document.createElement("span");
  details.className = "member-card-details";
  const name = document.createElement("strong");
  name.textContent = member.username;
  const label = document.createElement("span");
  label.textContent = t("common.user");
  details.append(name, label);
  card.append(avatar, details);
  card.addEventListener("click", () => {
    modModal.openAuthor(member.id, member.source || "gamebanana");
  });
  return card;
}

export function createFeaturedCard(mod, featuredLabelKey) {
  const card = createCard(mod);
  card.classList.add("mod-card--featured");
  const label = document.createElement("p");
  label.className = "home-featured-label";
  label.dataset.i18n = featuredLabelKey;
  label.textContent = t(featuredLabelKey);
  card.querySelector(".home-card-details")?.prepend(label);
  return card;
}
