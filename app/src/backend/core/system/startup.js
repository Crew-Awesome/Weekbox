import { appSettings } from "./settings.service.js";
import { networkStatus } from "./network-status.service.js";
import { startupLoader } from "./startup-loader.service.js";
import {
  syncWindowsProtocolRegistration,
  syncWindowsStartupRegistration,
} from "./windows-protocol.util.js";
import {
  disableProductionRefreshShortcuts,
  isDevelopmentRun,
} from "./production-shortcuts.util.js";
import { router } from "../routing/router.service.js";
import {
  getWeekboxLinkFromArgs,
  openLaunchDeepLink,
  openWeekboxLink,
  parseWeekboxLink,
} from "../routing/deep-links.service.js";
import { appUpdater } from "../updates/app-updater.service.js";

import { homeView, registerHomeView } from "../../../ui/js/home/index.js";
import { registerEnginesView } from "../../../ui/js/engines/index.js";
import { registerNewsView } from "../../../ui/js/news.js";
import { downloadEngine } from "../../../ui/js/engines/downloadEngine.js";
import { downloadMod } from "../../../ui/js/home/modal/downloadMod.js";
import { engineUpdateService } from "../../../ui/js/engines/engineUpdateService.js";
import { FS } from "../../services/filesystem.js";
import { errorHandler } from "../../../ui/js/errors/errorHandler.js";
import { storageRecommendationModal } from "../../../ui/js/storageRecommendationModal.js";
import { storageMoveFeedback } from "../../../ui/js/config/storageMoveFeedback.js";
import { existingStorageModal } from "../../../ui/js/existingStorageModal.js";
import { modManagerModal } from "../../../ui/js/mod-manager/index.js";
import { firstRunStorageModal } from "../../../ui/js/firstRunStorageModal.js";
import { firstRunLanguageModal } from "../../../ui/js/firstRunLanguageModal.js";
import {
  getCachedHue,
  getCachedTheme,
  setTheme,
} from "../../../ui/js/theme.js";
import { i18n, localizeProgressStatus, t } from "../../../ui/js/i18n/index.js";

const SINGLE_INSTANCE_MUTEX = "Global\\WeekBox-com.weekbox.app";
const PENDING_HANDOFF_FILE = "weekbox-deeplink.json";

