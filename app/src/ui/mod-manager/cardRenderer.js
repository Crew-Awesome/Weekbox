import { FS } from "../../utils/filesystem.js";
import { sanitizePathSegment } from "../../utils/filesystem/pathUtils.js";
import { gameBananaApi } from "../../api/gamebanana.js";
import {
  ENGINE_DETAILS,
  getEngineLaunchBehavior,
} from "../../config/engines.js";
import { applyDominantColor } from "../../utils/extractColor.js";
import { setupDropdown } from "../../utils/dropdown.js";
import { engineUpdateToast } from "../engines/engineUpdateToast.js";
import { getBase64FromUrl } from "../../utils/base64Transformer.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";
import { loadModCardImage } from "./modImageLoader.js";

export const cardRenderer = {
  async renderCards(
    gridContainer,
    modsToRender,
    allMods,
    standaloneMods,
    installedEngines,
    onModDeleted,
    onCompatibilitiesChanged,
  ) {
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const fragment = document.createDocumentFragment();

    const savePendingCompatibilities = async () => {
      const changes = [];
      gridContainer
        .querySelectorAll(".mod-manager-engine-compatibility-picker")
        .forEach((picker) => {
          if (
            picker.dataset.pendingEngineId !== picker.dataset.savedEngineId ||
            picker.dataset.pendingVersion !== picker.dataset.savedVersion
          ) {
            changes.push({
              modId: picker.dataset.modId,
              engineId: picker.dataset.pendingEngineId || null,
              engineVersion: picker.dataset.pendingVersion || null,
            });
          }
        });
      if (!changes.length) return;
      await Promise.all(
        changes.map(({ modId, engineId, engineVersion }) =>
          FS.setModEngineCompatibility(modId, engineId, engineVersion),
        ),
      );
      onCompatibilitiesChanged();
    };

    const refreshLaunchButtons = () => {
      gridContainer
        .querySelectorAll(".mod-manager-launch-btn")
        .forEach((button) => {
          if (button.disabled) return;
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
          const isRunning = state === "running";
          const canSwitchMod = state === "switch";
          button.classList.toggle("is-running", isRunning);
          button.classList.toggle("is-switchable", canSwitchMod);
          button.setAttribute(
            "aria-label",
            `${isRunning ? "Close" : canSwitchMod ? "Switch Mod" : button.dataset.launchLabel} ${button.dataset.modName}`,
          );
          button.innerHTML = isRunning
            ? modManagerTemplates.launchButtonRunning()
            : canSwitchMod
              ? modManagerTemplates.launchButtonSwitch()
              : modManagerTemplates.launchButtonDefault(
                  button.dataset.launchLabel,
                );
        });
    };

    // FIX: Extraer todos los motores compatibles de forma global, no solo los instalados.
    const engineOptions = Object.entries(ENGINE_DETAILS).map(([id, info]) => ({
      id,
      ...info,
    }));

    for (const mod of modsToRender) {
      let imageUrl =
        mod.imageBase64 || mod.image || "assets/icons/default-mod.png";

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
        engineBadgeHtml = `<div class="mod-manager-engine-badge mod-manager-engine-badge--engine"><img src="assets/icons/${engineInfo.icon}" alt=""/><span>${engineInfo.name}</span></div>`;
      } else {
        const engineInfo = ENGINE_DETAILS[mod.engineId];
        const versionOptions = [
          "Any version",
          ...installedEngines
            .filter((item) => item.id === mod.engineId)
            .map((item) => item.version),
        ];

        const selectedVersion = mod.engineVersion || "Any version";
        const selectedEngineName = engineInfo?.name || "Unassigned";
        const selectedEngineIcon = engineInfo?.icon;

        const engineOptionsHtml = [
          `<button type="button" data-engine-id="" class="${!mod.engineId ? "selected" : ""}">${modManagerTemplates.unassignedQuestionIcon()}Unassigned</button>`,
          ...engineOptions.map((opt) =>
            modManagerTemplates.engineOption(
              opt.id,
              opt.name,
              opt.icon,
              opt.id === mod.engineId,
            ),
          ),
        ].join("");

        const versionOptionsHtml = versionOptions
          .map((ver) =>
            modManagerTemplates.versionOption(ver, ver === selectedVersion),
          )
          .join("");

        engineBadgeHtml = modManagerTemplates.engineCompatibilityPicker(
          mod.id,
          mod.engineId || "",
          mod.engineVersion || "",
          selectedEngineIcon,
          selectedEngineName,
          engineOptionsHtml,
          selectedVersion,
          versionOptionsHtml,
        );
      }

      const isHidden = mod.hidden;
      const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";
      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.classList.toggle("is-hidden", Boolean(mod.hidden));
      if (mod.hidden) {
        card.style.opacity = "0.5";
      }

      const launchLabel =
        isExecutable ||
        getEngineLaunchBehavior(mod.engineId)?.scope === "exclusive-mod"
          ? "Launch Mod"
          : "Launch Engine";

      card.innerHTML = modManagerTemplates.cardContent(
        imageUrl,
        isExecutable ? "standalone" : "engine",
        mod.id,
        engine?.id || "",
        engine?.version || "",
        launchLabel,
        mod.name,
        mod.hidden,
        eyeIcon,
        engineBadgeHtml,
      );
      applyDominantColor(card.querySelector(".mod-manager-cover"), card);

      loadModCardImage({
        mod,
        card,
        fetchDetails: gameBananaApi.getModDetails.bind(gameBananaApi),
        getBase64FromUrl,
        applyDominantColor,
      });

      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      const launchBtn = card.querySelector(".mod-manager-launch-btn");
      const enginePill = card.querySelector(".mod-manager-engine-pill");
      const engineMenu = card.querySelector(".mod-manager-engine-menu");
      const versionPill = card.querySelector(".mod-manager-version-pill");
      const versionMenu = card.querySelector(".mod-manager-version-menu");
      const compatibilityPicker = card.querySelector(
        ".mod-manager-engine-compatibility-picker",
      );

      let engineDropdownCtrl, versionDropdownCtrl;
      if (enginePill && engineMenu) {
        engineDropdownCtrl = setupDropdown(
          enginePill,
          engineMenu.parentElement,
          {
            menuElement: engineMenu,
            onToggle: (isOpen) => {
              if (isOpen) versionDropdownCtrl?.close();
              card.classList.toggle("version-menu-open", isOpen);
            },
          },
        );
      }
      if (versionPill && versionMenu) {
        versionDropdownCtrl = setupDropdown(
          versionPill,
          versionMenu.parentElement,
          {
            menuElement: versionMenu,
            onToggle: (isOpen) => {
              if (isOpen) engineDropdownCtrl?.close();
              card.classList.toggle("version-menu-open", isOpen);
            },
          },
        );
      }

      engineMenu?.addEventListener("click", async (event) => {
        const option = event.target.closest("button[data-engine-id]");
        if (!option) return;
        event.stopPropagation();
        const engineId = option.dataset.engineId;
        compatibilityPicker.dataset.pendingEngineId = engineId;
        compatibilityPicker.dataset.pendingVersion = "";

        enginePill.querySelector("span").textContent =
          option.dataset.engineName || "Unassigned";
        enginePill.querySelector("img, .fa-question-circle")?.remove();
        enginePill.insertAdjacentHTML(
          "afterbegin",
          engineId
            ? `<img src="assets/icons/${option.dataset.engineIcon}" alt=""/>`
            : modManagerTemplates.unassignedQuestionIcon(),
        );

        versionPill.querySelector("span").textContent = "Any version";
        versionMenu.innerHTML = [
          modManagerTemplates.versionOption("Any version", true),
          ...installedEngines
            .filter((item) => item.id === engineId)
            .map((item) =>
              modManagerTemplates.versionOption(item.version, false),
            ),
        ].join("");

        engineMenu
          .querySelectorAll("button[data-engine-id]")
          .forEach((button) =>
            button.classList.toggle(
              "selected",
              button.dataset.engineId === engineId,
            ),
          );
        engineDropdownCtrl?.close();
        await savePendingCompatibilities();
      });

      versionMenu?.addEventListener("click", async (event) => {
        const option = event.target.closest("button[data-version]");
        if (!option) return;
        event.stopPropagation();
        const selectedVersion = option.dataset.version;
        compatibilityPicker.dataset.pendingVersion = selectedVersion;
        versionPill.querySelector("span").textContent =
          selectedVersion || "Any version";
        versionMenu
          .querySelectorAll("button[data-version]")
          .forEach((button) =>
            button.classList.toggle(
              "selected",
              button.dataset.version === selectedVersion,
            ),
          );
        versionDropdownCtrl?.close();
        await savePendingCompatibilities();
      });

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
          await FS.toggleModLaunch(
            mod,
            engine,
            isExecutable,
            refreshLaunchButtons,
          );
        } catch (error) {
          console.error(error);
        } finally {
          launchBtn.disabled = false;
          refreshLaunchButtons();
        }
      });

      deleteBtn.addEventListener("click", async () => {
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

      const dirBtn = card.querySelector(".mod-manager-dir-btn");
      dirBtn.addEventListener("click", async () => {
        try {
          const modPath = `${FS.modsPath}/${mod.folderName || sanitizePathSegment(mod.name)}`;
          await Neutralino.os.open(modPath);
        } catch (e) {}
      });

      const visBtn = card.querySelector(".mod-manager-vis-btn");
      visBtn.addEventListener("click", async () => {
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
  },
};
