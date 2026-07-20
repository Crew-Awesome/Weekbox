import { storageBridge } from "./storagePatch.js";
import { router } from "./router.js";
import { homeView, registerHomeView } from "../ui/home/index.js";
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
import { startupLoader } from "./startupLoader.js";
import { networkStatus } from "./networkStatus.js";
import { modManagerModal } from "../ui/mod-manager/index.js";

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
    startupLoader.setPhase("Starting native services", 8);
    Neutralino.init();
    networkStatus.init();
    // Updater relaunches originate from a background helper process. Bring
    // the new WeekBox window to the foreground as soon as native APIs are up.
    await Neutralino.window.focus().catch(() => {});

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
    // Some Windows focus changes (notably after handing work to the updater)
    // do not emit Neutralino's native focus event. The browser events keep the
    // visual focus state from getting stuck in its blurred appearance.
    window.addEventListener("focus", () => setWindowFocus(true));
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) setWindowFocus(true);
    });

    disableProductionRefreshShortcuts();
    Neutralino.events.on("windowClose", async () => {
      await downloadEngine.cleanupAll();
      await Neutralino.app.exit();
    });
    startupLoader.setPhase("Restoring preferences", 20);
    await storageBridge.init();
    const defaultStoragePath = await FS.getDefaultStorageParentPath();
    const defaultDataPath = `${defaultStoragePath}/WeekBox/data`;
    await appSettings.init(await appSettings.resolveDataPath(defaultDataPath));
    startupLoader.setPhase("Preparing your library", 42);
    await FS.init({ deferMaintenance: true });
    await appSettings.setDataPath(FS.dataPath);
    startupLoader.setPhase("Loading interface", 64);
    registerHomeView();
    registerEnginesView();
    await router.init();
    startupLoader.setPhase("Preparing Mod Manager", 70);
    const modManagerReady = modManagerModal.preload();
    startupLoader.setPhase("Loading Home content", 72);
    const maintenance = FS.startBackgroundMaintenance({
      onProgress: (message, progress) =>
        startupLoader.setPhase(message, progress),
    });
    await Promise.all([homeView.ready, modManagerReady]);
    startupLoader.setPhase("Finishing library setup", 89);
    await maintenance;
    await startupLoader.complete();

    await offerNestedStorageRepair();
    await openLaunchDeepLink();
    await recommendSaferStorageLocation();
    if (networkStatus.online && appSettings.get("checkAppUpdatesOnStartup")) {
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
    startupLoader.fail("Could not start WeekBox");
    console.error("Startup error:", error);
    try {
      errorHandler.show({
        error,
        action: "Start WeekBox",
        storagePath: FS.weekboxPath,
      });
    } catch (reportingError) {
      console.error("Could not show startup error report:", reportingError);
    }
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.replaceChildren();
      const errorView = document.createElement("div");
      errorView.style.cssText = "padding: 24px; color: #ff4a4a;";
      const heading = document.createElement("h2");
      heading.textContent = "Load error";
      const message = document.createElement("p");
      message.textContent =
        error instanceof Error
          ? error.message
          : "See the technical details in the error report.";
      errorView.append(heading, message);
      mainContent.appendChild(errorView);
    }
  }
}
startApp();
