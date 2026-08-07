import { appSettings } from "./settings.service.js";
import { networkStatus } from "./network-status.service.js";
import { startupLoader } from "./startup-loader.service.js";
import { storageBridge } from "./storage-patch.util.js";
import { syncWindowsProtocolRegistration } from "./windows-protocol.util.js";
import { disableProductionRefreshShortcuts } from "./production-shortcuts.util.js";
import { router } from "../routing/router.service.js";
import { openLaunchDeepLink } from "../routing/deep-links.service.js";
import { appUpdater } from "../updates/app-updater.service.js";

import { homeView, registerHomeView } from "../../../ui/js/home/index.js";
import { registerEnginesView } from "../../../ui/js/engines/index.js";
import { registerNewsView } from "../../../ui/js/news.js";
import { downloadEngine } from "../../../ui/js/engines/downloadEngine.js";
import { downloadMod } from "../../../ui/js/home/modal/downloadMod.js";
import { engineUpdateService } from "../../../ui/js/engines/engineUpdateService.js";
import { FS } from "../../services/filesystem.js";
import { errorHandler } from "../../../ui/js/errors/errorHandler.js";
import { appUpdateModal } from "../../../ui/js/updates/appUpdateModal.js";
import { toastSystem } from "../../../ui/js/toasts/toastSystem.js";
import { storageRecommendationModal } from "../../../ui/js/storageRecommendationModal.js";
import { modManagerModal } from "../../../ui/js/mod-manager/index.js";
import { firstRunStorageModal } from "../../../ui/js/firstRunStorageModal.js";
import { firstRunLanguageModal } from "../../../ui/js/firstRunLanguageModal.js";
import { i18n, t } from "../../../ui/js/i18n/index.js";
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

async function completeFirstRunStorageSetup(defaultStoragePath, hadSettings) {
  if (appSettings.get("firstRunStorageSetupComplete")) return;
  if (hadSettings) {
    appSettings.set("firstRunStorageSetupComplete", true);
    return;
  }
  const choice = await firstRunStorageModal.show(defaultStoragePath);
  let completed = choice === "default";
  if (choice === "new" || choice === "existing") {
    const selectedPath = await Neutralino.os.showFolderDialog(
      choice === "existing"
        ? t("storage.chooseExistingFolder")
        : t("storage.chooseContainingFolder"),
      { defaultPath: FS.basePath },
    );
    if (selectedPath) {
      const existing = await FS.findExistingStorage(selectedPath);
      if (choice === "existing") {
        if (existing) {
          await FS.useExistingStorage(existing.basePath);
          completed = true;
        } else
          await Neutralino.os.showMessageBox(
            t("storage.libraryNotFoundTitle"),
            t("storage.libraryNotFoundMessage"),
            "OK",
            "WARNING",
          );
      } else if (!existing) {
        await FS.moveStorageTo(selectedPath);
        completed = true;
      }
    }
  }
  if (completed) appSettings.set("firstRunStorageSetupComplete", true);
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
    title: t("storage.movingWeekBoxFiles"),
    message: t("storage.preparingFiles"),
    mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
    showPercent: true,
  });
  try {
    await FS.moveStorageTo(
      defaultPath,
      ({ progress, copiedFiles, totalFiles }) => {
        toastSystem.update(toastId, {
          message: t("storage.movingFilesProgress", {
            copied: copiedFiles,
            total: totalFiles,
          }),
          progress,
        });
      },
    );
    appSettings.set("storageParentPath", null);
    toastSystem.setState(toastId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: t("storage.filesMoved"),
      progress: 100,
    });
    setTimeout(() => toastSystem.hide(toastId), 3600);
  } catch (error) {
    toastSystem.setState(toastId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: error.message || t("storage.moveFailedMessage"),
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
    t("storage.repairFolderTitle"),
    t("storage.repairFolderMessage", {
      weekboxPath: FS.weekboxPath,
      basePath: FS.basePath,
    }),
    "YES_NO",
    "QUESTION",
  );
  if (choice !== "YES") return;
  const toastId = "weekbox-nested-storage-repair";
  toastSystem.show(toastId, {
    title: t("storage.repairingFolder"),
    message: t("storage.preparingFiles"),
    mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
    showPercent: true,
  });
  try {
    await FS.moveStorageTo(
      targetParentPath,
      ({ progress, copiedFiles, totalFiles }) => {
        toastSystem.update(toastId, {
          message: t("storage.movingFilesProgress", {
            copied: copiedFiles,
            total: totalFiles,
          }),
          progress,
        });
      },
    );
    toastSystem.setState(toastId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: t("storage.folderRepaired"),
      progress: 100,
    });
    setTimeout(() => toastSystem.hide(toastId), 3600);
  } catch (error) {
    toastSystem.setState(toastId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
    });
    toastSystem.update(toastId, {
      message: error.message || t("storage.repairFailed"),
      progress: 100,
    });
  }
}

