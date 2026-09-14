import { ENGINE_DETAILS } from "../../../../backend/config/engines.config.js";
import { FS } from "../../../../backend/services/filesystem.js";
import { errorHandler } from "../../errors/errorHandler.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { enhanceContentLinks } from "../../contentLinks.js";
import { setModalBackdrop } from "./modalBackdrop.js";
import { modModal } from "./index.js";
import { homeCarousel } from "../carousel.js";
import { getEngineLabel, i18n, t } from "../../i18n/index.js";
import { createLoadingState, setButtonLoading } from "../../hourglass.js";

function setModalDownloadButton(button, iconClass, text, disabled = false) {
  if (!button) return;
  button.disabled = disabled;
  const icon = document.createElement("i");
  icon.className = iconClass;
  button.replaceChildren(icon, document.createTextNode(" " + text));
}

async function ensureModal(onClose, onProfileBack) {
  if (!document.getElementById("mod-modal")) {
    const tpl = document.getElementById("tpl-modal");
    if (!tpl) throw new Error("Could not load mod modal");
    document.body.appendChild(tpl.content.cloneNode(true));
  }
  if (!document.getElementById("mod-profile-modal")) {
    const tpl = document.getElementById("tpl-profile-modal");
    if (!tpl) throw new Error("Could not load profile modal");
    document.body.appendChild(tpl.content.cloneNode(true));
  }
  const modal = document.getElementById("mod-modal");
  const profileModal = document.getElementById("mod-profile-modal");
  [modal, profileModal].forEach((element) => {
    i18n.apply(element);
    element.querySelectorAll(".modal-close-btn").forEach((closeBtn) => {
      closeBtn.onclick = onClose;
    });
    element.onclick = (event) => {
      if (event.target === element) onClose();
    };
  });
  const profileBack = profileModal.querySelector("#modal-profile-back");
  if (profileBack) profileBack.onclick = onProfileBack;
}

function showModal(modalId = "mod-modal") {
  homeCarousel.stopAutoSlide();
  const modal = document.getElementById(modalId);
  const otherModalId =
    modalId === "mod-modal" ? "mod-profile-modal" : "mod-modal";
  const otherModal = document.getElementById(otherModalId);
  if (otherModal) {
    deactivateCheckoutDialog(otherModal, false);
    otherModal.classList.remove("show");
    otherModal.style.display = "none";
  }
  modal.style.display = "flex";
  requestAnimationFrame(() => {
    modal.classList.add("show");
    const activeView = modal.querySelector(".modal-content");
    activateCheckoutDialog(
      modal,
      activeView,
      activeView?.querySelector(".modal-close-btn"),
      () => activeView?.querySelector(".modal-close-btn")?.click(),
    );
  });
}

function hideModal(modalId = "mod-modal") {
  homeCarousel.startAutoSlide();
  const modal = document.getElementById(modalId);
  if (!modal) return;
  deactivateCheckoutDialog(modal);
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 260);
}

function resetModal() {
  setModalBackdrop(document.getElementById("mod-modal"), "");
  setModalInfoLoading(true);
  ["modal-title", "modal-author", "modal-description"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "";
  });
  [
    "modal-time",
    "modal-modified-time",
    "modal-updated-time",
    "modal-likes",
    "modal-views",
    "modal-filesize",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.textContent = "--";
  });
  ["modal-modified-date", "modal-updated-date"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.hidden = false;
  });
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
  if (authorEl) {
    authorEl.hidden = false;
    authorEl.disabled = true;
    authorEl.onclick = null;
  }
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
    button.onclick = null;
    setModalDownloadButton(
      button,
      "fa-solid fa-download",
      t("common.download"),
      true,
    );
  }
  const engineBadge = document.getElementById("modal-engine-badge");
  if (engineBadge) engineBadge.hidden = true;
  const engineName = document.getElementById("modal-engine-name");
  if (engineName) engineName.textContent = "";
}

