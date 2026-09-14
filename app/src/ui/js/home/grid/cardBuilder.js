import { modModal } from "../modal/index.js";
import { FS } from "../../../../backend/services/filesystem.js";
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

export function createCard(mod, index) {
  const isPeo = mod.source === "peo";
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-card";
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
  image.src = targetImgSrc;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.onerror = () => {
    image.onerror = null;
    image.src = "assets/img/placeholder-mini.jpg";
  };
  imageContainer.appendChild(image);

  // Engine / category indicator at top-left
  const engine = FS.getEngineDetails(mod.engineId);
  const engineIndicator = document.createElement("span");
  engineIndicator.className = "grid-engine-indicator";
  const labelKey = engine ? engineLabelKeys[mod.engineId] : "home.noEngine";
  const engineName = labelKey ? t(labelKey) : engine?.name || "";
  engineIndicator.dataset.labelKey = labelKey || "";
  engineIndicator.dataset.label = engineName;
  engineIndicator.setAttribute("role", "img");
  engineIndicator.setAttribute("aria-label", engineName);

  if (engine?.icon) {
    const engineIcon = document.createElement("img");
    engineIcon.src = FS.getEngineIconSource(mod.engineId);
    engineIcon.alt = "";
    engineIndicator.appendChild(engineIcon);
  } else {
    const defaultIcon = document.createElement("i");
    defaultIcon.className = "fa-solid fa-question-circle";
    defaultIcon.setAttribute("aria-hidden", "true");
    engineIndicator.appendChild(defaultIcon);
  }

  // Use color cache if available, or lightweight CORS color probe if not yet cached
  if (hasCachedDominantColor(targetImgSrc)) {
    applyDominantColor({ src: targetImgSrc }, card, {
      alpha: 0.5,
      fallback: "rgba(255, 255, 255, 0.08)",
    });
  } else {
    const colorProbe = new Image();
    colorProbe.crossOrigin = "anonymous";
    colorProbe.src = targetImgSrc;
    applyDominantColor(colorProbe, card, {
      alpha: 0.5,
      fallback: "rgba(255, 255, 255, 0.08)",
    });
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

  [
    ["fa-regular fa-clock", mod.timeAgo],
    ["fa-solid fa-heart", Number(mod.likes).toLocaleString()],
    [
      isPeo ? "fa-solid fa-download" : "fa-solid fa-eye",
      Number(isPeo ? mod.downloads : mod.views).toLocaleString(),
    ],
  ].forEach(([icon, value]) => {
    const stat = document.createElement("span");
    const iconElement = document.createElement("i");
    iconElement.className = icon;
    iconElement.setAttribute("aria-hidden", "true");
    stat.append(iconElement, document.createTextNode(` ${value}`));
    stats.appendChild(stat);
  });

  info.append(details, stats);
  card.append(imageContainer, engineIndicator, info);
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
  card.addEventListener("click", () => modModal.openAuthor(member.id));
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