function encodePowerShellCommand(script) {
  const bytes = new Uint8Array(script.length * 2);
  for (let index = 0; index < script.length; index += 1) {
    const code = script.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  return btoa(String.fromCharCode(...bytes));
}

async function focusWeekBoxWindow({ center = false } = {}) {
  try {
    if (typeof Neutralino.window.unminimize === "function") {
      await Neutralino.window.unminimize();
    }
    if (
      center &&
      // thank u juniperwuniper123 for the diagnostic!!!
      window.NL_OS !== "Darwin" &&
      typeof Neutralino.window.center === "function"
    ) {
      await Neutralino.window.center();
    }
    if (typeof Neutralino.window.show === "function") {
      await Neutralino.window.show();
    }
    await Neutralino.window.focus();
  } catch {}
}

function supportsSystemTray() {
  return window.NL_OS === "Windows" || window.NL_OS === "Linux";
}

async function applySystemTray() {
  if (!supportsSystemTray() || typeof Neutralino.os?.setTray !== "function") {
    return;
  }
  try {
    await Neutralino.os.setTray({
      icon: "/app/assets/icons/launcher-icon.png",
      menuItems: [
        { id: "weekbox-show", text: t("tray.showWeekBox") },
        { id: "weekbox-quit", text: t("tray.quitWeekBox") },
      ],
    });
  } catch (error) {
    console.warn("Could not set WeekBox tray icon", error);
  }
}

async function ensureSingleInstance() {
  if (isDevelopmentRun() || window.NL_OS !== "Windows") return true;
  const parentPid = Number(window.NL_PID);
  if (!Number.isInteger(parentPid) || parentPid <= 0) return true;

  const script = `$created = $false\n$mutex = [System.Threading.Mutex]::new($false, '${SINGLE_INSTANCE_MUTEX}', [ref]$created)\n$owned = $false\ntry { $owned = $mutex.WaitOne(0) } catch [System.Threading.AbandonedMutexException] { $owned = $true }\nif (-not $owned) { [Console]::Out.WriteLine('duplicate'); exit 2 }\n[Console]::Out.WriteLine('acquired')\ntry { while (Get-Process -Id ${parentPid} -ErrorAction SilentlyContinue) { Start-Sleep -Milliseconds 500 } } finally { $mutex.ReleaseMutex(); $mutex.Dispose() }`;
  let resolveGuard;
  const guardResult = new Promise((resolve) => {
    resolveGuard = resolve;
  });
  let processId = null;
  let timeoutHandle;
  let settled = false;
  let outputBuffer = "";
  const pendingEvents = [];
  const finish = (isPrimary) => {
    if (settled) return;
    settled = true;
    clearTimeout(timeoutHandle);
    Neutralino.events.off("spawnedProcess", handler);
    resolveGuard(isPrimary);
  };
  const handleEvent = (event) => {
    if (processId === null) {
      pendingEvents.push(event);
      return;
    }
    if (event.detail.id !== processId) return;
    if (event.detail.action === "stdOut") {
      outputBuffer += String(event.detail.data || "").toLowerCase();
    }
    if (event.detail.action === "stdOut" && outputBuffer.includes("acquired")) {
      finish(true);
    } else if (
      event.detail.action === "stdOut" &&
      outputBuffer.includes("duplicate")
    ) {
      finish(false);
    } else if (event.detail.action === "exit") {
      finish(Number(event.detail.data) === 2 ? false : true);
    }
  };
  const handler = (event) => handleEvent(event);

  try {
    await Neutralino.events.on("spawnedProcess", handler);
    const process = await Neutralino.os.spawnProcess(
      `powershell.exe -NoLogo -NoProfile -NonInteractive -ExecutionPolicy Bypass -EncodedCommand ${encodePowerShellCommand(script)}`,
    );
    processId = process.id;
    timeoutHandle = setTimeout(() => {
      console.warn("The WeekBox single-instance guard did not respond in time");
      finish(true);
    }, 5000);
    pendingEvents.splice(0).forEach(handleEvent);
  } catch (error) {
    console.warn("Could not start the WeekBox single-instance guard", error);
    finish(true);
  }
  return guardResult;
}

async function handoffToPrimaryInstance() {
  const link = getWeekboxLinkFromArgs();
  const dataPath = String(window.NL_DATAPATH || "").trim();
  if (dataPath) {
    await Neutralino.filesystem
      .writeFile(
        `${dataPath}/${PENDING_HANDOFF_FILE}`,
        JSON.stringify({ link, timestamp: Date.now() }),
      )
      .catch(() => {});
  }
  await Neutralino.window.hide().catch(() => {});
  if (link) {
    await Neutralino.app
      .broadcast("weekbox:deep-link", { link })
      .catch(() => {});
  } else {
    await Neutralino.app.broadcast("weekbox:focus").catch(() => {});
  }
  await new Promise((resolve) => setTimeout(resolve, 250));
  await Neutralino.app.exit().catch(() => {});
}

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
      t("common.chooseFolder"),
      { defaultPath: FS.basePath },
    );
    if (selectedPath) {
      const existing = await FS.findExistingStorage(selectedPath);
      if (existing) {
        const existingChoice = await existingStorageModal.show({
          ...existing,
          weekboxPath: existing.weekboxPath,
        });
        if (existingChoice === "use") {
          await FS.useExistingStorage(existing.basePath);
          completed = true;
        } else if (existingChoice === "replace") {
          await FS.removeExistingStorage(existing.basePath);
          completed = await runStorageMoveWithFeedback(existing.basePath, true);
        }
      } else if (choice === "existing") {
        await storageMoveFeedback.showNotice({
          title: t("storage.libraryNotFoundTitle"),
          message: t("storage.libraryNotFoundMessage"),
        });
      } else if (await FS.hasStorageFolder(selectedPath)) {
        await storageMoveFeedback.showNotice({
          title: t("storage.destinationNotEmptyTitle"),
          message: t("storage.destinationNotEmpty"),
        });
      } else {
        const destination = FS.getStorageDestinationPath(selectedPath);
        const confirmed = await storageMoveFeedback.showMoveConfirmation({
          destination,
        });
        if (confirmed) {
          completed = await runStorageMoveWithFeedback(destination);
        }
      }
    }
  }
  if (completed) appSettings.set("firstRunStorageSetupComplete", true);
}

