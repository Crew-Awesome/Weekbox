import { modModal } from "../modal/index.js";

const engineDetails = {
  vslice: { name: "Base Game", icon: "vslice.png" },
  psych: { name: "Psych Engine", icon: "psych.png" },
  codename: { name: "Codename Engine", icon: "codename.png" },
};

// Función para obtener el color predominante y aplicarlo a la variable CSS
function extractColor(img, card) {
  const processColor = () => {
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      canvas.width = img.naturalWidth || 64;
      canvas.height = img.naturalHeight || 64;
      ctx.drawImage(img, 0, 0);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

      let r = 0,
        g = 0,
        b = 0,
        count = 0;
      // Saltamos píxeles para ser más rápidos y filtramos colores muy oscuros o muy claros
      for (let i = 0; i < data.length; i += 16) {
        const pr = data[i],
          pg = data[i + 1],
          pb = data[i + 2];
        if (pr > 20 && pr < 240 && pg > 20 && pg < 240 && pb > 20 && pb < 240) {
          r += pr;
          g += pg;
          b += pb;
          count++;
        }
      }

      if (count === 0) {
        // Si todos fueron ignorados, promediamos todo
        for (let i = 0; i < data.length; i += 16) {
          r += data[i];
          g += data[i + 1];
          b += data[i + 2];
          count++;
        }
      }

      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        // Asignamos el color con un poco de opacidad para el resplandor
        card.style.setProperty("--card-color", `rgba(${r}, ${g}, ${b}, 0.7)`);
      }
    } catch (e) {
      // Fallback si la imagen no permite lectura por CORS
      card.style.setProperty("--card-color", "rgba(255, 255, 255, 0.3)");
    }
  };

  if (img.complete) processColor();
  else img.addEventListener("load", processColor);
}

export function createCard(mod, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-card mod-card-pending";
  card.style.setProperty("--card-index", index);

  const imageContainer = document.createElement("div");
  imageContainer.className = "mod-image-container";
  const image = document.createElement("img");
  image.className = "mod-image";
  image.crossOrigin = "Anonymous"; // Permitir lectura en canvas
  image.src = mod.image;
  image.alt = "";
  image.loading = "lazy";
  imageContainer.appendChild(image);

  // Extraer el color cuando la imagen se cargue
  extractColor(image, card);

  const info = document.createElement("div");
  info.className = "mod-info";

  const title = document.createElement("h3");
  title.className = "mod-title";
  title.textContent = mod.title;

  const author = document.createElement("p");
  author.className = "mod-author";
  author.textContent = `by ${mod.author}`;

  info.append(title, author);

  let engineBadgeHtml = `
    <div class="home-engine-badge grid-engine-badge">
      <i class="fa-solid fa-question-circle"></i>
      <span>Unassigned</span>
    </div>
  `;
  const engine = engineDetails[mod.engineId];
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
    ["fa-solid fa-eye", Number(mod.views).toLocaleString()],
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

  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      card.classList.remove("mod-card-pending");
      card.classList.add("mod-card-enter");
    }),
  );
  card.addEventListener("animationend", (event) => {
    if (event.animationName === "mod-card-fade-in")
      card.classList.remove("mod-card-enter");
  });

  return card;
}
