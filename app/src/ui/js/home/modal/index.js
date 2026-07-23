import { gameBananaApi } from "../../../../backend/api/gamebanana.js";
import { sidebar } from "../../sidebar.js";
import { modModalCarousel } from "./carousel.js";
import { downloadMod } from "./downloadMod.js";
import { dependencyReviewModal } from "./dependencyReviewModal.js";
import { downloadChoiceModal } from "./downloadChoiceModal.js";
import { FS } from "../../../../utils/filesystem.js";
import {
  ensureModal,
  hideModal,
  resetModal,
  showModal,
  showModData,
  updateDownloadStatus,
} from "./modalUi.js";

export const modModal = {
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
    document.getElementById("modal-title").textContent = "Loading info...";
    document.getElementById("modal-image-loader").style.display = "block";
    let isInstalled = false;
    let hasRenderedProfile = false;
    const showProgress = async (data) => {
      if (!hasRenderedProfile) {
        isInstalled = await FS.isModInstalled(data.id);
        await this.populateData(data, isInstalled);
        hasRenderedProfile = true;
        return;
      }
      updateDownloadStatus(data, isInstalled, () =>
        this.installWithDependencies(data),
      );
    };
    const data = await gameBananaApi.getModDetails(modId, {
      onProgress: showProgress,
    });
    if (!data) {
      document.getElementById("modal-title").textContent = "Error loading mod";
      return;
    }
    if (!hasRenderedProfile) await this.populateData(data, isInstalled);
    else
      updateDownloadStatus(data, isInstalled, () =>
        this.installWithDependencies(data),
      );
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
        toastThumbnail: data.images?.[0],
        sourceType: selectedDownload.type,
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
