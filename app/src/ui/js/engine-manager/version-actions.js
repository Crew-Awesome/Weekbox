import { FS } from "../../../backend/services/filesystem/index.js";
import { appSettings } from "../../../backend/core/system/settings.service.js";
import {
  getEngineVersionName,
  setEngineVersionName,
} from "../../../backend/config/engine-preferences.js";
import { errorHandler } from "../errors/errorHandler.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { setButtonLoading } from "../hourglass.js";
import { i18n, t } from "../i18n/index.js";
export function configureEngineVersionActions({
  item,
  engineId,
  version,
  displayName,
  onProcessFinished,
}) {
  const launchBtn = item.querySelector(".engine-launch-btn");
  const updateLaunchButton = () => {
    const running = FS.isEngineRunning(engineId, version);
    if (!launchBtn) return;
    launchBtn.innerHTML = `<i class="fa-solid ${running ? "fa-stop" : "fa-play"}" aria-hidden="true"></i>`;
    launchBtn.title = t(running ? "common.close" : "engines.launch");
    launchBtn.setAttribute("aria-label", launchBtn.title);
  };
  updateLaunchButton();
  launchBtn?.addEventListener("click", async (event) => {
    event.stopPropagation();
    launchBtn.disabled = true;
    setButtonLoading(launchBtn);
    try {
      if (FS.isEngineRunning(engineId, version)) {
        await FS.closeEngine(engineId, version, updateLaunchButton);
      } else {
        await FS.injectModsIntoEngine(engineId, version);
        if (appSettings.get("hideOnLaunch")) Neutralino.window.hide();
        await FS.runEngine(engineId, version, (state) => {
          updateLaunchButton();
          if (state === "completed" || state === "error") {
            if (appSettings.get("hideOnLaunch")) {
              Neutralino.window.show();
              Neutralino.window.focus();
            }
            onProcessFinished();
          }
        });
      }
    } catch (error) {
      errorHandler.show({
        error,
        action: t("engines.launch"),
        item: displayName,
        version,
        storagePath: FS.weekboxPath,
      });
    } finally {
      launchBtn.disabled = false;
      updateLaunchButton();
    }
  });
}

export function openRenameInstalledVersion(engineId, version, onSaved) {
  const template = document.getElementById("tpl-engine-rename-modal");
  if (!template) return;
  const modal = template.content.firstElementChild.cloneNode(true);
  const dialog = modal.querySelector(".engine-rename-dialog");
  const input = modal.querySelector(".engine-rename-input");
  const currentName = getEngineVersionName(engineId, version, version);
  input.value = currentName;
  input.maxLength = 80;
  input.setAttribute("aria-label", t("engineManager.renameVersion"));
  document.body.appendChild(modal);
  i18n.apply(modal);
  let finished = false;
  const finish = (save) => {
    if (finished) return;
    finished = true;
    if (save) setEngineVersionName(engineId, version, input.value, version);
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 220);
    onSaved?.();
  };
  modal
    .querySelector(".engine-rename-cancel")
    .addEventListener("click", () => finish(false));
  modal
    .querySelector(".engine-rename-save")
    .addEventListener("click", () => finish(true));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) finish(false);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finish(true);
    } else if (event.key === "Escape") {
      event.preventDefault();
      finish(false);
    }
  });
  modal.hidden = false;
  requestAnimationFrame(() => {
    modal.classList.add("show");
    activateCheckoutDialog(modal, dialog, input, () => finish(false));
  });
}
