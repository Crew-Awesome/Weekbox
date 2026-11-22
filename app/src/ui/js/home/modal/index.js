import { engineManagerModal } from "../../engine-manager/index.js";
import { FS } from "../../../../backend/services/filesystem/index.js";
import { modCatalogService } from "../../../../backend/services/mod-catalog.service.js";
import { modModalCarousel } from "./carousel.js";
import { ModInstallWorkflow } from "./installModWorkflow.js";
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

function showProviderDetailsError() {
  setModalInfoLoading(false);
  const title = document.getElementById("modal-title");
  if (title) title.textContent = t("modModal.errorLoadingMod");
  document
    .getElementById("modal-image-loader")
    ?.style.setProperty("display", "none");
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

const modModal = {
  requestId: 0,
  activeModId: null,
  profileReturnModId: null,
  installWorkflow: new ModInstallWorkflow(),

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
    const isExternalMod = modCatalogService.isExternalModId(modId);
    const engineId = isExternalMod
      ? null
      : modCatalogService.getEngineIdForSubmission("mods", modId);
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
      data = await modCatalogService.getModDetails(modId, showProgress);
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
    } else
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
    const data = await modCatalogService.getToolDetails(submission.id, {
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
        modCatalogService.getAuthorProfile(authorId, source),
        modCatalogService.getAuthorContributions(authorId, source),
      ]);
      if (profileResult.status === "rejected") {
        console.warn(
          "Could not load FunkinBackstage user profile",
          profileResult.reason,
        );
        setModalInfoLoading(false, "profile-info-loader");
        const profileName = document.getElementById("modal-profile-name");
        if (profileName)
          profileName.textContent = t("modModal.errorLoadingProfile");
        return;
      }
      profile = profileResult.value;
      contributionsFailed = contributionsResult.status === "rejected";
      mods = contributionsFailed ? [] : contributionsResult.value;
    } else {
      [profile, mods] = await Promise.all([
        modCatalogService.getAuthorProfile(authorId, source),
        modCatalogService.getAuthorContributions(authorId, source),
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
    return this.installWorkflow.install(data, {
      openMod: (modId) => this.open(modId),
      onInstalled: (mod, installedCount) =>
        updateDownloadStatus(mod, installedCount, () =>
          this.installWithDependencies(mod),
        ),
    });
  },
};

export { modModal };
