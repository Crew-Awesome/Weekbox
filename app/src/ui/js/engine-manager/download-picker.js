import { FS } from "../../../backend/services/filesystem/index.js";
import { ENGINE_DETAILS } from "../../../backend/config/engines.config.js";
import { getEngineLabel, t } from "../i18n/index.js";
import {
  getTargetItchPlatform,
  getTargetLink,
  getTargetSize,
} from "../engines/utils.js";
import { engineReleaseService } from "../../../backend/services/engine-release.service.js";
import { downloadEngine } from "../engines/downloadEngine.js";
import { engineInstallToast } from "../engines/engineInstallToast.js";
import { rememberInstalledEngineBuild } from "../engines/engineUpdateService.js";
import { fetchAndRenderReleaseNotes } from "../engines/releaseNotes.js";

function getEngineDetails(engineId) {
  return (
    FS.getEngineDetails(engineId) ||
    ENGINE_DETAILS[engineId] || {
      name: engineId,
      icon: "exe.png",
    }
  );
}
export function renderDownloadPicker(
  manager,
  engineId,
  versions,
  returnTo = "chooser",
) {
  const container = document.getElementById("engine-manager-modal-body");
  if (!container) return null;
  const details = getEngineDetails(engineId);
  const panel = document.createElement("section");
  panel.className = "engine-download-picker";
  const header = document.createElement("header");
  header.className = "engine-download-picker__header";
  const back = document.createElement("button");
  back.type = "button";
  back.className = "engine-download-picker__back";
  back.title = t("common.back");
  back.setAttribute("aria-label", t("common.back"));
  back.innerHTML = '<i class="fa-solid fa-arrow-left" aria-hidden="true"></i>';
  back.addEventListener(
    "click",
    () =>
      void (returnTo === "installed"
        ? manager.returnToInstalledEngines()
        : manager.showDownloadPicker()),
  );
  const heading = document.createElement("div");
  heading.className = "engine-download-picker__identity";
  const icon = document.createElement("img");
  icon.src = FS.getEngineIconSource(engineId);
  icon.alt = "";
  const title = document.createElement("h3");
  title.textContent = getEngineLabel(engineId, details.name);
  heading.append(icon, title);
  header.append(back, heading);

  const main = document.createElement("div");
  main.className = "engine-download-picker__main";
  const versionsList = document.createElement("div");
  versionsList.className = "engine-download-picker__versions";
  versionsList.setAttribute("role", "listbox");
  const notes = document.createElement("div");
  notes.className = "engine-download-picker__notes markdown-body";
  const footer = document.createElement("footer");
  footer.className = "engine-download-picker__footer";
  const download = document.createElement("button");
  download.type = "button";
  download.className = "engine-download-picker__download";
  download.textContent = t("common.download");
  footer.append(download);
  main.append(versionsList, notes);
  panel.append(header, main, footer);
  container.replaceChildren(panel);

  let selected = null;
  versions.forEach((versionData, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "engine-download-picker__version";
    button.setAttribute("role", "option");
    button.setAttribute("aria-selected", String(index === 0));
    button.textContent = versionData.label || versionData.version;
    button.addEventListener("click", () => {
      selected = versionData;
      if (activeInstall?.version !== selected.version) {
        activeInstall = null;
        download.classList.remove("is-cancel");
        download.textContent = t("common.download");
        download.disabled = false;
      }
      versionsList
        .querySelectorAll(".engine-download-picker__version")
        .forEach((option) =>
          option.setAttribute("aria-selected", String(option === button)),
        );
      void fetchAndRenderReleaseNotes(
        versionData,
        getTargetLink(versionData),
        notes,
      );
      const task = downloadEngine.getActiveTask(engineId, selected.version);
      if (task) {
        activeInstall = {
          engineId,
          version: selected.version,
          name: getEngineLabel(engineId, details.name),
        };
        download.disabled = true;
        download.classList.add("is-cancel");
        download.textContent = t("common.cancel");
        engineInstallToast.show(activeInstall, cancelInstall);
        updateInstallProgress(task.progressInfo);
      }
    });
    versionsList.appendChild(button);
  });
  selected = versions[0] || null;
  if (selected)
    void fetchAndRenderReleaseNotes(selected, getTargetLink(selected), notes);
  download.disabled = !selected;
  let activeInstall = null;
  let cancelRequested = false;
  const updateInstallProgress = (progressInfo) => {
    if (activeInstall) engineInstallToast.update(activeInstall, progressInfo);
  };
  const cancelInstall = async () => {
    if (!activeInstall) return;
    cancelRequested = true;
    download.disabled = true;
    download.textContent = t("downloads.cancelling");
    engineInstallToast.cancel(activeInstall);
    await downloadEngine.cancel(activeInstall.engineId, activeInstall.version);
    engineInstallToast.hide(activeInstall);
  };
  const existingTask = selected
    ? downloadEngine.getActiveTask(engineId, selected.version)
    : null;
  if (existingTask && selected) {
    activeInstall = {
      engineId,
      version: selected.version,
      name: getEngineLabel(engineId, details.name),
    };
    download.disabled = true;
    download.classList.add("is-cancel");
    download.textContent = t("common.cancel");
    engineInstallToast.show(activeInstall, cancelInstall);
    updateInstallProgress(existingTask.progressInfo);
  }
  download.addEventListener("click", async () => {
    if (activeInstall) {
      void cancelInstall();
      return;
    }
    if (!selected || download.disabled) return;
    download.disabled = true;
    download.classList.add("is-cancel");
    download.textContent = t("common.cancel");
    cancelRequested = false;
    activeInstall = {
      engineId,
      version: selected.version,
      name: getEngineLabel(engineId, details.name),
    };
    engineInstallToast.show(activeInstall, cancelInstall);
    try {
      let downloadUrl = getTargetLink(selected);
      const targetPlatform = getTargetItchPlatform(selected);
      if (!downloadUrl && targetPlatform) {
        downloadUrl = await engineReleaseService.resolveItchDownloadUrl(
          selected.itch,
          targetPlatform,
        );
      }
      if (!downloadUrl) throw new Error(t("engines.unsupportedOs"));
      const success = await downloadEngine.install(
        engineId,
        selected.version,
        downloadUrl,
        updateInstallProgress,
        undefined,
        {
          expectedSize: getTargetSize(selected),
          refreshUrl: targetPlatform
            ? () =>
                engineReleaseService.resolveItchDownloadUrl(
                  selected.itch,
                  targetPlatform,
                )
            : undefined,
        },
      );
      if (!success) {
        if (cancelRequested) return;
        throw new Error(t("engines.installationFailed"));
      }
      await rememberInstalledEngineBuild(engineId, selected);
      engineInstallToast.complete(activeInstall);
      document.dispatchEvent(new CustomEvent("mods-updated"));
    } catch (error) {
      if (cancelRequested) return;
      console.error("Could not download engine version", error);
      engineInstallToast.error(activeInstall, t("engines.installationFailed"));
    } finally {
      if (cancelRequested) engineInstallToast.hide(activeInstall);
      activeInstall = null;
      download.classList.remove("is-cancel");
      download.textContent = t("common.download");
      download.disabled = !selected;
    }
  });
  return panel;
}
