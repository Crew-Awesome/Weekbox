import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
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

  async init() {
    try {
      await ensureModal(
        () => this.close(),
        () => this.backToMod(),
      );
    } catch (error) {}
  },
  async open(modId) {
    const requestId = ++this.requestId;
    this.activeModId = modId;
    this.profileReturnModId = null;
    const engineId = gameBananaApi.getEngineIdForSubmission("mods", modId);
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
    modModalCarousel.backdropImage = null;
    modModalCarousel.currentIndex = 0;
    resetModal();
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = t("modModal.loadingInfo");
    const loaderEl = document.getElementById("modal-image-loader");
    if (loaderEl) loaderEl.style.display = "block";
    let isInstalled = false;
    let hasRenderedProfile = false;
    const showProgress = async (data2) => {
      if (requestId !== this.requestId) return;
      if (!hasRenderedProfile) {
        isInstalled = await FS.isModInstalled(data2.id);
        await this.populateData(data2, isInstalled);
        hasRenderedProfile = true;
        return;
      }
      updateDownloadStatus(data2, isInstalled, () =>
        this.installWithDependencies(data2),
      );
    };
    const data = await gameBananaApi.getModDetails(modId, {
      includeUberstyle: true,
      onProgress: showProgress,
    });
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
    if (!hasRenderedProfile) await this.populateData(data, isInstalled);
    else
      updateDownloadStatus(data, isInstalled, () =>
        this.installWithDependencies(data),
      );
  },
  async openSubmission(submission) {
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
    modModalCarousel.backdropImage = null;
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
    const isInstalled = await FS.isModInstalled(data.id);
    await this.populateData(data, isInstalled);
  },
  async openAuthor(authorId) {
    const requestId = ++this.requestId;
    this.profileReturnModId = this.activeModId;
    if (!document.getElementById("mod-modal")) await this.init();
    if (requestId !== this.requestId) return;
    showModal("mod-profile-modal");
    setProfileBackdrop(document.getElementById("mod-profile-modal"), "");
    resetProfileModal();
    document.getElementById("modal-profile-back")?.removeAttribute("hidden");
    const [profile, mods] = await Promise.all([
      gameBananaApi.getMemberProfile(authorId),
      gameBananaApi.getMemberMods(authorId),
    ]);
    if (requestId !== this.requestId) return;
    if (!profile) {
      setModalInfoLoading(false, "profile-info-loader");
      const profileName = document.getElementById("modal-profile-name");
      if (profileName)
        profileName.textContent = t("modModal.errorLoadingProfile");
      return;
    }
    const grid = showProfileData(profile, mods);
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
    hideModal();
    hideModal("mod-profile-modal");
  },
  async populateData(data, isInstalled) {
    showModData(data, isInstalled, () => this.installWithDependencies(data));
    modModalCarousel.setup(data.images, data.backgroundImage);
  },
  async installWithDependencies(data) {
    const selectedDownload = await downloadChoiceModal.choose(
      data.downloadOptions || [],
    );
    if (!selectedDownload) return;
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
      {
        kind: data.kind || "mod",
        categoryId: data.categoryId || null,
        toastThumbnail: data.images?.[0],
        sourceType: selectedDownload.type,
        fileSize: selectedDownload.fileSize,
        source: data.source || "gamebanana",
        image: data.images?.[0] || null,
        sourceUrl: data.sourceUrl || data.gameBananaUrl || null,
        engineLocked: Boolean(data.engineLocked),
      },
    );
    if (!installedMod) return;
  },
};

export { modModal };
