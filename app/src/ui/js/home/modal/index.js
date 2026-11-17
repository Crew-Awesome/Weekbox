import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
import { peoApi } from "../../../../backend/providers/peo/peo.provider.js";
import { backstageApi } from "../../../../backend/providers/backstage/backstage.provider.js";
import { gameJoltApi } from "../../../../backend/providers/gamejolt/gamejolt.provider.js";
import { engineManagerModal } from "../../engine-manager/index.js";
import { FS } from "../../../../backend/services/filesystem.js";
import { modModalCarousel } from "./carousel.js";
import { dependencyReviewModal } from "./dependencyReviewModal.js";
import { downloadChoiceModal } from "./downloadChoiceModal.js";
import { downloadMod } from "./downloadMod.js";
import { createCard } from "../grid/cardBuilder.js";
import { gridRender } from "../grid/gridRender.js";
import { t } from "../../i18n/index.js";
import {
  ensureModal,
  hideModal,
  resetModal,
  resetProfileModal,
  setModalInfoLoading,
  showModal,
  showProfileData,
  showModData,
  updateDownloadStatus,
} from "./modalUi.js";

function getExternalProviderId(modId) {
  return String(modId).match(/^(peo|backstage|gamejolt):(.+)$/);
}

function getProviderModIdFromUrl(value) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    let match;
    if (host === "gamebanana.com" && (match = url.pathname.match(/^\/(mods|tools)\/(\d+)(?:\/|$)/i))) {
      return `${match[1].toLowerCase() === "tools" ? "tool" : "mod"}:${match[2]}`;
    }
    if (host === "gamejolt.com" && (match = url.pathname.match(/^\/games\/(?:[^/]+\/)?(\d+)(?:\/|$)/i))) {
      return `gamejolt:${match[1]}`;
    }
    if (host === "funkinbackstage.net" && (match = url.pathname.match(/^\/mods\/([a-z0-9]+)\/?$/i))) {
      return `backstage:${match[1]}`;
    }
    if (host === "funkin.sniro.boo" && (match = url.pathname.match(/^\/mod\/([^/]+)\/?$/i))) {
      return `peo:${decodeURIComponent(match[1])}`;
    }
  } catch {}
  return null;
}

function fetchProviderModDetails(modId, onProgress) {
  const providerId = getExternalProviderId(modId);
  if (providerId?.[1] === "peo") return peoApi.getModDetails(providerId[2]);
  if (providerId?.[1] === "backstage") return backstageApi.getModDetails(providerId[2]);
  if (providerId?.[1] === "gamejolt") return gameJoltApi.getGameDetails(providerId[2]);
  return gameBananaApi.getModDetails(modId, { onProgress });
}

function showProviderDetailsError() {
  setModalInfoLoading(false);
  const title = document.getElementById("modal-title");
  if (title) title.textContent = t("modModal.errorLoadingMod");
  document.getElementById("modal-image-loader")?.style.setProperty("display", "none");
  const downloadButton = document.getElementById("modal-download-btn");
  if (downloadButton) {
    downloadButton.disabled = true;
    downloadButton.onclick = null;
  }
}

function stopModalAudio() {
  document.querySelectorAll("#mod-modal audio").forEach((audio) => {
    audio.pause();
    try {
      audio.currentTime = 0;
    } catch {}
  });
}

