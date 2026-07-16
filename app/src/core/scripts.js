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
};

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
    await FS.init();
    registerHomeView();
    registerEnginesView();
    await router.init();
    await openLaunchDeepLink();
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
