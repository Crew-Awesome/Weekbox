import { modModal } from "../modal/index.js";
import { ENGINE_DETAILS } from "../../../../backend/config/engines.config.js";
import { applyDominantColor } from "../../../utils/index-utils.js";
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
  image.onerror = () => {
    image.onerror = null;
    image.src = "assets/icons/launcher-icon.png";
  };
  imageContainer.appendChild(image);

  // Engine / category indicator at top-left
  const engine = ENGINE_DETAILS[mod.engineId];
  const engineIndicator = document.createElement("span");
  engineIndicator.className = "grid-engine-indicator";
  const engineName = engine
    ? t(engineLabelKeys[mod.engineId]) || engine.name
    : mod.gameId === 8694
      ? t("home.baseGame")
      : t("import.unassigned");
  engineIndicator.dataset.label = engineName;
  engineIndicator.setAttribute("role", "img");
  engineIndicator.setAttribute("aria-label", engineName);

  const engineIndicatorTint = document.createElement("span");
  engineIndicatorTint.className = "grid-engine-indicator-tint";
  engineIndicatorTint.setAttribute("aria-hidden", "true");
  engineIndicator.appendChild(engineIndicatorTint);

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
  imageContainer.appendChild(engineIndicator);

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

  const title = document.createElement("h3");
  title.className = "mod-title";
  title.textContent = mod.title;

  const author = document.createElement("p");
  author.className = "mod-author";
  author.textContent = t("home.byAuthor", { author: mod.author });
  info.appendChild(title);
  if (!isPeo) info.appendChild(author);

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

  info.append(stats);
  card.append(imageContainer, info);
  card.addEventListener("click", () => modModal.open(mod.id));

  return card;
}
