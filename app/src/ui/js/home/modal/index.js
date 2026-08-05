import { gameBananaApi } from "../../../../backend/providers/gamebanana/gamebanana.provider.js";
import { sidebar } from "../../sidebar.js";
import { FS } from "../../../../backend/services/filesystem.js";
import { modModalCarousel } from "./carousel.js";
import { dependencyReviewModal } from "./dependencyReviewModal.js";
import { downloadChoiceModal } from "./downloadChoiceModal.js";
import { downloadMod } from "./downloadMod.js";
import { t } from "../../i18n/index.js";
import {
  ensureModal,
  hideModal,
  resetModal,
  showModal,
  showModData,
  updateDownloadStatus,
} from "./modalUi.js";

const modModal = {
  async init() {
    try {
      await ensureModal(() => this.close());
    } catch (error) {}
  },
  async open(modId) {
    const engineId = gameBananaApi.getEngineIdForSubmission("mods", modId);
    if (engineId) {
      sidebar.openEngine(engineId);
      return;
    }
    if (!document.getElementById("mod-modal")) {
      await this.init();
    }
    if (!document.getElementById("mod-modal")) return;
    showModal();
    resetModal();
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = t("modModal.loadingInfo");
    const loaderEl = document.getElementById("modal-image-loader");
    if (loaderEl) loaderEl.style.display = "block";
    let isInstalled = false;
    let hasRenderedProfile = false;
    const showProgress = async (data2) => {
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
      onProgress: showProgress,
    });
    if (!data) {
      const errTitle = document.getElementById("modal-title");
      if (errTitle) errTitle.textContent = t("modModal.errorLoadingMod");
      return;
    }
    if (!hasRenderedProfile) await this.populateData(data, isInstalled);
    else
      updateDownloadStatus(data, isInstalled, () =>
        this.installWithDependencies(data),
      );
  },
  async openSubmission(submission) {
    if (submission.type !== "tool") {
      await this.open(submission.id);
      return;
    }
    if (!document.getElementById("mod-modal")) {
      await this.init();
    }
    if (!document.getElementById("mod-modal")) return;
    showModal();
    resetModal();
    const titleEl = document.getElementById("modal-title");
    if (titleEl) titleEl.textContent = t("modModal.loadingInfo");
    const loaderEl = document.getElementById("modal-image-loader");
    if (loaderEl) loaderEl.style.display = "block";
    const data = await gameBananaApi.getToolDetails(submission.id, {
      requireDownload: false,
    });
    if (!data) {
      const errTitle = document.getElementById("modal-title");
      if (errTitle) errTitle.textContent = t("modModal.errorLoadingTool");
      return;
    }
    const isInstalled = await FS.isModInstalled(data.id);
    await this.populateData(data, isInstalled);
  },
  close() {
    modModalCarousel.stopAutoPlay();
    hideModal();
  },
  async populateData(data, isInstalled) {
    showModData(data, isInstalled, () => this.installWithDependencies(data));
    modModalCarousel.setup(data.images);
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
          kind: "dependency",
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
        dependencies: selected.map((dependency) => dependency.dependencyId),
        kind: data.kind || "mod",
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
    await Promise.all(
      selected.map((dependency) =>
        FS.addDependencyConsumer(dependency.dependencyId, data.id),
      ),
    );
  },
};

export { modModal };