installGlobalErrorReporter();

async function runStorageMoveWithFeedback(
  destination,
  destinationIsResolved = false,
) {
  const resolvedDestination = destinationIsResolved
    ? destination
    : FS.getStorageDestinationPath(destination);
  storageMoveFeedback.show({
    destination: resolvedDestination,
    onCancel: () => FS.cancelStorageMove(),
  });
  try {
    await FS.moveStorageTo(
      resolvedDestination,
      (progress) => storageMoveFeedback.update(progress),
      { destinationIsResolved: true },
    );
    storageMoveFeedback.complete();
    return true;
  } catch (error) {
    if (error?.code === "STORAGE_MOVE_CANCELLED") {
      storageMoveFeedback.cancelled();
      return false;
    }
    storageMoveFeedback.fail(error?.message || t("storage.moveFailedMessage"));
    return false;
  }
}

async function resumeInterruptedStorageMove() {
  const pending = FS.getPendingStorageMove();
  if (!pending) return true;
  const resume = await storageMoveFeedback.showResumePrompt({
    source: pending.source,
    destination: pending.destination,
  });
  if (!resume) return false;
  return runStorageMoveWithFeedback(pending.destination, true);
}

async function recommendSaferStorageLocation() {
  if (!(await FS.shouldRecommendDefaultStorage())) return;
  const defaultPath = await FS.getDefaultStoragePath();
  const choice = await storageRecommendationModal.show({
    currentPath: FS.weekboxPath,
    defaultPath,
  });
  if (choice === "dismiss") {
    appSettings.set("storageMoveRecommendationDismissed", true);
    return;
  }
  if (choice !== "move") return;
  const existing = await FS.findExistingStorage(defaultPath);
  if (existing) {
    const existingChoice = await existingStorageModal.show({
      ...existing,
      weekboxPath: existing.weekboxPath,
    });
    if (existingChoice === "use") {
      await FS.useExistingStorage(existing.basePath);
      location.reload();
    } else if (existingChoice === "replace") {
      await FS.removeExistingStorage(existing.basePath);
      await runStorageMoveWithFeedback(existing.basePath, true);
    }
    return;
  }
  await runStorageMoveWithFeedback(defaultPath);
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
  startupLoader.setPhase(t("updates.updating"), 24);
  await appUpdater.install(update, (message, progress) => {
    startupLoader.setPhase(
      localizeProgressStatus(message) || t("updates.updating"),
      progress,
    );
  });
  return true;
}

function normalizeMessageBoxOptions(choice, icon) {
  const normalizedChoice = String(choice || "OK")
    .toUpperCase()
    .trim();
  const normalizedIcon = String(icon || "INFO")
    .toUpperCase()
    .trim();
  const choiceMap = {
    ACEPTAR: "OK",
    OK: "OK",
    SI: "YES_NO",
    YES: "YES_NO",
    CANCELAR: "OK_CANCEL",
    CANCEL: "OK_CANCEL",
    ERROR: "OK",
    INFO: "OK",
    WARNING: "OK",
    WARN: "OK",
    QUESTION: "YES_NO",
    "S\u00cd": "YES_NO",
  };
  const normalizedChoiceValue = choiceMap[normalizedChoice] || "OK";
  const iconChoices = ["ERROR", "INFO", "WARNING", "WARN", "QUESTION"];
  const normalizedMessageBoxIcon = iconChoices.includes(normalizedChoice)
    ? normalizedChoice === "WARN"
      ? "WARNING"
      : normalizedChoice
    : ["INFO", "WARN", "WARNING", "ERROR", "QUESTION"].includes(normalizedIcon)
      ? normalizedIcon
      : "INFO";
  return { choice: normalizedChoiceValue, icon: normalizedMessageBoxIcon };
}

function showMessageBoxFallback(title, content, choice) {
  if (typeof window === "undefined") return "OK";
  if (choice === "YES_NO" || choice === "OK_CANCEL") {
    const result = window.confirm(`${title ? `${title}\n\n` : ""}${content}`);
    if (choice === "YES_NO") return result ? "YES" : "NO";
    return result ? "OK" : "CANCEL";
  }
  window.alert(`${title ? `${title}\n\n` : ""}${content}`);
  return "OK";
}