function setProfileBackdrop(modal, imageUrl) {
  const layers = modal?.querySelectorAll(".profile-hover-backdrop-layer");
  if (!layers?.length) return;
  modal.classList.add("profile-hover-backdrop-enabled");

  const value = String(imageUrl || "").trim();
  if (!value) {
    delete modal.dataset.profileBackdropModId;
    layers.forEach((layer) => layer.classList.remove("is-visible"));
    return;
  }

  const activeIndex = Number(modal.dataset.profileBackdropLayer || 0);
  const nextIndex = (activeIndex + 1) % layers.length;
  const nextLayer = layers[nextIndex];
  const activeLayer = layers[activeIndex];
  const escaped = value.replace(/[\\"\r\n]/g, (character) => `\\${character}`);
  nextLayer.style.backgroundImage = `url("${escaped}")`;
  nextLayer.classList.add("is-visible");
  activeLayer.classList.remove("is-visible");
  modal.dataset.profileBackdropLayer = String(nextIndex);
}

function getInstallMetadata(data, selectedDownload) {
  const image = data.image || data.images?.find((candidate) => candidate && !candidate.includes("placeholder-mini")) || null;
  const sourceUrl = data.sourceUrl || data.gameBananaUrl || null;
  return {
    kind: data.kind || "mod",
    categoryId: data.categoryId || null,
    toastThumbnail: image,
    downloadIcon: data.source === "backstage" ? data.icon || null : null,
    providerIconUrl: data.source === "backstage" ? data.icon || null : null,
    sourceType: selectedDownload.type,
    fileName: selectedDownload.fileName,
    fileSize: selectedDownload.fileSize,
    source: data.source || "gamebanana",
    image,
    sourceUrl,
    providerSource: data.source || "gamebanana",
    providerId: data.sourceId || String(data.id).replace(/^(?:mod|tool|peo|backstage|gamejolt):/, ""),
    providerBuildId: selectedDownload.providerBuildId || null,
    providerType: data.type || null,
    providerUrl: sourceUrl,
    author: data.author || null,
    engineLocked: Boolean(data.engineLocked),
  };
}

const modModal = {
  requestId: 0,
  activeModId: null,
  profileReturnModId: null,

  async init() {
    try {
      await ensureModal(
        () => this.close(),
        () => this.backToMod(),
      );
    } catch {}
  },
  async open(modId) {
    stopModalAudio();
    const requestId = ++this.requestId;
    this.activeModId = modId;
    this.profileReturnModId = null;
    const providerId = getExternalProviderId(modId);
    const engineId = providerId
      ? null
      : gameBananaApi.getEngineIdForSubmission("mods", modId);
    if (engineId) {
      await engineManagerModal.open(engineId);
      return;
    }
    if (!document.getElementById("mod-modal")) {
      await this.init();
    }
    if (requestId !== this.requestId) return;
    if (!document.getElementById("mod-modal")) return;
    showModal();
    modModalCarousel.stopAutoPlay();
    modModalCarousel.images = [];
    modModalCarousel.currentIndex = 0;
    resetModal();
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = t("modModal.loadingInfo");
    const loaderEl = document.getElementById("modal-image-loader");
    if (loaderEl) loaderEl.style.display = "block";
    let installedCount = 0;
    let hasRenderedProfile = false;
    const showProgress = async (data2) => {
      if (requestId !== this.requestId) return;
      if (!hasRenderedProfile) {
        installedCount = await FS.getInstalledModCount(data2.id);
        await this.populateData(data2, installedCount);
        hasRenderedProfile = true;
        return;
      }
      updateDownloadStatus(data2, installedCount, () =>
        this.installWithDependencies(data2),
      );
    };
    let data;
    try {
      data = await fetchProviderModDetails(modId, showProgress);
    } catch (error) {
      if (requestId !== this.requestId) return;
      console.warn("Could not load provider mod details", error);
      showProviderDetailsError();
      return;
    }
    if (requestId !== this.requestId) return;
    if (!data) {
      setModalInfoLoading(false);
      const errTitle = document.getElementById("modal-title");
      if (errTitle) errTitle.textContent = t("modModal.errorLoadingMod");
      document
        .getElementById("modal-image-loader")
        ?.style.setProperty("display", "none");
      const downloadButton = document.getElementById("modal-download-btn");
      if (downloadButton) {
        downloadButton.disabled = true;
        downloadButton.onclick = null;
      }
      return;
    }
    if (!hasRenderedProfile) {
      installedCount = await FS.getInstalledModCount(data.id);
      await this.populateData(data, installedCount);
    }
    else
      updateDownloadStatus(data, installedCount, () =>
        this.installWithDependencies(data),
      );
  },
  async openSubmission(submission) {
    stopModalAudio();
    const requestId = ++this.requestId;
    this.profileReturnModId = null;
    if (submission.type !== "tool") {
      await this.open(submission.id);
      return;
    }
    if (!document.getElementById("mod-modal")) {
      await this.init();
    }
    if (requestId !== this.requestId) return;
    if (!document.getElementById("mod-modal")) return;
    showModal();
    modModalCarousel.stopAutoPlay();
    modModalCarousel.images = [];
    modModalCarousel.currentIndex = 0;
    resetModal();
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = t("modModal.loadingInfo");
    const loaderEl = document.getElementById("modal-image-loader");
    if (loaderEl) loaderEl.style.display = "block";
    const data = await gameBananaApi.getToolDetails(submission.id, {
      requireDownload: false,
    });
    if (requestId !== this.requestId) return;
    if (!data) {
      setModalInfoLoading(false);
      const errTitle = document.getElementById("modal-title");
      if (errTitle) errTitle.textContent = t("modModal.errorLoadingTool");
      document
        .getElementById("modal-image-loader")
        ?.style.setProperty("display", "none");
      return;
    }
    const installedCount = await FS.getInstalledModCount(data.id);
    await this.populateData(data, installedCount);
  },
  async openAuthor(authorId, source = "gamebanana") {
    stopModalAudio();
    const requestId = ++this.requestId;
    this.profileReturnModId = this.activeModId;
    if (!document.getElementById("mod-modal")) await this.init();
    if (requestId !== this.requestId) return;
    showModal("mod-profile-modal");
    setProfileBackdrop(document.getElementById("mod-profile-modal"), "");
    resetProfileModal();
    document.getElementById("modal-profile-back")?.removeAttribute("hidden");
    let profile;
    let mods;
    let contributionsFailed = false;
    if (source === "backstage") {
      const [profileResult, contributionsResult] = await Promise.allSettled([
        backstageApi.getUserProfile(authorId),
        backstageApi.getUserContributions(authorId),
      ]);
      if (profileResult.status === "rejected") {
        console.warn("Could not load FunkinBackstage user profile", profileResult.reason);
        setModalInfoLoading(false, "profile-info-loader");
        const profileName = document.getElementById("modal-profile-name");
        if (profileName) profileName.textContent = t("modModal.errorLoadingProfile");
        return;
      }
      profile = profileResult.value;
      contributionsFailed = contributionsResult.status === "rejected";
      mods = contributionsFailed ? [] : contributionsResult.value;
    } else {
      [profile, mods] = await Promise.all([
        gameBananaApi.getMemberProfile(authorId),
        gameBananaApi.getMemberMods(authorId),
      ]);
    }
    if (requestId !== this.requestId) return;
    if (!profile) {
      setModalInfoLoading(false, "profile-info-loader");
      const profileName = document.getElementById("modal-profile-name");
      if (profileName)
        profileName.textContent = t("modModal.errorLoadingProfile");
      return;
    }
    const grid = showProfileData(profile, mods, source, contributionsFailed);
    if (grid && mods.length) {
      gridRender.ensureEngineTooltip(grid);
      const cards = mods.map((mod, index) => {
        const card = createCard(mod, index);
        card.querySelector(".mod-author")?.remove();
        return card;
      });
      grid.append(...cards);

      const profileModal = document.getElementById("mod-profile-modal");
      const profileMods = new Map(mods.map((mod) => [String(mod.id), mod]));
      const getCard = (target) =>
        target instanceof Element ? target.closest(".mod-card") : null;
      const showCardBackdrop = (event) => {
        const card = getCard(event.target);
        const mod = card && profileMods.get(card.dataset.modId);
        if (
          !mod ||
          getCard(event.relatedTarget) === card ||
          profileModal.dataset.profileBackdropModId === card.dataset.modId
        )
          return;
        profileModal.dataset.profileBackdropModId = card.dataset.modId;
        if (mod.image) setProfileBackdrop(profileModal, mod.image);
      };
      const clearCardBackdrop = (event) => {
        const card = getCard(event.target);
        const relatedCard = getCard(event.relatedTarget);
        if (card && !relatedCard) setProfileBackdrop(profileModal, "");
      };
      grid.onpointerover = showCardBackdrop;
      grid.onpointerout = clearCardBackdrop;
      grid.onfocusin = showCardBackdrop;
      grid.onfocusout = clearCardBackdrop;
    }
  },
  backToMod() {
    if (!this.profileReturnModId) return this.close();
    this.requestId += 1;
    this.profileReturnModId = null;
    showModal();
  },
  close() {
    this.requestId += 1;
    this.activeModId = null;
    this.profileReturnModId = null;
    modModalCarousel.stopAutoPlay();
    stopModalAudio();
    hideModal();
    hideModal("mod-profile-modal");
  },
  async populateData(data, installedCount) {
    showModData(data, installedCount, () => this.installWithDependencies(data));
    modModalCarousel.setup(data.images);
  },
  async installWithDependencies(data) {
    let selectedDownload = await downloadChoiceModal.choose(
      data.downloadOptions || [],
    );
    if (!selectedDownload) return;
    const linkedModId = getProviderModIdFromUrl(selectedDownload.downloadUrl);
    if (linkedModId) {
      await this.open(linkedModId);
      return;
    }
    const requirements = data.requirements || [];
    const selected = requirements.length
      ? await dependencyReviewModal.review(requirements)
      : [];
    if (selected === null) return;
    for (const dependency of selected) {
      const installed = await FS.isModInstalled(dependency.dependencyId);
      if (installed) continue;
      const installedDependency = await downloadMod.install(
        dependency.dependencyId,
        dependency.title,
        dependency.downloadUrl,
        data.engineId,
        {
          sourceType: dependency.downloadType || dependency.type,
          fileSize: dependency.fileSize,
          toastThumbnail: dependency.thumbnail,
        },
      );
      if (!installedDependency) return;
    }
    const installedMod = await downloadMod.install(
      data.id,
      data.title,
      selectedDownload.downloadUrl,
      data.engineId,
      getInstallMetadata(data, selectedDownload),
    );
    if (!installedMod) return;
    const installedCount = await FS.getInstalledModCount(data.id);
    updateDownloadStatus(data, installedCount, () =>
      this.installWithDependencies(data),
    );
  },
};

export { modModal };