async function handleStartupAppUpdate() {
  if (!networkStatus.online) {
    return false;
  }
  let update;
  let timeoutHandle;
  try {
    update = await Promise.race([
      appUpdater.check(),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error("Update check timeout")),
          3500,
        );
      }),
    ]);
  } catch (error) {
    console.warn("Could not check for a WeekBox update during startup", error);
    return false;
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
  if (update?.status !== "available") return false;
  try {
    sessionStorage.setItem(
      "weekbox_available_app_update",
      JSON.stringify(update),
    );
  } catch {}
  document.dispatchEvent(
    new CustomEvent("app-update-available", { detail: update }),
  );
  return await appUpdateModal.show(update);
}

function patchNeutralinoMessageBox() {
  if (typeof Neutralino === "undefined" || !Neutralino.os?.showMessageBox) return;
  if (Neutralino.os._origShowMessageBox) return;
  Neutralino.os._origShowMessageBox = Neutralino.os.showMessageBox;
  Neutralino.os.showMessageBox = async function (
    title,
    content,
    choice = "OK",
    icon = "INFO",
  ) {
    let normalizedChoice = String(choice || "OK").toUpperCase().trim();
    let normalizedIcon = String(icon || "INFO").toUpperCase().trim();

    const choiceMap = {
      ACEPTAR: "OK",
      OK: "OK",
      SI: "YES_NO",
      SÍ: "YES_NO",
      YES: "YES_NO",
      CANCELAR: "OK_CANCEL",
      CANCEL: "OK_CANCEL",
      ERROR: "OK",
      INFO: "OK",
      WARNING: "OK",
      WARN: "OK",
      QUESTION: "YES_NO",
    };

    if (choiceMap[normalizedChoice]) {
      if (
        ["ERROR", "INFO", "WARNING", "WARN", "QUESTION"].includes(
          normalizedChoice,
        )
      ) {
        normalizedIcon =
          normalizedChoice === "WARN" ? "WARNING" : normalizedChoice;
      }
      normalizedChoice = choiceMap[normalizedChoice];
    }

    const validChoices = new Set([
      "OK",
      "OK_CANCEL",
      "YES_NO",
      "YES_NO_CANCEL",
      "RETRY_CANCEL",
      "ABORT_RETRY_IGNORE",
    ]);
    if (!validChoices.has(normalizedChoice)) {
      normalizedChoice = "OK";
    }

    const validIcons = new Set([
      "INFO",
      "WARN",
      "WARNING",
      "ERROR",
      "QUESTION",
    ]);
    if (!validIcons.has(normalizedIcon)) {
      normalizedIcon = "INFO";
    }

    try {
      return await Neutralino.os._origShowMessageBox.call(
        Neutralino.os,
        String(title ?? ""),
        String(content ?? ""),
        normalizedChoice,
        normalizedIcon,
      );
    } catch (err) {
      console.warn("Neutralino.os.showMessageBox fallback to alert/confirm:", err);
      if (typeof window !== "undefined") {
        if (
          normalizedChoice === "YES_NO" ||
          normalizedChoice === "OK_CANCEL"
        ) {
          const res = window.confirm(
            `${title ? title + "\n\n" : ""}${content}`,
          );
          return res
            ? normalizedChoice === "YES_NO"
              ? "YES"
              : "OK"
            : normalizedChoice === "YES_NO"
              ? "NO"
              : "CANCEL";
        } else {
          window.alert(`${title ? title + "\n\n" : ""}${content}`);
          return "OK";
        }
      }
      return "OK";
    }
  };
}

