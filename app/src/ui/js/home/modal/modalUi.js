import { ENGINE_DETAILS } from "../../../../backend/config/engines.config.js";
import { errorHandler } from "../../errors/errorHandler.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { enhanceContentLinks } from "../../contentLinks.js";
import { setModalBackdrop } from "./modalBackdrop.js";
import { modModal } from "./index.js";
import { homeCarousel } from "../carousel.js";
import { getEngineLabel, t } from "../../i18n/index.js";

async function ensureModal(onClose) {
  if (!document.getElementById("mod-modal")) {
    const tpl = document.getElementById("tpl-modal");
    if (!tpl) throw new Error("Could not load mod modal");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = tpl.innerHTML;
    const modalRoot = wrapper.firstElementChild;
    if (!modalRoot) throw new Error("Could not create mod modal");
    document.body.appendChild(modalRoot);
  }
  const modal = document.getElementById("mod-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  closeBtn.onclick = onClose;
  modal.onclick = (event) => {
    if (event.target === modal) onClose();
  };
}

function showModal() {
  homeCarousel.stopAutoSlide();
  const modal = document.getElementById("mod-modal");
  modal.style.display = "flex";
  requestAnimationFrame(() => {
    modal.classList.add("show");
    activateCheckoutDialog(
      modal,
      modal.querySelector(".modal-content"),
      document.getElementById("modal-close-btn"),
      () => document.getElementById("modal-close-btn")?.click(),
    );
  });
}

function hideModal() {
  homeCarousel.startAutoSlide();
  const modal = document.getElementById("mod-modal");
  if (!modal) return;
  deactivateCheckoutDialog(modal);
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

function resetModal() {
  setModalBackdrop(document.getElementById("mod-modal"), "");
  ["modal-title", "modal-author", "modal-description"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  ["modal-time", "modal-likes", "modal-views", "modal-filesize"].forEach(
    (id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "--";
    },
  );
  const mainImage = document.getElementById("modal-main-image");
  if (mainImage) {
    mainImage.src = "";
    mainImage.classList.remove("fade-anim");
  }
  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  if (gameBananaLink) {
    gameBananaLink.removeAttribute("href");
    gameBananaLink.onclick = (event) => event.preventDefault();
    gameBananaLink.hidden = true;
    const gbImg = gameBananaLink.querySelector("img");
    if (gbImg) {
      gbImg.src = "https://images.gamebanana.com/static/img/banana.png";
    }
    gameBananaLink.setAttribute("aria-label", t("home.openOnGameBanana"));
    gameBananaLink.title = t("home.openOnGameBanana");
  }
  const authorEl = document.getElementById("modal-author");
  if (authorEl) authorEl.hidden = false;
  const viewsIcon = document.getElementById("modal-views-icon");
  if (viewsIcon) viewsIcon.className = "fa-solid fa-eye";
  const thumbs = document.getElementById("modal-thumbnails");
  if (thumbs) thumbs.replaceChildren();
  const progressBar = document.getElementById("modal-progress-bar");
  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
  }
  const button = document.getElementById("modal-download-btn");
  if (button) {
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-download"></i> ${t("common.download")}`;
    button.onclick = null;
  }
  const engineBadge = document.getElementById("modal-engine-badge");
  if (engineBadge) engineBadge.hidden = true;
  const engineName = document.getElementById("modal-engine-name");
  if (engineName) engineName.textContent = "";
}

function linkifyDescriptionSubmissionUrls(content) {
  const textNodes = [];
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (!textNode.parentElement?.closest("a, button, script, style")) {
      textNodes.push(textNode);
    }
  }
  const submissionUrl =
    /https?:\/\/(?:www\.)?gamebanana\.com\/(?:mods|tools)\/\d+(?:[/?#][^\s<]*)?|https?:\/\/(?:[\w-]+\.)*sniro\.boo\/mod\/[^\s<]+/gi;
  textNodes.forEach((textNode) => {
    const matches = [...textNode.textContent.matchAll(submissionUrl)];
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach((match) => {
      const url = match[0];
      const index = match.index || 0;
      fragment.append(textNode.textContent.slice(cursor, index));
      const link = document.createElement("a");
      link.href = url;
      link.textContent = url;
      fragment.append(link);
      cursor = index + url.length;
    });
    fragment.append(textNode.textContent.slice(cursor));
    textNode.replaceWith(fragment);
  });
}

function showModData(data, isInstalled, onDownload) {
  const titleEl = document.getElementById("modal-title");
  if (titleEl) titleEl.textContent = data.title;
  const author = document.getElementById("modal-author");
  if (author) {
    author.textContent = data.author
      ? t("home.byAuthor", { author: data.author })
      : "";
    author.hidden = Boolean(data.hideAuthor);
  }
  const timeEl = document.getElementById("modal-time");
  if (timeEl) timeEl.textContent = data.timeAgo;
  const likesEl = document.getElementById("modal-likes");
  if (likesEl) likesEl.textContent = data.likes.toLocaleString();
  const viewsEl = document.getElementById("modal-views");
  if (viewsEl) {
    viewsEl.textContent = (data.downloads ?? data.views).toLocaleString();
  }
  const viewsIcon = document.getElementById("modal-views-icon");
  if (viewsIcon) {
    viewsIcon.className =
      data.source === "peo" ? "fa-solid fa-download" : "fa-solid fa-eye";
  }
  const description = document.getElementById("modal-description");
  if (description) {
    const content = document.createElement("template");
    content.innerHTML = data.description;
    content.content
      .querySelectorAll(
        "img, picture, video, audio, iframe, embed, object, source",
      )
      .forEach((element) => element.remove());
    linkifyDescriptionSubmissionUrls(content.content);
    description.replaceChildren(content.content);
    enhanceContentLinks(description, {
      onGameBanana: async (submission, reference) => {
        try {
          await modModal.openSubmission(submission);
        } catch (error) {
          console.warn("Could not open GameBanana submission reference", error);
          errorHandler.show({
            error,
            action: "Open GameBanana reference",
            item: reference.title,
          });
        }
      },
    });
  }
  const imgLoader = document.getElementById("modal-image-loader");
  if (imgLoader) imgLoader.style.display = "none";

  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  if (gameBananaLink) {
    const sourceUrl =
      data.source === "peo" ? data.sourceUrl : data.gameBananaUrl;
    if (sourceUrl) gameBananaLink.href = sourceUrl;
    else gameBananaLink.removeAttribute("href");
    gameBananaLink.hidden = !sourceUrl;
    if (data.source === "peo") {
      const gbImg = gameBananaLink.querySelector("img");
      if (gbImg) gbImg.src = "assets/icons/psychonline.png";
      gameBananaLink.setAttribute(
        "aria-label",
        t("modModal.openOnPsychOnline", { title: data.title }),
      );
      gameBananaLink.title = t("modModal.openOnPsychOnline", {
        title: data.title,
      });
    }
    gameBananaLink.onclick = (event) => {
      event.preventDefault();
      if (sourceUrl) Neutralino.os.open(sourceUrl).catch(() => {});
    };
  }
  const engine = ENGINE_DETAILS[data.engineId];
  const engineBadge = document.getElementById("modal-engine-badge");
  const engineIcon = document.getElementById("modal-engine-icon");
  const engineName = document.getElementById("modal-engine-name");
  if (engine) {
    if (engineIcon) {
      engineIcon.src = `assets/icons/${engine.icon}`;
      engineIcon.alt = "";
    }
    if (engineName)
      engineName.textContent = getEngineLabel(data.engineId, engine.name);
    if (engineBadge) engineBadge.hidden = false;
  } else if (engineBadge) {
    engineBadge.hidden = true;
  }
  updateDownloadStatus(data, isInstalled, onDownload);
}

function updateDownloadStatus(data, isInstalled, onDownload) {
  const fileSizeEl = document.getElementById("modal-filesize");
  if (fileSizeEl) {
    if (data.loadingDownloads) {
      fileSizeEl.textContent = t("modModal.checkingDownloads");
    } else if (data.downloadOptions?.length) {
      fileSizeEl.textContent = data.fileSizeStr || "--";
    } else {
      fileSizeEl.textContent = t("modModal.noDownloadAvailable");
    }
  }
  const button = document.getElementById("modal-download-btn");
  if (!button) return;
  if (isInstalled) {
    button.disabled = true;
    button.onclick = null;
    button.innerHTML = `<i class="fa-solid fa-check"></i> ${t("modModal.alreadyInstalled")}`;
  } else if (data.loadingDownloads) {
    button.disabled = true;
    button.onclick = null;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> ${t("modModal.checkingDownloads")}`;
  } else if (data.downloadOptions?.length) {
    button.disabled = false;
    button.innerHTML =
      data.downloadOptions.length > 1
        ? `<i class="fa-solid fa-list"></i> ${t("modModal.chooseDownload")}`
        : `<i class="fa-solid fa-download"></i> ${data.downloadButtonLabel || t("common.download")}`;
    button.onclick = onDownload;
  } else {
    const sourceUrl =
      data.source === "peo" ? data.sourceUrl : data.gameBananaUrl;
    button.disabled = !sourceUrl;
    const isPsych = data.source === "peo";
    const label = isPsych
      ? t("modModal.openOnPsychOnline", { title: data.title || "" })
      : t("modModal.downloadOnGameBanana");
    button.innerHTML = `<i class="fa-solid fa-arrow-up-right-from-square"></i> ${label}`;
    button.onclick = (event) => {
      event.preventDefault();
      if (sourceUrl && window.Neutralino?.os?.open) {
        Neutralino.os.open(sourceUrl).catch(() => {});
      }
    };
  }
}

export {
  ensureModal,
  showModal,
  hideModal,
  resetModal,
  showModData,
  updateDownloadStatus,
};
