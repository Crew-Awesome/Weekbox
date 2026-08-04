import { modModal } from "../modal/index.js";
import { ENGINE_DETAILS } from "../../../../backend/config/engines.config.js";
import { applyDominantColor } from "../../../utils/media/extract-color.util.js";
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
  if (isPeo) card.classList.add("mod-card--no-author");

  const cardBg = document.createElement("div");
  cardBg.className = "mod-card-bg";
  card.appendChild(cardBg);

  const imageContainer = document.createElement("div");
  imageContainer.className = "mod-image-container";

  const image = document.createElement("img");
  image.className = "mod-image";
  image.src = mod.image;
  image.alt = "";
  image.loading = "lazy";
  image.decoding = "async";
  image.onerror = () => {
    image.onerror = null;
    image.src = "assets/icons/launcher-icon.png";
  };
  imageContainer.appendChild(image);

  // Engine / category indicator at top-left
  const engine = ENGINE_DETAILS[mod.engineId];
  const engineIndicator = document.createElement("span");
  engineIndicator.className = "grid-engine-indicator";
  const labelKey = engine
    ? engineLabelKeys[mod.engineId]
    : mod.gameId === 8694
      ? "home.baseGame"
      : "import.unassigned";
  const engineName = labelKey ? t(labelKey) : engine?.name || "";
  engineIndicator.dataset.labelKey = labelKey || "";
  engineIndicator.dataset.label = engineName;
  engineIndicator.setAttribute("role", "img");
  engineIndicator.setAttribute("aria-label", engineName);

  if (engine?.icon) {
    const engineIcon = document.createElement("img");
    engineIcon.src = `assets/icons/${engine.icon}`;
    engineIcon.alt = "";
    engineIndicator.appendChild(engineIcon);
  } else if (mod.gameId === 8694) {
    const fnfIcon = document.createElement("img");
    fnfIcon.src = "assets/icons/vslice.png";
    fnfIcon.alt = "";
    engineIndicator.appendChild(fnfIcon);
  } else {
    const defaultIcon = document.createElement("i");
    defaultIcon.className = "fa-solid fa-question-circle";
    defaultIcon.setAttribute("aria-hidden", "true");
    engineIndicator.appendChild(defaultIcon);
  }

  // Keep the displayed image on its normal request path. A separate CORS-safe
  // image lets the canvas read the cover pixels for the hover color.
  const colorProbe = new Image();
  colorProbe.crossOrigin = "anonymous";
  colorProbe.src = mod.image;
  colorProbe.addEventListener("error", () => {
    card.style.setProperty("--card-color", "rgba(255, 255, 255, 0.2)");
  });
  applyDominantColor(colorProbe, card, {
    alpha: 0.5,
    fallback: "rgba(255, 255, 255, 0.08)",
  });

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
