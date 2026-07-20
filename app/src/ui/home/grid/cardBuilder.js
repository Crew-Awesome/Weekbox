import { modModal } from "../modal/index.js";
import { ENGINE_DETAILS } from "../../../config/engines.js";
import { applyDominantColor } from "../../../utils/extractColor.js";

export function createCard(mod, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-card";
  if (mod.source === "sniro") card.classList.add("mod-card--no-author");

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
  author.textContent = `by ${mod.author}`;
  info.appendChild(title);
  if (mod.source !== "sniro") info.appendChild(author);

  let engineBadgeHtml = `
    <div class="home-engine-badge grid-engine-badge">
      <i class="fa-solid fa-question-circle"></i>
      <span>${mod.gameId === 8694 ? "FNF Mod" : "Unassigned"}</span>
    </div>
  `;

  const engine = ENGINE_DETAILS[mod.engineId];
  if (engine) {
    engineBadgeHtml = `
      <div class="home-engine-badge grid-engine-badge">
        <img src="assets/icons/${engine.icon}" alt=""/>
         <span>${engine.name}</span>
      </div>
    `;
  }

  const badgeWrapper = document.createElement("div");
  badgeWrapper.innerHTML = engineBadgeHtml;
  info.appendChild(badgeWrapper.firstElementChild);

  const stats = document.createElement("div");
  stats.className = "mod-stats";

  [
    ["fa-regular fa-clock", mod.timeAgo],
    ["fa-solid fa-heart", Number(mod.likes).toLocaleString()],
    [
      mod.source === "sniro" ? "fa-solid fa-download" : "fa-solid fa-eye",
      Number(
        mod.source === "sniro" ? mod.downloads : mod.views,
      ).toLocaleString(),
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
