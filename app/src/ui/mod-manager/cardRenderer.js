import { FS } from "../../utils/filesystem.js";
import { gameBananaApi } from "../../api/gamebanana.js";
import {
  ENGINE_DETAILS,
  getEngineLaunchBehavior,
} from "../../config/engines.js";
import { applyDominantColor } from "../../utils/extractColor.js";
import { engineUpdateToast } from "../engines/engineUpdateToast.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";
import { loadModCardImage } from "./modImageLoader.js";
import { modSettingsModal } from "./modSettingsModal.js";
import {
  replaceProcessExitListener,
  syncLaunchButton,
} from "./processUiSync.js";

export const cardRenderer = {
  async renderCards(
    gridContainer,
    modsToRender,
    allMods,
    standaloneMods,
    installedEngines,
    onModDeleted,
    onSettingsSaved,
  ) {
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const fragment = document.createDocumentFragment();

    const refreshLaunchButtons = () => {
      gridContainer
        .querySelectorAll(".mod-manager-launch-btn")
        .forEach((button) => {
          const isStandalone = button.dataset.launchKind === "standalone";
          const engine = isStandalone
            ? null
            : {
                id: button.dataset.engineId,
                version: button.dataset.engineVersion,
              };
          const state = FS.getModLaunchState(
            { id: button.dataset.modId },
            engine,
            isStandalone,
          );
          syncLaunchButton(button, state, modManagerTemplates);
        });
    };

    const refreshChangeButtons = () => {
      gridContainer.querySelectorAll(".mod-manager-card").forEach((card) => {
        const mod = allMods.find(
          (item) => String(item.id) === card.dataset.modId,
        );
        // Installation progress cards share the card class but do not have
        // mod actions (and are not part of allMods yet).
        if (!mod) return;
        const locked = FS.isModLockedForChanges(mod, allMods);
        const message = "Close the engine before changing this mod";
        const deleteBtn = card.querySelector(".mod-manager-delete-btn");
        const settingsBtn = card.querySelector(".mod-manager-settings-btn");
        const visibilityBtn = card.querySelector(".mod-manager-vis-btn");
        if (!deleteBtn || !settingsBtn || !visibilityBtn) return;
        deleteBtn.disabled = locked;
        deleteBtn.title = locked ? message : "Delete Mod";
        deleteBtn.setAttribute("aria-label", locked ? message : "Delete Mod");
        settingsBtn.disabled = false;
        settingsBtn.title = locked
          ? "Open mod settings (read-only while running)"
          : "Mod Settings";
        settingsBtn.setAttribute("aria-label", settingsBtn.title);
        visibilityBtn.disabled = locked;
        visibilityBtn.title = locked ? message : "Toggle Visibility";
      });
    };

    let removeProcessExitListener = () => {};
    const onProcessExit = () => {
      if (!gridContainer.isConnected) {
        removeProcessExitListener();
        return;
      }
      refreshLaunchButtons();
      refreshChangeButtons();
    };
    removeProcessExitListener = replaceProcessExitListener(
      gridContainer.parentElement,
      onProcessExit,
    );

    for (const mod of modsToRender) {
      const isExecutable = standaloneModIds.has(String(mod.id));

      const engine = isExecutable
        ? null
        : installedEngines.find(
            (item) =>
              item.id === mod.engineId &&
              (!mod.engineVersion || item.version === mod.engineVersion),
          );

      let engineBadgeHtml = modManagerTemplates.unassignedBadge();

      if (isExecutable) {
        // FIX: Si es ejecutable, se omite por completo la renderización del dropdown
        engineBadgeHtml = modManagerTemplates.executableBadge();
      } else if (mod.engineLocked) {
        const engineInfo = ENGINE_DETAILS.psychonline;
        engineBadgeHtml = modManagerTemplates.engineBadge(
          engineInfo.name,
          engineInfo.icon,
        );
      } else {
        const engineInfo = ENGINE_DETAILS[mod.engineId];
        if (engineInfo) {
          engineBadgeHtml = modManagerTemplates.engineBadge(
            engineInfo.name,
            engineInfo.icon,
          );
        }
      }

      const isHidden = mod.hidden;
      const isUnassigned = !isExecutable && !mod.engineId;
      const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";
      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.dataset.modId = String(mod.id);
      card.dataset.modSearch = String(mod.name || "").toLocaleLowerCase();
      card.classList.toggle("is-hidden", Boolean(mod.hidden));
      card.classList.toggle("is-unassigned", isUnassigned);
      if (mod.hidden) {
        card.style.opacity = "0.5";
      }

      const launchLabel =
        isExecutable ||
        getEngineLaunchBehavior(mod.engineId)?.scope === "exclusive-mod"
          ? "Launch Mod"
          : "Launch Engine";

      card.innerHTML = modManagerTemplates.cardContent(
        isExecutable ? "standalone" : "engine",
        mod.id,
        engine?.id || "",
        engine?.version || "",
        launchLabel,
        mod.name,
        mod.hidden,
        isUnassigned,
        eyeIcon,
        engineBadgeHtml,
      );
      card.classList.add("is-cover-loading");

      loadModCardImage({
        mod,
        card,
        fetchDetails: gameBananaApi.getModDetails.bind(gameBananaApi),
        applyDominantColor,
      });

      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      const launchBtn = card.querySelector(".mod-manager-launch-btn");
      launchBtn.addEventListener("click", async () => {
        launchBtn.disabled = true;
        try {
          if (
            FS.getModLaunchState(mod, engine, isExecutable) === "unavailable"
          ) {
            const engineInfo = ENGINE_DETAILS[mod.engineId];
            engineUpdateToast.missingEngine(
              mod.engineId,
              engineInfo?.name || "the assigned engine",
              engineInfo?.icon,
            );
            return;
          }
          await FS.toggleModLaunch(mod, engine, isExecutable, () => {
            refreshLaunchButtons();
            refreshChangeButtons();
          });
        } catch (error) {
          console.error(error);
        } finally {
          launchBtn.disabled = false;
          refreshLaunchButtons();
          refreshChangeButtons();
        }
      });

      deleteBtn.addEventListener("click", async () => {
        if (FS.isModLockedForChanges(mod, allMods)) return;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = modManagerTemplates.deleteSpinner();
        try {
          await FS.removeInstalledMod(mod.id);
          onModDeleted(mod.id);
          card.style.transform = "scale(0.8) translateY(10px)";
          card.style.opacity = "0";
          setTimeout(() => {
            card.remove();
            if (gridContainer.children.length === 0) {
              gridContainer.outerHTML = modManagerTemplates.emptyState(
                "No mods installed yet.",
              );
            }
          }, 300);
          document.dispatchEvent(new CustomEvent("mods-updated"));
        } catch (error) {
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = modManagerTemplates.deleteIcon();
        }
      });

      const settingsBtn = card.querySelector(".mod-manager-settings-btn");
      settingsBtn.addEventListener("click", async () => {
        if (settingsBtn.disabled) return;
        settingsBtn.disabled = true;
        settingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
          await modSettingsModal.open({
            mod,
            isExecutable,
            installedEngines,
            onSaved: onSettingsSaved,
            readOnly: FS.isModLockedForChanges(mod, allMods),
          });
        } finally {
          settingsBtn.disabled = false;
          settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
        }
      });

      const visBtn = card.querySelector(".mod-manager-vis-btn");
      visBtn.addEventListener("click", async () => {
        if (FS.isModLockedForChanges(mod, allMods)) return;
        visBtn.disabled = true;
        const isNowHidden = !mod.hidden;
        mod.hidden = isNowHidden;
        card.classList.toggle("is-hidden", isNowHidden);
        launchBtn.disabled = isNowHidden;
        card.style.opacity = isNowHidden ? "0.5" : "1";
        visBtn.querySelector("i").className = isNowHidden
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye";
        try {
          await FS.setModHidden(mod.id, isNowHidden);
          document.dispatchEvent(new CustomEvent("mods-updated"));
        } catch (error) {
          mod.hidden = !isNowHidden;
          card.classList.toggle("is-hidden", mod.hidden);
          launchBtn.disabled = mod.hidden;
          card.style.opacity = mod.hidden ? "0.5" : "1";
          visBtn.querySelector("i").className = mod.hidden
            ? "fa-solid fa-eye-slash"
            : "fa-solid fa-eye";
        } finally {
          visBtn.disabled = false;
        }
      });

      fragment.appendChild(card);
    }

    gridContainer.appendChild(fragment);
    refreshLaunchButtons();
    refreshChangeButtons();
  },
};
