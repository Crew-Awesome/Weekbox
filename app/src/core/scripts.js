import { storageBridge } from "./storagePatch.js";
import { router } from "./router.js";
import { registerHomeView } from "../ui/home/index.js";
import { registerEnginesView } from "../ui/engines/index.js";
import { downloadEngine } from "../ui/engines/downloadEngine.js";
import { disableProductionRefreshShortcuts } from "./productionShortcuts.js";
import { FS } from "../utils/filesystem.js";
import { appSettings } from "./settings.js";

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
    await FS.init();
    await storageBridge.init();
    registerHomeView();
    registerEnginesView();
    await router.init();
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