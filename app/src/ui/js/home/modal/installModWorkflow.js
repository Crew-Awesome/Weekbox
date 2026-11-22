import { FS } from "../../../../backend/services/filesystem/index.js";
import { modCatalogService } from "../../../../backend/services/mod-catalog.service.js";
import { dependencyReviewModal } from "./dependencyReviewModal.js";
import { downloadChoiceModal } from "./downloadChoiceModal.js";
import { downloadMod } from "./downloadMod.js";
function getInstallMetadata(data, selectedDownload) {
  const image =
    data.image ||
    data.images?.find(
      (candidate) => candidate && !candidate.includes("placeholder-mini"),
    ) ||
    null;
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
    providerId:
      data.sourceId ||
      String(data.id).replace(/^(?:mod|tool|peo|backstage|gamejolt):/, ""),
    providerBuildId: selectedDownload.providerBuildId || null,
    providerType: data.type || null,
    providerUrl: sourceUrl,
    author: data.author || null,
    engineLocked: Boolean(data.engineLocked),
  };
}

export class ModInstallWorkflow {
  async install(data, { openMod, onInstalled }) {
    let selectedDownload = await downloadChoiceModal.choose(
      data.downloadOptions || [],
    );
    if (!selectedDownload) return;
    const linkedModId = modCatalogService.resolveModIdFromUrl(
      selectedDownload.downloadUrl,
    );
    if (linkedModId) {
      await openMod(linkedModId);
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
    onInstalled(data, installedCount);
  }
}
