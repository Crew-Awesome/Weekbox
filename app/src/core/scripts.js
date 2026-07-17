import { storageBridge } from "./storagePatch.js";
import { router } from "./router.js";
import { registerHomeView } from "../ui/home/index.js";
import { registerEnginesView } from "../ui/engines/index.js";
import { downloadEngine } from "../ui/engines/downloadEngine.js";
import { engineUpdateToast } from "../ui/engines/engineUpdateToast.js";
import { toastDownloadMod } from "../ui/home/modal/toastDownloadMod.js";
import { disableProductionRefreshShortcuts } from "./productionShortcuts.js";
import { FS } from "../utils/filesystem.js";
import { appSettings } from "./settings.js";
import { openLaunchDeepLink, openWeekboxLink } from "./deepLinks.js";
import { errorHandler } from "../ui/errors/errorHandler.js";
import { appUpdater } from "./appUpdater.js";
import { appUpdateModal } from "../ui/updates/appUpdateModal.js";
import { toastSystem } from "../ui/toasts/toastSystem.js";
import { storageRecommendationModal } from "../ui/storageRecommendationModal.js";

function clearTestToasts() {
  document
    .querySelectorAll('[id^="engine-update-toast-"]')
    .forEach((toast) => toast.remove());
  toastDownloadMod.toasts.forEach((toast) => toast.toast.remove());
  toastDownloadMod.toasts.clear();
  document.getElementById("toast-system-container")?.remove();
}

function testToasts() {
  clearTestToasts();

  engineUpdateToast.show("toast-test-progress", "Engine update");
  engineUpdateToast.update("toast-test-progress", {
    progress: 62,
    status: "Downloading update",
  });
  engineUpdateToast.show("toast-test-complete", "Engine update");
  engineUpdateToast.complete("toast-test-complete");
  engineUpdateToast.info(
    "toast-test-info",
    "Engine update",
    "Already up to date",
  );
  engineUpdateToast.offer(
    "toast-test-offer",
    "Engine update",
    "exe.png",
    () => {},
  );
  engineUpdateToast.show("toast-test-error", "Engine update");
  engineUpdateToast.error("toast-test-error");
  engineUpdateToast.missingEngine(
    "toast-test-missing",
    "Test Engine",
    "exe.png",
  );

  const showDownloadToast = (id, name, outcome) => {
    toastDownloadMod.show(id, name);
    toastDownloadMod.update(id, 62, "Downloading...");
    if (outcome === "success") toastDownloadMod.success(id);
    if (outcome === "error") toastDownloadMod.error(id, "Test failure");
    if (outcome === "cancelled") toastDownloadMod.cancelAnim(id);
  };
  showDownloadToast("toast-test-download", "Download in progress");
  showDownloadToast("toast-test-success", "Completed download", "success");
  showDownloadToast("toast-test-error-download", "Failed download", "error");
  showDownloadToast("toast-test-cancelled", "Cancelled download", "cancelled");
}

window.weekboxDebug = {
  clearToasts: clearTestToasts,
  testToasts,
  openLink: openWeekboxLink,
  resetStorageRecommendation() {
    appSettings.set("storageMoveRecommendationDismissed", false);
    location.reload();
  },
};

function installGlobalErrorReporter() {
  if (window.__weekboxErrorReporterInstalled) return;
  window.__weekboxErrorReporterInstalled = true;

  window.addEventListener("error", (event) => {
    const error = event.error || event.message;
    console.error("[WeekBox] Unhandled error", error, {
      filename: event.filename,
      line: event.lineno,
      column: event.colno,
    });
    if (!error) return;
    errorHandler.show({
      error,
      action: "Run WeekBox",
      storagePath: FS.weekboxPath,
    });
  });

  window.addEventListener("unhandledrejection", (event) => {
    console.error("[WeekBox] Unhandled promise rejection", event.reason);
    errorHandler.show({
      error: event.reason,
      action: "Run WeekBox",
      storagePath: FS.weekboxPath,
    });
  });
}

installGlobalErrorReporter();

