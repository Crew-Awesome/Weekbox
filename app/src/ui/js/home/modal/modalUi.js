import { ENGINE_DETAILS } from "../../../../backend/config/engines.js";

export async function ensureModal(onClose) {
  if (!document.getElementById("mod-modal")) {
    const response = await fetch("src/ui/html/sections/modal.html");
    if (!response.ok) throw new Error("Could not load mod modal");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = await response.text();
    document.body.appendChild(wrapper.firstElementChild);
  }

  const modal = document.getElementById("mod-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  closeBtn.onclick = onClose;
  modal.onclick = (event) => {
    if (event.target === modal) onClose();
  };
}

export function showModal() {
  const modal = document.getElementById("mod-modal");
  modal.style.display = "flex";
  requestAnimationFrame(() => modal.classList.add("show"));
}

export function hideModal() {
  const modal = document.getElementById("mod-modal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

export function resetModal() {
  ["modal-title", "modal-author", "modal-description"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });
  ["modal-time", "modal-likes", "modal-views", "modal-filesize"].forEach(
    (id) => {
      document.getElementById(id).textContent = "--";
    },
  );
  document.getElementById("modal-main-image").src = "";
  document.getElementById("modal-main-image").classList.remove("fade-anim");
  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  gameBananaLink.removeAttribute("href");
  gameBananaLink.onclick = (event) => event.preventDefault();
  gameBananaLink.hidden = true;
  gameBananaLink.querySelector("img").src =
    "https://images.gamebanana.com/static/img/banana.png";
  gameBananaLink.setAttribute("aria-label", "Open this mod on GameBanana");
  gameBananaLink.title = "Open this mod on GameBanana";
  document.getElementById("modal-author").hidden = false;
  document.getElementById("modal-views-icon").className = "fa-solid fa-eye";
  document.getElementById("modal-thumbnails").replaceChildren();
  const progressBar = document.getElementById("modal-progress-bar");
  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
  }
  const button = document.getElementById("modal-download-btn");
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-download"></i> Download';
  button.onclick = null;
  document.getElementById("modal-engine-badge").hidden = true;
  document.getElementById("modal-engine-name").textContent = "";
}

export function showModData(data, isInstalled, onDownload) {
  document.getElementById("modal-title").textContent = data.title;
  const author = document.getElementById("modal-author");
  author.textContent = data.author ? `by ${data.author}` : "";
  author.hidden = Boolean(data.hideAuthor);
  document.getElementById("modal-time").textContent = data.timeAgo;
  document.getElementById("modal-likes").textContent =
    data.likes.toLocaleString();
  document.getElementById("modal-views").textContent = (
    data.downloads ?? data.views
  ).toLocaleString();
  document.getElementById("modal-views-icon").className =
    data.source === "sniro" ? "fa-solid fa-download" : "fa-solid fa-eye";
  const description = document.getElementById("modal-description");
  const content = document.createElement("template");
  content.innerHTML = data.description;
  content.content
    .querySelectorAll(
      "img, picture, video, audio, iframe, embed, object, source",
    )
    .forEach((element) => element.remove());
  description.replaceChildren(content.content);
  document.getElementById("modal-image-loader").style.display = "none";

  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  const sourceUrl =
    data.source === "sniro" ? data.sourceUrl : data.gameBananaUrl;
  if (sourceUrl) gameBananaLink.href = sourceUrl;
  else gameBananaLink.removeAttribute("href");
  gameBananaLink.hidden = !sourceUrl;
  if (data.source === "sniro") {
    gameBananaLink.querySelector("img").src = "assets/icons/psychonline.png";
    gameBananaLink.setAttribute("aria-label", "Open Psych Online mods");
    gameBananaLink.title = "Open Psych Online mods";
  }
  gameBananaLink.onclick = (event) => {
    event.preventDefault();
    if (sourceUrl) Neutralino.os.open(sourceUrl).catch(() => {});
  };

  const engine = ENGINE_DETAILS[data.engineId];
  const engineBadge = document.getElementById("modal-engine-badge");
  const engineIcon = document.getElementById("modal-engine-icon");
  const engineName = document.getElementById("modal-engine-name");
  if (engine) {
    engineIcon.src = `assets/icons/${engine.icon}`;
    engineIcon.alt = "";
    engineName.textContent = engine.name;
    engineBadge.hidden = false;
  } else {
    engineBadge.hidden = true;
  }

  updateDownloadStatus(data, isInstalled, onDownload);
}

export function updateDownloadStatus(data, isInstalled, onDownload) {
  document.getElementById("modal-filesize").textContent = data.fileSizeStr;
  const button = document.getElementById("modal-download-btn");
  if (isInstalled) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
  } else if (data.loadingDownloads) {
    button.disabled = true;
    button.innerHTML =
      '<i class="fa-solid fa-spinner fa-spin"></i> Checking downloads…';
  } else if (data.downloadOptions?.length) {
    button.disabled = false;
    button.innerHTML =
      data.downloadOptions.length > 1
        ? '<i class="fa-solid fa-list"></i> Choose Download'
        : `<i class="fa-solid fa-download"></i> ${data.downloadButtonLabel || "Download"}`;
    button.onclick = onDownload;
  }
}