async function startApp() {
  let startupStep = "starting native services";
  try {
    startupLoader.setPhase(t("startup.startingServices"), 8);
    Neutralino.init();
    patchNeutralinoMessageBox();
    void startupLoader.initVersion();
    networkStatus.init();
    await Neutralino.window.focus().catch(() => {});
    const setWindowFocus = (isFocused) => {
      if (isFocused) {
        document.body.classList.remove("window-unfocused");
      } else if (appSettings.get("blurOutOfFocus")) {
        document.body.classList.add("window-unfocused");
      }
    };
    Neutralino.events.on("windowBlur", () => setWindowFocus(false));
    Neutralino.events.on("windowFocus", () => setWindowFocus(true));
    window.addEventListener("focus", () => setWindowFocus(true));
    window.addEventListener("focusin", () => setWindowFocus(true), {
      passive: true,
    });
    window.addEventListener("pointerdown", () => setWindowFocus(true), {
      capture: true,
      passive: true,
    });
    window.addEventListener("keydown", () => setWindowFocus(true), {
      capture: true,
      passive: true,
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) setWindowFocus(true);
    });
    disableProductionRefreshShortcuts();

    const handleAppExit = async () => {
      engineUpdateService.stopScheduledChecks();
      let timeoutHandle;
      try {
        await Promise.race([
          Promise.allSettled([
            downloadEngine.cleanupAll?.(),
            downloadMod.cleanupAll?.(),
          ]),
          new Promise((resolve) => {
            timeoutHandle = setTimeout(resolve, 1500);
          }),
        ]);
      } catch {} finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      try {
        await Neutralino.app.exit();
      } catch {}
    };

    window.addEventListener("beforeunload", () => {
      engineUpdateService.stopScheduledChecks();
      downloadEngine.cleanupAll?.().catch(() => {});
      downloadMod.cleanupAll?.().catch(() => {});
    });

    Neutralino.events.on("windowClose", async () => {
      if (document.getElementById("app-update-modal")?.hidden === false) return;
      await handleAppExit();
    });
    startupLoader.setPhase(t("startup.loadingPreferences"), 20);
    startupStep = "restoring preferences";
    {
      let timeoutHandle;
      await Promise.race([
        storageBridge.init(),
        new Promise((resolve) => {
          timeoutHandle = setTimeout(resolve, 2000);
        }),
      ]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });
    }
    startupStep = "finding the default storage location";
    const defaultStoragePath = await FS.getDefaultStorageParentPath();
    const defaultDataPath = `${defaultStoragePath}/WeekBox/data`;
    startupStep = "reading saved settings";
    const settingsDataPath = await appSettings.resolveDataPath(defaultDataPath);
    const hadSettings = await FS.api.exists(
      `${settingsDataPath}/settings.json`,
    );
    await appSettings.init(settingsDataPath);
    i18n.init();
    if (!appSettings.get("firstRunLanguageSetupComplete")) {
      await firstRunLanguageModal.show();
    }
    syncWindowsProtocolRegistration(
      appSettings.get("registerProtocolLinks"),
    ).catch(() => {});
    if (appSettings.get("checkAppUpdatesOnStartup")) {
      startupLoader.setPhase(t("startup.checkingAppUpdates"), 36);
      if (await handleStartupAppUpdate()) return;
    }
    startupLoader.setPhase(t("startup.openingLibrary"), 42);
    startupStep = "preparing the WeekBox library";
    await FS.init({ deferMaintenance: true });
    await appSettings.setDataPath(FS.dataPath);
    try {
      await completeFirstRunStorageSetup(defaultStoragePath, hadSettings);
    } catch (error) {
      console.warn("Could not finish first-run storage setup", error);
    }
    startupStep = "loading the WeekBox interface";
    startupLoader.setPhase(t("startup.loadingNavigation"), 64);
    registerHomeView();
    registerEnginesView();
    registerNewsView();
    await Promise.race([
      router.init(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Loading navigation interface timed out")), 8000),
      ),
    ]);
    startupLoader.setPhase(t("startup.preparingModManager"), 70);
    const modManagerReady = modManagerModal.preload();
    startupLoader.setPhase(t("startup.loadingHome"), 72);
    const maintenance = FS.runStartupMaintenance({
      onProgress: (message, progress) =>
        startupLoader.setPhase(message, progress),
    });
    {
      let timeoutHandle;
      await Promise.race([
        Promise.all([homeView.ready, modManagerReady]),
        new Promise((resolve) => {
          timeoutHandle = setTimeout(resolve, 8000);
        }),
      ]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });
    }
    startupLoader.setPhase(t("startup.checkingLibrary"), 89);
    {
      let timeoutHandle;
      await Promise.race([
        maintenance,
        new Promise((resolve) => {
          timeoutHandle = setTimeout(resolve, 5000);
        }),
      ]).finally(() => {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      });
    }
    await startupLoader.complete();
    await offerNestedStorageRepair();
    await openLaunchDeepLink();
    await recommendSaferStorageLocation();
  } catch (error) {
    const message = error?.message || String(error);
    const startupError = new Error(
      `WeekBox could not finish ${startupStep}: ${message}`,
    );
    startupLoader.fail(t("startup.couldNotStart"));
    console.error("Startup error:", error);
    try {
      errorHandler.show({
        error: startupError,
        action: t("startup.startWeekBoxAction"),
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
      heading.textContent = t("startup.loadError");
      const message2 = document.createElement("p");
      message2.textContent =
        error instanceof Error ? error.message : t("startup.seeErrorReport");
      errorView.append(heading, message2);
      mainContent.appendChild(errorView);
    }
  }
}

export {
  startApp,
  installGlobalErrorReporter,
  completeFirstRunStorageSetup,
  recommendSaferStorageLocation,
  offerNestedStorageRepair,
};