async function recommendSaferStorageLocation() {
  if (!(await FS.shouldRecommendDefaultStorage())) return;

  const defaultPath = await FS.getDefaultStorageParentPath();
  const choice = await storageRecommendationModal.show({
    currentPath: FS.weekboxPath,
    defaultPath,
  });
  if (choice === "dismiss") {
    appSettings.set("storageMoveRecommendationDismissed", true);
    return;
  }
  if (choice !== "move") return;

  const toastId = "weekbox-storage-recommendation";
  const lock = document.createElement("div");
  lock.id = "storage-move-lock";
  lock.className = "storage-move-lock";
  lock.setAttribute("aria-hidden", "true");
  document.body.appendChild(lock);
  toastSystem.show(toastId, {
    title: "Moving WeekBox files",
    message: "Preparing files…",
    mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
    showPercent: true,
  });
  try {
    await FS.moveStorageTo(
      defaultPath,
      ({ progress, copiedFiles, totalFiles }) => {
        toastSystem.update(toastId, {
          message: `Moving files (${copiedFiles} of ${totalFiles})`,
          progress,
        });
      },
    );
    appSettings.set("storageParentPath", null);
    toastSystem.setState(toastId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: "WeekBox files moved",
      progress: 100,
    });
    setTimeout(() => toastSystem.hide(toastId), 3600);
  } catch (error) {
    toastSystem.setState(toastId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: error.message || "Could not move WeekBox files.",
      progress: 100,
    });
  } finally {
    lock.remove();
  }
}

async function offerNestedStorageRepair() {
  const targetParentPath = await FS.getNestedStorageRepairTarget();
  if (!targetParentPath) return;

  const choice = await Neutralino.os.showMessageBox(
    "Repair WeekBox folder location?",
    `WeekBox found an accidental nested folder:\n${FS.weekboxPath}\n\nIt can safely move the inner files to:\n${FS.basePath}\n\nNo files will be merged because the outer folder contains only this inner WeekBox folder.`,
    "YES_NO",
    "QUESTION",
  );
  if (choice !== "YES") return;

  const toastId = "weekbox-nested-storage-repair";
  toastSystem.show(toastId, {
    title: "Repairing WeekBox folder",
    message: "Preparing files…",
    mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
    showPercent: true,
  });
  try {
    await FS.moveStorageTo(
      targetParentPath,
      ({ progress, copiedFiles, totalFiles }) => {
        toastSystem.update(toastId, {
          message: `Moving files (${copiedFiles} of ${totalFiles})`,
          progress,
        });
      },
    );
    toastSystem.setState(toastId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: "WeekBox folder repaired",
      progress: 100,
    });
    setTimeout(() => toastSystem.hide(toastId), 3600);
  } catch (error) {
    toastSystem.setState(toastId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: error.message || "Could not repair WeekBox files.",
      progress: 100,
    });
  }
}

async function startApp() {
  try {
    Neutralino.init();

    // Aquí implementamos la lógica de leer la configuración para el Blur
    const setWindowFocus = (isFocused) => {
      if (isFocused) {
        document.body.classList.remove("window-unfocused");
      } else if (appSettings.get("blurOutOfFocus")) {
        document.body.classList.add("window-unfocused");
      }
    };

    Neutralino.events.on("windowBlur", () => setWindowFocus(false));
    Neutralino.events.on("windowFocus", () => setWindowFocus(true));

    disableProductionRefreshShortcuts();
    Neutralino.events.on("windowClose", async () => {
      await downloadEngine.cleanupAll();
      await Neutralino.app.exit();
    });
    await storageBridge.init();
    const defaultStoragePath = await FS.getDefaultStorageParentPath();
    const defaultDataPath = `${defaultStoragePath}/WeekBox/data`;
    await appSettings.init(await appSettings.resolveDataPath(defaultDataPath));
    await FS.init();
    await appSettings.setDataPath(FS.dataPath);
    registerHomeView();
    registerEnginesView();
    await router.init();
    await offerNestedStorageRepair();
    await openLaunchDeepLink();
    await recommendSaferStorageLocation();
    if (appSettings.get("checkAppUpdatesOnStartup")) {
      appUpdater
        .check()
        .then((update) => {
          if (update.status !== "available") return;
          try {
            sessionStorage.setItem(
              "weekbox_available_app_update",
              JSON.stringify(update),
            );
          } catch {}
          document.dispatchEvent(
            new CustomEvent("app-update-available", { detail: update }),
          );
          appUpdateModal.show(update);
        })
        .catch(() => {});
    }
    console.log("WeekBox: modules loaded.");
  } catch (error) {
    console.error("Startup error:", error);
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.innerHTML = `<div style="padding: 24px; color: #ff4a4a;"><h2>Load error</h2><p>${error.message}</p></div>`;
    }
  }
}
startApp();