function patchNeutralinoMessageBox() {
  if (typeof Neutralino === "undefined" || !Neutralino.os?.showMessageBox)
    return;
  if (Neutralino.os._origShowMessageBox) return;
  Neutralino.os._origShowMessageBox = Neutralino.os.showMessageBox;
  Neutralino.os.showMessageBox = async function (
    title,
    content,
    choice = "OK",
    icon = "INFO",
  ) {
    const normalized = normalizeMessageBoxOptions(choice, icon);

    try {
      return await Neutralino.os._origShowMessageBox.call(
        Neutralino.os,
        String(title ?? ""),
        String(content ?? ""),
        normalized.choice,
        normalized.icon,
      );
    } catch (err) {
      console.warn(
        "Neutralino.os.showMessageBox fallback to alert/confirm:",
        err,
      );
      return showMessageBoxFallback(title, content, normalized.choice);
    }
  };
}

function startBackgroundMaintenance() {
  if (FS.getPendingStorageMove()) return;
  void FS.runStartupMaintenance({
    onProgress: (message, progress) =>
      startupLoader.setPhase(message, progress),
  }).catch((error) =>
    console.warn("Background library maintenance failed", error),
  );
}

async function startApp() {
  let startupStep = "starting native services";
  try {
    startupLoader.setPhase(t("startup.startingServices"), 8);
    Neutralino.init();
    patchNeutralinoMessageBox();
    let deepLinkReady = false;
    let queuedDeepLink = null;
    let lastIncomingLink = null;
    let lastIncomingLinkAt = 0;
    let primaryInstance = false;
    let pendingHandoffCheck = false;
    const handleIncomingLink = (link) => {
      if (!parseWeekboxLink(link)) return;
      const now = Date.now();
      if (link === lastIncomingLink && now - lastIncomingLinkAt < 2000) return;
      lastIncomingLink = link;
      lastIncomingLinkAt = now;
      if (!deepLinkReady) {
        queuedDeepLink = link;
        return;
      }
      void focusWeekBoxWindow();
      void openWeekboxLink(link).catch((error) =>
        console.warn("Could not open the WeekBox link", error),
      );
    };
    await Neutralino.events.on("weekbox:deep-link", (event) => {
      const detail = event?.detail;
      handleIncomingLink(
        typeof detail === "string" ? detail : detail?.link || detail?.url,
      );
    });
    const checkPendingHandoff = async () => {
      if (!primaryInstance || pendingHandoffCheck) return;
      pendingHandoffCheck = true;
      let pendingHandoff = null;
      const dataPath = String(window.NL_DATAPATH || "").trim();
      try {
        if (dataPath) {
          const path = `${dataPath}/${PENDING_HANDOFF_FILE}`;
          const raw = await Neutralino.filesystem
            .readFile(path)
            .catch(() => "");
          if (raw) {
            await Neutralino.filesystem.remove(path).catch(() => {});
            pendingHandoff = JSON.parse(raw);
          }
        }
      } catch {}
      pendingHandoffCheck = false;
      const isFresh =
        pendingHandoff?.timestamp &&
        Date.now() - Number(pendingHandoff.timestamp) < 10000;
      if (isFresh && pendingHandoff.link) {
        handleIncomingLink(pendingHandoff.link);
      } else if (isFresh) {
        void focusWeekBoxWindow();
      }
    };
    await Neutralino.events.on(
      "weekbox:focus",
      () => void focusWeekBoxWindow(),
    );
    if (!(await ensureSingleInstance())) {
      await handoffToPrimaryInstance();
      return;
    }
    primaryInstance = true;
    setInterval(() => void checkPendingHandoff(), 250);
    void startupLoader.initVersion();
    networkStatus.init();
    await focusWeekBoxWindow({ center: true });
    disableProductionRefreshShortcuts();

    const handleAppExit = async () => {
      if (appExitStarted) return;
      appExitStarted = true;
      engineUpdateService.stopScheduledChecks();
      let timeoutHandle;
      try {
        await Promise.race([
          Promise.allSettled([
            downloadEngine.cleanupAll?.(),
            downloadMod.cleanupAll?.(),
            appSettings.writeQueue,
          ]),
          new Promise((resolve) => {
            timeoutHandle = setTimeout(resolve, 1500);
          }),
        ]);
      } catch {
      } finally {
        if (timeoutHandle) clearTimeout(timeoutHandle);
      }
      try {
        await Neutralino.app.exit();
      } catch {}
    };

    let allowAppExit = false;
    let appExitStarted = false;
    if (supportsSystemTray()) {
      Neutralino.events.on("trayMenuItemClicked", async (event) => {
        const id = event.detail?.id;
        if (id === "weekbox-show") {
          await focusWeekBoxWindow();
          return;
        }
        if (id === "weekbox-quit") {
          allowAppExit = true;
          await handleAppExit();
        }
      });
    }

    window.addEventListener("beforeunload", () => {
      engineUpdateService.stopScheduledChecks();
      downloadEngine.cleanupAll?.().catch(() => {});
      downloadMod.cleanupAll?.().catch(() => {});
    });

    Neutralino.events.on("windowClose", async () => {
      if (
        !allowAppExit &&
        supportsSystemTray() &&
        appSettings.get("closeToTray")
      ) {
        await Neutralino.window.hide();
        return;
      }
      await handleAppExit();
    });
    startupLoader.setPhase(t("startup.loadingPreferences"), 20);
    startupStep = "restoring preferences";
    startupStep = "finding the default storage location";
    const defaultStoragePath = await FS.getDefaultStoragePath();
    const defaultDataPath = defaultStoragePath;
    startupStep = "reading saved settings";
    const settingsDataPath = await appSettings.resolveDataPath(defaultDataPath);
    const hadSettings = await FS.api.exists(
      `${settingsDataPath}/settings.json`,
    );
    await appSettings.init(settingsDataPath);
    setTheme(getCachedTheme() ?? appSettings.get("darkMode"), {
      animate: false,
      hue: getCachedHue() ?? appSettings.get("accentHue"),
    });
    i18n.init();
    if (appSettings.get("checkAppUpdatesOnStartup")) {
      startupLoader.setPhase(t("startup.checkingAppUpdates"), 24);
      if (await handleStartupAppUpdate()) return;
    }
    syncWindowsStartupRegistration(appSettings.get("launchOnStartup")).catch(
      () => {},
    );
    await applySystemTray();
    if (!appSettings.get("firstRunLanguageSetupComplete")) {
      await firstRunLanguageModal.show();
    }
    syncWindowsProtocolRegistration(
      appSettings.get("registerProtocolLinks"),
    ).catch(() => {});
    startupLoader.setPhase(t("startup.openingLibrary"), 42);
    startupStep = "preparing the WeekBox library";
    await FS.init({ deferMaintenance: true });
    await appSettings.setDataPath(FS.dataPath);
    const cachedTheme = getCachedTheme();
    const cachedHue = getCachedHue();
    let repairedSettings = false;
    if (cachedTheme !== null && cachedTheme !== appSettings.get("darkMode")) {
      appSettings.set("darkMode", cachedTheme);
      repairedSettings = true;
    }
    if (cachedHue !== null && cachedHue !== appSettings.get("accentHue")) {
      appSettings.set("accentHue", cachedHue);
      repairedSettings = true;
    }
    if (repairedSettings) await appSettings.write();
    setTheme(cachedTheme ?? appSettings.get("darkMode"), {
      animate: false,
      hue: cachedHue ?? appSettings.get("accentHue"),
    });
    await resumeInterruptedStorageMove();
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
        setTimeout(
          () => reject(new Error("Loading navigation interface timed out")),
          8000,
        ),
      ),
    ]);
    startupLoader.setPhase(t("startup.preparingModManager"), 70);
    const modManagerReady = modManagerModal.preload();
    startupLoader.setPhase(t("startup.loadingHome"), 72);
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
    await startupLoader.complete();
    startBackgroundMaintenance();
    await openLaunchDeepLink().catch((error) =>
      console.warn("Could not open the WeekBox launch link", error),
    );
    deepLinkReady = true;
    if (queuedDeepLink) {
      const link = queuedDeepLink;
      queuedDeepLink = null;
      await focusWeekBoxWindow();
      await openWeekboxLink(link).catch((error) =>
        console.warn("Could not open the WeekBox link", error),
      );
    }
    await recommendSaferStorageLocation().catch((error) =>
      console.warn("Could not check the WeekBox storage recommendation", error),
    );
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
};
