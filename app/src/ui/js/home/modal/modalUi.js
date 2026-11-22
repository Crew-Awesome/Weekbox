import { ENGINE_DETAILS } from "../../../../backend/config/engines.config.js";
import { FS } from "../../../../backend/services/filesystem/index.js";
import { errorHandler } from "../../errors/errorHandler.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./dialogFocus.js";
import { enhanceContentLinks } from "../../contentLinks.js";
import { setModalBackdrop } from "./modalBackdrop.js";
import { modModal } from "./index.js";
import { renderModalContributors } from "./contributorsRenderer.js";
import { homeCarousel } from "../carousel.js";
import { getEngineLabel, i18n, t } from "../../i18n/index.js";
import { setButtonLoading } from "../../hourglass.js";
import { modBookmarks } from "../../../../backend/core/state/mod-bookmarks.service.js";
import { sanitizeReleaseDom } from "../../engines/releaseNotes.js";

const WEEKBOX_AVATAR = "assets/icons/launcher-icon.png";
const MODAL_OPEN_GUARD_MS = 350;
const modalHideTimers = new WeakMap();
const modalShowFrames = new WeakMap();

function safeExternalUrl(value) {
  try {
    const rawUrl = String(value || "").trim();
    if (!/^https?:\/\//i.test(rawUrl)) return "";
    const url = new URL(rawUrl);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function isFallbackAvatar(url) {
  return (
    !url ||
    /(?:static\/img\/defaults\/avatar\.gif|(?:assets\/)?img\/placeholder-mini\.jpg)/i.test(
      url,
    )
  );
}

function setAvatarImage(image, url) {
  const fallback = isFallbackAvatar(url);
  image.classList.toggle("is-weekbox-avatar", fallback);
  image.src = fallback ? WEEKBOX_AVATAR : url;
  image.onerror = () => {
    image.onerror = null;
    image.classList.add("is-weekbox-avatar");
    image.src = WEEKBOX_AVATAR;
  };
}

function setModalDownloadButton(button, iconClass, text, disabled = false) {
  if (!button) return;
  button.disabled = disabled;
  const state = document.createElement("span");
  state.className = "modal-download-state";
  const icon = document.createElement("i");
  icon.className = iconClass;
  icon.setAttribute("aria-hidden", "true");
  const label = document.createElement("span");
  label.className = "modal-download-label";
  label.textContent = text;
  state.append(icon, label);
  button.replaceChildren(state);
}

function setModalTab(tabName = "description") {
  const modal = document.getElementById("mod-modal");
  if (!modal) return;
  modal.querySelectorAll(".modal-tab").forEach((tab) => {
    const selected = tab.dataset.modalTab === tabName;
    tab.classList.toggle("is-active", selected);
    tab.setAttribute("aria-selected", String(selected));
  });
  modal.querySelectorAll(".modal-tab-panel").forEach((panel) => {
    const selected = panel.dataset.modalPanel === tabName;
    panel.hidden = !selected;
    panel.classList.toggle("is-active", selected);
  });
}

function bindModalTabs(modal) {
  modal.querySelectorAll(".modal-tab").forEach((tab) => {
    tab.onclick = () => setModalTab(tab.dataset.modalTab);
  });
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
  bindModalTabs(modal);
  [modal, profileModal].forEach((element) => {
    i18n.apply(element);
    element.querySelectorAll(".modal-close-btn").forEach((closeBtn) => {
      closeBtn.onclick = onClose;
    });
    element.onclick = (event) => {
      if (
        event.target === element &&
        performance.now() >= Number(element.dataset.openingGuardUntil || 0)
      ) {
        onClose();
      }
    };
  });
  const profileBack = profileModal.querySelector("#modal-profile-back");
  if (profileBack) profileBack.onclick = onProfileBack;
}

function showModal(modalId = "mod-modal") {
  homeCarousel.stopAutoSlide();
  const modal = document.getElementById(modalId);
  const hideTimer = modalHideTimers.get(modal);
  if (hideTimer) {
    clearTimeout(hideTimer);
    modalHideTimers.delete(modal);
  }
  const showFrame = modalShowFrames.get(modal);
  if (showFrame) {
    cancelAnimationFrame(showFrame);
    modalShowFrames.delete(modal);
  }
  const otherModalId =
    modalId === "mod-modal" ? "mod-profile-modal" : "mod-modal";
  const otherModal = document.getElementById(otherModalId);
  if (otherModal) {
    deactivateCheckoutDialog(otherModal, false);
    otherModal.classList.remove("show");
    otherModal.style.display = "none";
  }
  modal.dataset.openingGuardUntil = String(
    performance.now() + MODAL_OPEN_GUARD_MS,
  );
  modal.style.display = "flex";
  const frame = requestAnimationFrame(() => {
    modalShowFrames.delete(modal);
    modal.classList.add("show");
    const activeView = modal.querySelector(".modal-content");
    activateCheckoutDialog(
      modal,
      activeView,
      activeView?.querySelector(".modal-close-btn"),
      () => activeView?.querySelector(".modal-close-btn")?.click(),
    );
  });
  modalShowFrames.set(modal, frame);
}

function hideModal(modalId = "mod-modal") {
  homeCarousel.startAutoSlide();
  const modal = document.getElementById(modalId);
  if (!modal) return;
  const showFrame = modalShowFrames.get(modal);
  if (showFrame) {
    cancelAnimationFrame(showFrame);
    modalShowFrames.delete(modal);
  }
  const hideTimer = modalHideTimers.get(modal);
  if (hideTimer) clearTimeout(hideTimer);
  deactivateCheckoutDialog(modal);
  modal.classList.remove("show");
  const nextHideTimer = setTimeout(() => {
    modal.style.display = "none";
    modalHideTimers.delete(modal);
  }, 260);
  modalHideTimers.set(modal, nextHideTimer);
}

function resetModal() {
  setModalBackdrop(document.getElementById("mod-modal"), "");
  setModalInfoLoading(true);
  setModalTab("description");
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
  ["modal-category-row", "modal-rating-row"].forEach((id) => {
    const row = document.getElementById(id);
    if (row) row.hidden = true;
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
    authorEl.parentElement?.querySelector(".mod-wip-badge--modal")?.remove();
    authorEl.hidden = false;
    authorEl.disabled = true;
    authorEl.onclick = null;
  }
  const creditGroups = document.getElementById("modal-credit-groups");
  const creditEmpty = document.getElementById("modal-no-credits");
  if (creditGroups) creditGroups.replaceChildren();
  if (creditEmpty) creditEmpty.hidden = false;
  const requirements = document.getElementById("modal-requirements");
  const requirementsSection = document.getElementById(
    "modal-requirements-section",
  );
  if (requirements) requirements.replaceChildren();
  if (requirementsSection) requirementsSection.hidden = true;
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
  const bookmarkButton = document.getElementById("modal-bookmark-btn");
  if (bookmarkButton) {
    bookmarkButton.onclick = null;
    bookmarkButton.disabled = true;
    bookmarkButton.setAttribute("aria-pressed", "false");
    bookmarkButton.setAttribute("aria-label", t("modModal.addBookmark"));
    bookmarkButton.title = t("modModal.addBookmark");
    bookmarkButton.querySelector("i")?.classList.remove("fa-solid");
    bookmarkButton.querySelector("i")?.classList.add("fa-regular");
  }
  const engineBadge = document.getElementById("modal-engine-badge");
  if (engineBadge) engineBadge.hidden = true;
  const engineName = document.getElementById("modal-engine-name");
  if (engineName) engineName.textContent = "";
}

function updateBookmarkButton(data) {
  const button = document.getElementById("modal-bookmark-btn");
  if (!button) return;
  const saved = modBookmarks.has(data);
  const label = t(saved ? "modModal.removeBookmark" : "modModal.addBookmark");
  button.disabled = !data?.id;
  button.setAttribute("aria-pressed", String(saved));
  button.setAttribute("aria-label", label);
  button.title = label;
  const icon = button.querySelector("i");
  icon?.classList.toggle("fa-solid", saved);
  icon?.classList.toggle("fa-regular", !saved);
  button.onclick = () => {
    void modBookmarks.toggle(data).then(() => updateBookmarkButton(data));
  };
}

function setModalInfoLoading(loading, loaderId = "modal-info-loader") {
  const loader = document.getElementById(loaderId);
  if (loader) loader.hidden = !loading;
}

function linkifyDescriptionUrls(content) {
  const textNodes = [];
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const textNode = walker.currentNode;
    if (
      !textNode.parentElement?.closest("a, button, code, pre, script, style")
    ) {
      textNodes.push(textNode);
    }
  }
  const urlPattern = /https?:\/\/[^\s<>"']+/gi;
  textNodes.forEach((textNode) => {
    const matches = [...textNode.textContent.matchAll(urlPattern)];
    if (!matches.length) return;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    matches.forEach((match) => {
      const index = match.index || 0;
      const rawUrl = match[0];
      const url = rawUrl.replace(/[),.!?;:]+$/g, "");
      if (!url) return;
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

function updateWipBadge(data) {
  const author = document.getElementById("modal-author");
  if (!author?.parentElement) return;
  author.parentElement.querySelector(".mod-wip-badge--modal")?.remove();
  const isWip =
    data.source === "backstage" && (data.categoryId === "wips" || data.wip);
  if (!isWip) return;
  const progress = Number(data.wip?.progress);
  const badge = document.createElement("span");
  badge.className = "mod-wip-badge mod-wip-badge--modal";
  badge.textContent = `WIP${Number.isFinite(progress) ? ` ${progress}%` : ""}`;
  badge.setAttribute(
    "aria-label",
    Number.isFinite(progress)
      ? `Work in progress, ${progress}% complete`
      : "Work in progress",
  );
  author.insertAdjacentElement("afterend", badge);
}

function updateBackstageDetailRows(data) {
  const isBackstage = data.source === "backstage";
  const categoryRow = document.getElementById("modal-category-row");
  const categoryValue = document.getElementById("modal-category");
  if (categoryRow) categoryRow.hidden = !isBackstage || !data.categoryName;
  if (categoryValue) categoryValue.textContent = data.categoryName || "";

  const ratingRow = document.getElementById("modal-rating-row");
  const ratingValue = document.getElementById("modal-rating");
  const stars = Number(data.stars) || 0;
  const ratings = Number(data.ratings) || 0;
  const ratingParts = [];
  if (stars > 0)
    ratingParts.push(
      `${stars.toLocaleString()} ${stars === 1 ? "star" : "stars"}`,
    );
  if (ratings > 0)
    ratingParts.push(
      `${ratings.toLocaleString()} ${ratings === 1 ? "rating" : "ratings"}`,
    );
  if (ratingRow) ratingRow.hidden = !isBackstage || ratingParts.length === 0;
  if (ratingValue) ratingValue.textContent = ratingParts.join(" · ");
}

function renderModalDescription(description, data) {
  const body = sanitizeReleaseDom(data.description || "");
  linkifyDescriptionUrls(body);
  description.replaceChildren(...body.childNodes);
  enhanceContentLinks(description, {
    onProviderMod: (modId) => modModal.open(modId),
    onGameBanana: async (submission, reference) => {
      try {
        await modModal.openSubmission(submission);
      } catch (error) {
        console.error("Could not open GameBanana submission reference", error);
        errorHandler.show({
          error,
          action: "Open GameBanana reference",
          item: reference.title,
          logToConsole: false,
        });
      }
    },
  });
}

function getModalEngine(data) {
  return (
    FS.getEngineDetails(data.engineId) ||
    ENGINE_DETAILS[data.engineId] ||
    (data.source === "backstage" && data.engineName
      ? { name: data.engineName }
      : null)
  );
}

function getModalEngineIconSource(data) {
  if (data.engineId) return FS.getEngineIconSource(data.engineId);
  if (data.source !== "backstage") return "";
  if (data.engineName === "Kade Engine") return "assets/icons/kade.png";
  return data.icon || "";
}

function resetProfileModal() {
  setModalInfoLoading(true, "profile-info-loader");
  const profileName = document.getElementById("modal-profile-name");
  const profileAvatar = document.getElementById("modal-profile-avatar");
  const profileLink = document.getElementById("modal-profile-link");
  const profileBack = document.getElementById("modal-profile-back");
  const profileGrid = document.getElementById("modal-profile-grid");
  const profileGridTitle = document.getElementById("modal-profile-grid-title");
  if (profileName) profileName.textContent = t("common.loading");
  if (profileAvatar) {
    profileAvatar.classList.add("is-weekbox-avatar");
    profileAvatar.src = WEEKBOX_AVATAR;
  }
  if (profileLink) profileLink.hidden = true;
  const profileLinkIcon = profileLink?.querySelector("img");
  if (profileLinkIcon) profileLinkIcon.src = "assets/icons/gamebanana.png";
  if (profileBack) profileBack.hidden = true;
  if (profileGridTitle) {
    profileGridTitle.dataset.i18n = "modModal.profileMods";
    profileGridTitle.textContent = t("modModal.profileMods");
  }
  if (profileGrid) {
    profileGrid.className = "grid-layout mod-profile-grid";
    profileGrid.replaceChildren();
  }
}

function showProfileData(
  profile,
  mods,
  source = "gamebanana",
  contributionsFailed = false,
) {
  setModalInfoLoading(false, "profile-info-loader");
  const profileName = document.getElementById("modal-profile-name");
  const profileAvatar = document.getElementById("modal-profile-avatar");
  const profileLink = document.getElementById("modal-profile-link");
  const profileGrid = document.getElementById("modal-profile-grid");
  const profileGridTitle = document.getElementById("modal-profile-grid-title");
  if (profileName) profileName.textContent = profile.username;
  if (profileGridTitle) {
    profileGridTitle.textContent =
      source === "backstage" ? "Contributions" : t("modModal.profileMods");
    if (source === "backstage") profileGridTitle.removeAttribute("data-i18n");
    else profileGridTitle.dataset.i18n = "modModal.profileMods";
  }
  if (profileAvatar) setAvatarImage(profileAvatar, profile.avatar);
  if (profileLink) {
    const profileUrl = safeExternalUrl(profile.profileUrl);
    profileLink.hidden = !profileUrl;
    if (profileUrl) profileLink.href = profileUrl;
    const profileLinkIcon = profileLink.querySelector("img");
    if (profileLinkIcon) {
      profileLinkIcon.src =
        source === "backstage"
          ? "assets/icons/backstage.png"
          : "assets/icons/gamebanana.png";
    }
    profileLink.onclick = (event) => {
      event.preventDefault();
      if (profileUrl) Neutralino.os.open(profileUrl).catch(() => {});
    };
  }
  if (profileGrid) {
    profileGrid.replaceChildren();
    if (!mods.length) {
      profileGrid.classList.add("grid-empty");
      profileGrid.textContent = contributionsFailed
        ? "Could not load contributions. Try again later."
        : source === "backstage"
          ? "No contributions found."
          : t("modModal.noProfileMods");
    }
  }
  return profileGrid;
}

function updateModalGameBananaLink(link, data) {
  const sourceUrl = safeExternalUrl(
    data.source === "peo" ||
      data.source === "backstage" ||
      data.source === "gamejolt"
      ? data.sourceUrl
      : data.gameBananaUrl,
  );
  if (sourceUrl) link.href = sourceUrl;
  else link.removeAttribute("href");
  link.hidden = !sourceUrl;
  const image = link.querySelector("img");
  if (image)
    image.src =
      data.source === "peo"
        ? "assets/icons/psychonline.png"
        : data.source === "backstage"
          ? "assets/icons/backstage.png"
          : data.source === "gamejolt"
            ? "assets/icons/gamejolt.png"
            : "assets/icons/gamebanana.png";
  if (data.source === "peo") {
    link.setAttribute(
      "aria-label",
      t("modModal.openOnPsychOnline", { title: data.title }),
    );
    link.title = t("modModal.openOnPsychOnline", { title: data.title });
  }
  if (data.source === "backstage") {
    link.setAttribute("aria-label", `Open ${data.title} on FunkinBackstage`);
    link.title = `Open ${data.title} on FunkinBackstage`;
  } else if (data.source === "gamejolt") {
    link.setAttribute("aria-label", `Open ${data.title} on GameJolt`);
    link.title = `Open ${data.title} on GameJolt`;
  } else if (data.source !== "peo") {
    const label = t("dependencies.openOnGameBanana", {
      title: data.title || "",
    });
    link.setAttribute("aria-label", label);
    link.title = label;
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
    ? () =>
        modModal.openAuthor(data.authorId, data.authorSource || "gamebanana")
    : null;
}

function updateModalProviderTabs(data) {
  const tab = document.getElementById("modal-tab-contributors");
  if (!tab) return;
  const songs =
    data.source === "gamejolt" && Array.isArray(data.songs) ? data.songs : [];
  const showMusic = data.source === "gamejolt" && songs.length > 0;
  tab.hidden = data.source === "gamejolt" && !showMusic;
  tab.textContent = showMusic ? "Music" : t("modModal.tabContributors");
  if (showMusic) tab.removeAttribute("data-i18n");
  else tab.dataset.i18n = "modModal.tabContributors";
}

function updateModalRequirements(data) {
  const section = document.getElementById("modal-requirements-section");
  const list = document.getElementById("modal-requirements");
  if (!section || !list) return;
  list.replaceChildren();
  const requirements = Array.isArray(data.requirementLinks)
    ? data.requirementLinks
    : [];
  section.hidden = requirements.length === 0;
  requirements.forEach((requirement) => {
    const requirementUrl = safeExternalUrl(requirement.url);
    if (!requirementUrl) return;
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = requirementUrl;
    link.textContent = requirement.title;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.onclick = (event) => {
      event.preventDefault();
      Neutralino.os.open(requirementUrl).catch(() => {});
    };
    item.appendChild(link);
    list.appendChild(item);
  });
}

function showModData(data, installedCount, onDownload) {
  setModalInfoLoading(false);
  const titleEl = document.getElementById("modal-title");
  if (titleEl) titleEl.textContent = data.title;
  updateModalProviderTabs(data);
  updateBackstageDetailRows(data);
  updateModalAuthor(data);
  updateWipBadge(data);
  renderModalContributors(data, {
    safeExternalUrl,
    setAvatarImage,
    openAuthor: (authorId, source) => modModal.openAuthor(authorId, source),
  });
  updateModalRequirements(data);
  const timeEl = document.getElementById("modal-time");
  if (timeEl) timeEl.textContent = data.submittedTimeAgo || data.timeAgo;
  updateModalDates(data);
  updateModalMetrics(data);
  const description = document.getElementById("modal-description");
  if (description) renderModalDescription(description, data);
  const imgLoader = document.getElementById("modal-image-loader");
  if (imgLoader) imgLoader.style.display = "none";

  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  if (gameBananaLink) updateModalGameBananaLink(gameBananaLink, data);
  updateBookmarkButton(data);
  updateModalEngineBadge(data);
  updateDownloadStatus(data, installedCount, onDownload);
}

function updateModalDates(data) {
  [
    ["modal-modified-date", "modal-modified-time", data.modifiedTimeAgo],
    ["modal-updated-date", "modal-updated-time", data.updatedTimeAgo],
  ].forEach(([dateId, timeId, value]) => {
    const dateEl = document.getElementById(dateId);
    const timeEl = document.getElementById(timeId);
    if (timeEl) timeEl.textContent = value || "--";
    if (dateEl) dateEl.hidden = !value;
  });
}

function updateModalMetrics(data) {
  const likesEl = document.getElementById("modal-likes");
  if (likesEl) {
    likesEl.textContent = Number(data.likes || 0).toLocaleString();
    const metric = likesEl.closest(".modal-detail-metric");
    if (metric) metric.hidden = data.source === "gamejolt";
  }
  const viewsEl = document.getElementById("modal-views");
  if (viewsEl) {
    const count =
      data.source === "gamejolt"
        ? data.followers
        : (data.downloads ?? data.views);
    viewsEl.textContent = Number(count || 0).toLocaleString();
    const label = viewsEl
      .closest(".modal-detail-metric")
      ?.querySelector("span");
    if (label) {
      label.textContent =
        data.source === "gamejolt" ? "Followers" : t("modModal.views");
    }
  }
  const viewsIcon = document.getElementById("modal-views-icon");
  if (viewsIcon) {
    viewsIcon.className =
      data.source === "peo" || data.source === "backstage"
        ? "fa-solid fa-download"
        : data.source === "gamejolt"
          ? "fa-solid fa-user-group"
          : "fa-solid fa-eye";
  }
}

function updateModalEngineBadge(data) {
  const engine = getModalEngine(data);
  const engineBadge = document.getElementById("modal-engine-badge");
  const engineIcon = document.getElementById("modal-engine-icon");
  const engineName = document.getElementById("modal-engine-name");
  if (engine) {
    if (engineIcon) {
      const iconSource = getModalEngineIconSource(data);
      engineIcon.hidden = !iconSource;
      if (iconSource) engineIcon.src = iconSource;
      engineIcon.alt = "";
    }
    if (engineName)
      engineName.textContent = getEngineLabel(data.engineId, engine.name);
    if (engineBadge) engineBadge.hidden = false;
  } else if (engineBadge) {
    engineBadge.hidden = true;
  }
}

function updateDownloadStatus(data, installedCount, onDownload) {
  const isInstalled = installedCount > 0;
  const installedLabel = `${t("modModal.alreadyInstalled")} (${installedCount})`;
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
    if (isInstalled) {
      setModalDownloadButton(
        button,
        "fa-solid fa-check",
        installedLabel,
        false,
      );
    } else if (data.downloadOptions.length > 1) {
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
        data.downloadButtonLabel || t("common.download"),
        false,
      );
    }
    button.onclick = onDownload;
  } else if (isInstalled) {
    button.onclick = null;
    setModalDownloadButton(button, "fa-solid fa-check", installedLabel, true);
  } else {
    setExternalDownloadButton(button, data);
  }
}

function setExternalDownloadButton(button, data) {
  const sourceUrl = safeExternalUrl(
    data.source === "peo" ||
      data.source === "backstage" ||
      data.source === "gamejolt"
      ? data.sourceUrl
      : data.gameBananaUrl,
  );
  const label =
    data.source === "peo"
      ? t("modModal.openOnPsychOnline", { title: data.title || "" })
      : data.source === "backstage"
        ? "Open on FunkinBackstage"
        : data.source === "gamejolt"
          ? "Open on GameJolt"
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

export {
  ensureModal,
  showModal,
  hideModal,
  resetModal,
  resetProfileModal,
  setModalTab,
  setModalInfoLoading,
  showProfileData,
  showModData,
  updateDownloadStatus,
};