function setModalInfoLoading(loading) {
  const loader = document.getElementById("modal-info-loader");
  if (loader) loader.hidden = !loading;
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

function renderModalDescription(description, data) {
  const doc = new DOMParser().parseFromString(
    data.description || "",
    "text/html",
  );
  doc.body
    .querySelectorAll(
      "img, picture, video, audio, iframe, embed, object, source",
    )
    .forEach((element) => element.remove());
  linkifyDescriptionSubmissionUrls(doc.body);
  description.replaceChildren(...doc.body.childNodes);
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

function resetProfileModal() {
  const profileName = document.getElementById("modal-profile-name");
  const profileAvatar = document.getElementById("modal-profile-avatar");
  const profileLink = document.getElementById("modal-profile-link");
  const profileBack = document.getElementById("modal-profile-back");
  const profileGrid = document.getElementById("modal-profile-grid");
  if (profileName) profileName.textContent = t("common.loading");
  if (profileAvatar) profileAvatar.src = "assets/img/placeholder-mini.jpg";
  if (profileLink) profileLink.hidden = true;
  if (profileBack) profileBack.hidden = true;
  if (profileGrid) {
    profileGrid.className = "grid-layout mod-profile-grid";
    profileGrid.replaceChildren();
    profileGrid.appendChild(
      createLoadingState(
        t("modModal.loadingProfile"),
        28,
        "mod-profile-status",
      ),
    );
  }
}

function showProfileData(profile, mods) {
  const profileName = document.getElementById("modal-profile-name");
  const profileAvatar = document.getElementById("modal-profile-avatar");
  const profileLink = document.getElementById("modal-profile-link");
  const profileGrid = document.getElementById("modal-profile-grid");
  if (profileName) profileName.textContent = profile.username;
  if (profileAvatar && profile.avatar) {
    profileAvatar.src = profile.avatar;
    profileAvatar.onerror = () => {
      profileAvatar.onerror = null;
      profileAvatar.src = "assets/img/placeholder-mini.jpg";
    };
  }
  if (profileLink) {
    profileLink.href = profile.profileUrl;
    profileLink.hidden = false;
    profileLink.onclick = (event) => {
      event.preventDefault();
      Neutralino.os.open(profile.profileUrl).catch(() => {});
    };
  }
  if (profileGrid) {
    profileGrid.replaceChildren();
    if (!mods.length) {
      profileGrid.classList.add("grid-empty");
      profileGrid.textContent = t("modModal.noProfileMods");
    }
  }
  return profileGrid;
}

function updateModalGameBananaLink(link, data) {
  const sourceUrl = data.source === "peo" ? data.sourceUrl : data.gameBananaUrl;
  if (sourceUrl) link.href = sourceUrl;
  else link.removeAttribute("href");
  link.hidden = !sourceUrl;
  if (data.source === "peo") {
    const image = link.querySelector("img");
    if (image) image.src = "assets/icons/psychonline.png";
    link.setAttribute(
      "aria-label",
      t("modModal.openOnPsychOnline", { title: data.title }),
    );
    link.title = t("modModal.openOnPsychOnline", { title: data.title });
  }
  link.onclick = (event) => {
    event.preventDefault();
    if (sourceUrl) Neutralino.os.open(sourceUrl).catch(() => {});
  };
}

function updateModalAuthor(data) {
  const author = document.getElementById("modal-author");
  if (!author) return;
  author.textContent = data.author
    ? t("home.byAuthor", { author: data.author })
    : "";
  author.hidden = Boolean(data.hideAuthor);
  author.disabled = !data.authorId;
  author.onclick = data.authorId
    ? () => modModal.openAuthor(data.authorId)
    : null;
}

function showModData(data, isInstalled, onDownload) {
  setModalInfoLoading(false);
  const titleEl = document.getElementById("modal-title");
  if (titleEl) titleEl.textContent = data.title;
  updateModalAuthor(data);
  const timeEl = document.getElementById("modal-time");
  if (timeEl) timeEl.textContent = data.submittedTimeAgo || data.timeAgo;
  [
    ["modal-modified-date", "modal-modified-time", data.modifiedTimeAgo],
    ["modal-updated-date", "modal-updated-time", data.updatedTimeAgo],
  ].forEach(([dateId, timeId, value]) => {
    const dateEl = document.getElementById(dateId);
    const timeEl = document.getElementById(timeId);
    if (timeEl) timeEl.textContent = value || "--";
    if (dateEl) dateEl.hidden = !value;
  });
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
  if (description) renderModalDescription(description, data);
  const imgLoader = document.getElementById("modal-image-loader");
  if (imgLoader) imgLoader.style.display = "none";

  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  if (gameBananaLink) updateModalGameBananaLink(gameBananaLink, data);
  const engine =
    FS.getEngineDetails(data.engineId) || ENGINE_DETAILS[data.engineId];
  const engineBadge = document.getElementById("modal-engine-badge");
  const engineIcon = document.getElementById("modal-engine-icon");
  const engineName = document.getElementById("modal-engine-name");
  if (engine) {
    if (engineIcon) {
      engineIcon.src = FS.getEngineIconSource(data.engineId);
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
  if (data.loadingDownloads) {
    button.onclick = null;
    setButtonLoading(button, t("modModal.checkingDownloads"));
    button.disabled = true;
  } else if (data.downloadOptions?.length) {
    if (data.downloadOptions.length > 1) {
      setModalDownloadButton(
        button,
        "fa-solid fa-list",
        t("modModal.chooseDownload"),
        false,
      );
    } else {
      setModalDownloadButton(
        button,
        "fa-solid fa-download",
        isInstalled
          ? t("modModal.downloadAnotherCopy")
          : data.downloadButtonLabel || t("common.download"),
        false,
      );
    }
    button.onclick = onDownload;
  } else if (isInstalled) {
    button.onclick = null;
    setModalDownloadButton(
      button,
      "fa-solid fa-check",
      t("modModal.alreadyInstalled"),
      true,
    );
  } else {
    const sourceUrl =
      data.source === "peo" ? data.sourceUrl : data.gameBananaUrl;
    const isPsych = data.source === "peo";
    const label = isPsych
      ? t("modModal.openOnPsychOnline", { title: data.title || "" })
      : t("modModal.downloadOnGameBanana");
    setModalDownloadButton(
      button,
      "fa-solid fa-arrow-up-right-from-square",
      label,
      !sourceUrl,
    );
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
  resetProfileModal,
  setModalInfoLoading,
  showProfileData,
  showModData,
  updateDownloadStatus,
};
